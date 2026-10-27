import test from 'node:test';
import assert from 'node:assert/strict';
import { planTaskReminders } from '../src/services/notificationPlanner';
import { Task } from '../src/types/task';

const baseTask: Task = {
  id: 'task-notif-1',
  title: 'Team Strategy Session',
  startTime: '2026-10-27T10:00:00.000Z',
  endTime: '2026-10-27T11:00:00.000Z',
  status: 'upcoming',
  priority: 'high',
  createdAt: '2026-10-27T08:00:00.000Z',
  completedAt: null,
};

test('1. Normal upcoming task (1h duration, planned in advance): generates 3 balanced reminders', () => {
  // Planned at 09:00 AM for 10:00 AM - 11:00 AM
  const refTime = new Date('2026-10-27T09:00:00.000Z');
  const reminders = planTaskReminders(baseTask, refTime);

  assert.equal(reminders.length, 3);
  assert.equal(reminders[0].triggerType, '15min_before');
  assert.equal(reminders[0].scheduledFor, '2026-10-27T09:45:00.000Z');

  assert.equal(reminders[1].triggerType, 'at_start');
  assert.equal(reminders[1].scheduledFor, '2026-10-27T10:00:00.000Z');

  assert.equal(reminders[2].triggerType, 'overdue');
  assert.equal(reminders[2].scheduledFor, '2026-10-27T11:00:00.000Z');
});

test('2. Short task (< 15 mins duration): avoids duplicate 15min-before reminder', () => {
  // Task is only 10 minutes long: 10:00 - 10:10
  const shortTask: Task = {
    ...baseTask,
    endTime: '2026-10-27T10:10:00.000Z',
  };

  const refTime = new Date('2026-10-27T09:00:00.000Z');
  const reminders = planTaskReminders(shortTask, refTime);

  // Should omit '15min_before' to avoid crowding short micro-tasks
  const types = reminders.map((r) => r.triggerType);
  assert.equal(types.includes('15min_before'), false);
  assert.equal(types.includes('at_start'), true);
  assert.equal(types.includes('overdue'), true);
});

test('3. Task scheduled to start in less than 15 minutes: omits past 15min reminder', () => {
  // Current time is 09:50 AM, task starts at 10:00 AM
  const refTime = new Date('2026-10-27T09:50:00.000Z');
  const reminders = planTaskReminders(baseTask, refTime);

  // 15 minutes before was 09:45 AM (already in the past)
  const types = reminders.map((r) => r.triggerType);
  assert.equal(types.includes('15min_before'), false);
  assert.equal(types.includes('at_start'), true);
  assert.equal(types.includes('overdue'), true);
});

test('4. Task already in progress: only schedules future overdue reminder', () => {
  // Current time is 10:20 AM (during 10:00 - 11:00 block)
  const refTime = new Date('2026-10-27T10:20:00.000Z');
  const inProgressTask: Task = { ...baseTask, status: 'in_progress' };
  const reminders = planTaskReminders(inProgressTask, refTime);

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].triggerType, 'overdue');
  assert.equal(reminders[0].scheduledFor, '2026-10-27T11:00:00.000Z');
});

test('5. Terminal tasks (completed or skipped): returns no reminders', () => {
  const refTime = new Date('2026-10-27T09:00:00.000Z');

  const completedTask: Task = { ...baseTask, status: 'completed' };
  const skippedTask: Task = { ...baseTask, status: 'skipped' };

  assert.deepEqual(planTaskReminders(completedTask, refTime), []);
  assert.deepEqual(planTaskReminders(skippedTask, refTime), []);
});

test('6. Rescheduling task updates reminder timeline accurately', () => {
  // Shifted task to 14:00 - 15:00
  const rescheduledTask: Task = {
    ...baseTask,
    startTime: '2026-10-27T14:00:00.000Z',
    endTime: '2026-10-27T15:00:00.000Z',
  };

  const refTime = new Date('2026-10-27T11:00:00.000Z');
  const reminders = planTaskReminders(rescheduledTask, refTime);

  assert.equal(reminders.length, 3);
  assert.equal(reminders[0].scheduledFor, '2026-10-27T13:45:00.000Z');
  assert.equal(reminders[1].scheduledFor, '2026-10-27T14:00:00.000Z');
  assert.equal(reminders[2].scheduledFor, '2026-10-27T15:00:00.000Z');
});
