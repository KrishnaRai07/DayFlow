import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTaskStatus,
  reconcileAllTasks,
  completeTask,
  skipTask,
  rescheduleTask,
  computeDaySummary,
} from '../src/services/statusEngine';
import { Task } from '../src/types/task';
import { getDayBoundaries, addDays, isSameDay } from '../src/utils/dateUtils';

const createSampleTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-100',
  title: 'Morning Deep Work',
  description: 'Write specifications',
  startTime: '2026-10-27T09:00:00.000Z',
  endTime: '2026-10-27T10:00:00.000Z',
  status: 'upcoming',
  priority: 'high',
  createdAt: '2026-10-27T08:00:00.000Z',
  completedAt: null,
  ...overrides,
});

test('1. Before scheduled start time: status remains upcoming and unchanged', () => {
  const task = createSampleTask();
  const refTime = new Date('2026-10-27T08:59:59.000Z');
  const result = evaluateTaskStatus(task, refTime);

  assert.equal(result.hasChanged, false);
  assert.equal(result.updatedTask.status, 'upcoming');
  assert.equal(result.historyEvent, undefined);
});

test('2. Exactly at scheduled start time: transitions to in_progress with started event', () => {
  const task = createSampleTask();
  const refTime = new Date('2026-10-27T09:00:00.000Z');
  const result = evaluateTaskStatus(task, refTime);

  assert.equal(result.hasChanged, true);
  assert.equal(result.updatedTask.status, 'in_progress');
  assert.ok(result.historyEvent);
  assert.equal(result.historyEvent?.eventType, 'started');
  assert.equal(result.historyEvent?.taskId, task.id);
});

test('3. During scheduled window: remains in_progress without redundant events', () => {
  const task = createSampleTask({ status: 'in_progress' });
  const refTime = new Date('2026-10-27T09:30:00.000Z');
  const result = evaluateTaskStatus(task, refTime);

  assert.equal(result.hasChanged, false);
  assert.equal(result.updatedTask.status, 'in_progress');
  assert.equal(result.historyEvent, undefined);
});

test('4. Exactly at scheduled end time: transitions to missed if unfinished', () => {
  const task = createSampleTask({ status: 'in_progress' });
  const refTime = new Date('2026-10-27T10:00:00.000Z');
  const result = evaluateTaskStatus(task, refTime);

  assert.equal(result.hasChanged, true);
  assert.equal(result.updatedTask.status, 'missed');
  assert.ok(result.historyEvent);
  assert.equal(result.historyEvent?.eventType, 'missed');
});

test('5. After scheduled end time: transitions to missed if unfinished', () => {
  const task = createSampleTask({ status: 'upcoming' });
  const refTime = new Date('2026-10-27T10:30:00.000Z');
  const result = evaluateTaskStatus(task, refTime);

  assert.equal(result.hasChanged, true);
  assert.equal(result.updatedTask.status, 'missed');
  assert.equal(result.historyEvent?.eventType, 'missed');
});

test('6. Completion on schedule: records completed status and actual completion time', () => {
  const task = createSampleTask({ status: 'in_progress' });
  const completionTime = new Date('2026-10-27T09:45:00.000Z');
  const { updatedTask, historyEvent } = completeTask(task, completionTime);

  assert.equal(updatedTask.status, 'completed');
  assert.equal(updatedTask.completedAt, '2026-10-27T09:45:00.000Z');
  assert.equal(historyEvent.eventType, 'completed');
  assert.equal(historyEvent.oldStartTime, task.startTime);
  assert.equal(historyEvent.oldEndTime, task.endTime);
});

test('7. Late completion: records completed_late while preserving original scheduled times', () => {
  const task = createSampleTask({ status: 'missed' });
  const lateTime = new Date('2026-10-27T11:30:00.000Z'); // 1.5 hours after scheduled end
  const { updatedTask, historyEvent } = completeTask(task, lateTime);

  assert.equal(updatedTask.status, 'completed');
  assert.equal(updatedTask.completedAt, '2026-10-27T11:30:00.000Z');
  // Original schedule must remain intact
  assert.equal(updatedTask.startTime, '2026-10-27T09:00:00.000Z');
  assert.equal(updatedTask.endTime, '2026-10-27T10:00:00.000Z');
  assert.equal(historyEvent.eventType, 'completed_late');
});

test('8. Skipping: sets status to skipped, distinct from missed', () => {
  const task = createSampleTask({ status: 'in_progress' });
  const skipTime = new Date('2026-10-27T09:15:00.000Z');
  const { updatedTask, historyEvent } = skipTask(task, skipTime, 'Emergency call');

  assert.equal(updatedTask.status, 'skipped');
  assert.equal(historyEvent.eventType, 'skipped');
  assert.equal(historyEvent.note, 'Emergency call');
});

test('9. Rescheduling: preserves old schedule in history and re-evaluates status', () => {
  const task = createSampleTask({ status: 'missed' });
  const rescheduleTime = new Date('2026-10-27T11:00:00.000Z');
  const newStart = '2026-10-27T14:00:00.000Z';
  const newEnd = '2026-10-27T15:00:00.000Z';

  const { updatedTask, historyEvent } = rescheduleTask(
    task,
    newStart,
    newEnd,
    rescheduleTime,
    'Moved to afternoon'
  );

  assert.equal(updatedTask.status, 'upcoming');
  assert.equal(updatedTask.startTime, newStart);
  assert.equal(updatedTask.endTime, newEnd);
  assert.equal(updatedTask.completedAt, null);

  assert.equal(historyEvent.eventType, 'rescheduled');
  assert.equal(historyEvent.oldStartTime, '2026-10-27T09:00:00.000Z');
  assert.equal(historyEvent.oldEndTime, '2026-10-27T10:00:00.000Z');
  assert.equal(historyEvent.newStartTime, newStart);
  assert.equal(historyEvent.newEndTime, newEnd);
  assert.equal(historyEvent.note, 'Moved to afternoon');
});

test('10. Repeated status reconciliation (idempotency): running multiple times yields no duplicate events', () => {
  const tasks: Task[] = [
    createSampleTask({ id: 't1', status: 'upcoming' }),
    createSampleTask({
      id: 't2',
      startTime: '2026-10-27T07:00:00.000Z',
      endTime: '2026-10-27T08:00:00.000Z',
      status: 'upcoming',
    }),
  ];

  const evalTime = new Date('2026-10-27T09:30:00.000Z');

  // First reconciliation
  const pass1 = reconcileAllTasks(tasks, evalTime);
  assert.equal(pass1.updatedTasks[0].status, 'in_progress');
  assert.equal(pass1.updatedTasks[1].status, 'missed');
  assert.equal(pass1.generatedEvents.length, 2);

  // Second reconciliation with same state and time
  const pass2 = reconcileAllTasks(pass1.updatedTasks, evalTime);
  assert.equal(pass2.updatedTasks[0].status, 'in_progress');
  assert.equal(pass2.updatedTasks[1].status, 'missed');
  assert.equal(pass2.generatedEvents.length, 0); // 0 duplicate events!

  // Third reconciliation with same state and time
  const pass3 = reconcileAllTasks(pass2.updatedTasks, evalTime);
  assert.equal(pass3.generatedEvents.length, 0);
});

test('11. Terminal states are immutable with respect to time progression', () => {
  const completedTask = createSampleTask({
    status: 'completed',
    completedAt: '2026-10-27T09:30:00.000Z',
  });
  const skippedTask = createSampleTask({
    status: 'skipped',
  });

  const wayAfterEnd = new Date('2026-10-28T12:00:00.000Z');

  const res1 = evaluateTaskStatus(completedTask, wayAfterEnd);
  assert.equal(res1.updatedTask.status, 'completed');
  assert.equal(res1.hasChanged, false);

  const res2 = evaluateTaskStatus(skippedTask, wayAfterEnd);
  assert.equal(res2.updatedTask.status, 'skipped');
  assert.equal(res2.hasChanged, false);
});

test('12. Day and week boundaries: midnight crossing and day boundary functions', () => {
  // Midnight task: 11:30 PM to 01:00 AM next day
  const midnightTask = createSampleTask({
    startTime: '2026-10-27T23:30:00.000Z',
    endTime: '2026-10-28T01:00:00.000Z',
    status: 'upcoming',
  });

  // At 23:45 (day 1): in_progress
  const duringFirstDay = evaluateTaskStatus(midnightTask, new Date('2026-10-27T23:45:00.000Z'));
  assert.equal(duringFirstDay.updatedTask.status, 'in_progress');

  // At 00:30 (day 2): still in_progress across midnight
  const duringNextDay = evaluateTaskStatus(midnightTask, new Date('2026-10-28T00:30:00.000Z'));
  assert.equal(duringNextDay.updatedTask.status, 'in_progress');

  // At 01:05 (day 2): becomes missed
  const afterMidnightEnd = evaluateTaskStatus(midnightTask, new Date('2026-10-28T01:05:00.000Z'));
  assert.equal(afterMidnightEnd.updatedTask.status, 'missed');

  // Date boundary calculations
  const baseDate = new Date('2026-10-27T12:00:00.000Z');
  const nextWeek = addDays(baseDate, 7);
  assert.equal(isSameDay(baseDate, nextWeek), false);

  const boundaries = getDayBoundaries(baseDate);
  const startD = new Date(boundaries.startOfDay);
  const endD = new Date(boundaries.endOfDay);
  assert.equal(startD.getHours(), 0);
  assert.equal(endD.getHours(), 23);
  assert.equal(endD.getMinutes(), 59);
});

test('13. Daily progress summary accurately computes counts and rates', () => {
  const taskList: Task[] = [
    createSampleTask({ id: '1', status: 'completed' }),
    createSampleTask({ id: '2', status: 'completed' }),
    createSampleTask({ id: '3', status: 'in_progress' }),
    createSampleTask({ id: '4', status: 'upcoming' }),
    createSampleTask({ id: '5', status: 'missed' }),
    createSampleTask({ id: '6', status: 'skipped' }),
  ];

  const summary = computeDaySummary(taskList);
  assert.equal(summary.total, 6);
  assert.equal(summary.completed, 2);
  assert.equal(summary.inProgress, 1);
  assert.equal(summary.upcoming, 1);
  assert.equal(summary.missed, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(Math.round(summary.completionRate * 100), 33);
});
