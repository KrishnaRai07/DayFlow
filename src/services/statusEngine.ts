import { Task, TaskHistoryEvent, TaskStatus, DayProgressSummary, HistoryEventType } from '../types/task';

export interface TaskEvaluationResult {
  updatedTask: Task;
  hasChanged: boolean;
  historyEvent?: TaskHistoryEvent;
}

/**
 * Pure, deterministic evaluation of a task's status against a reference time.
 * Terminal statuses ('completed' and 'skipped') are immutable with respect to time.
 */
export function evaluateTaskStatus(task: Task, referenceTime: Date = new Date()): TaskEvaluationResult {
  // If task is completed or skipped, time progression does not change its status.
  if (task.status === 'completed' || task.status === 'skipped') {
    return {
      updatedTask: task,
      hasChanged: false,
    };
  }

  const now = referenceTime.getTime();
  const start = new Date(task.startTime).getTime();
  const end = new Date(task.endTime).getTime();

  let targetStatus: TaskStatus;
  let eventType: HistoryEventType | undefined;

  if (now < start) {
    targetStatus = 'upcoming';
  } else if (now >= start && now < end) {
    targetStatus = 'in_progress';
    if (task.status === 'upcoming') {
      eventType = 'started';
    }
  } else {
    // now >= end
    targetStatus = 'missed';
    if (task.status !== 'missed') {
      eventType = 'missed';
    }
  }

  const hasChanged = task.status !== targetStatus;
  const updatedTask: Task = hasChanged ? { ...task, status: targetStatus } : task;

  let historyEvent: TaskHistoryEvent | undefined;
  if (hasChanged && eventType) {
    historyEvent = {
      id: generateUUID(),
      taskId: task.id,
      eventType,
      timestamp: referenceTime.toISOString(),
      oldStartTime: task.startTime,
      oldEndTime: task.endTime,
      note: eventType === 'missed' ? 'Task became missed after scheduled end time' : 'Task auto-transitioned to in-progress',
    };
  }

  return {
    updatedTask,
    hasChanged,
    historyEvent,
  };
}

/**
 * Reconcile a list of tasks deterministically.
 * Only changed tasks will yield history events, guaranteeing idempotency.
 */
export function reconcileAllTasks(
  tasks: Task[],
  referenceTime: Date = new Date()
): { updatedTasks: Task[]; generatedEvents: TaskHistoryEvent[] } {
  const updatedTasks: Task[] = [];
  const generatedEvents: TaskHistoryEvent[] = [];

  for (const task of tasks) {
    const result = evaluateTaskStatus(task, referenceTime);
    updatedTasks.push(result.updatedTask);
    if (result.hasChanged && result.historyEvent) {
      generatedEvents.push(result.historyEvent);
    }
  }

  return { updatedTasks, generatedEvents };
}

/**
 * Marks a task as completed.
 * Preserves the original scheduled startTime and endTime, recording the exact completedAt time.
 * If completed after the scheduled endTime, logs 'completed_late'.
 */
export function completeTask(
  task: Task,
  completionTime: Date = new Date()
): { updatedTask: Task; historyEvent: TaskHistoryEvent } {
  const completionIso = completionTime.toISOString();
  const scheduledEnd = new Date(task.endTime).getTime();
  const isLate = completionTime.getTime() > scheduledEnd;
  const eventType: HistoryEventType = isLate ? 'completed_late' : 'completed';

  const updatedTask: Task = {
    ...task,
    status: 'completed',
    completedAt: completionIso,
  };

  const historyEvent: TaskHistoryEvent = {
    id: generateUUID(),
    taskId: task.id,
    eventType,
    timestamp: completionIso,
    oldStartTime: task.startTime,
    oldEndTime: task.endTime,
    note: isLate ? 'Completed after scheduled end time (late completion preserved)' : 'Completed on schedule',
  };

  return { updatedTask, historyEvent };
}

/**
 * Explicit skip action.
 * Distinct from 'missed'.
 */
export function skipTask(
  task: Task,
  skipTime: Date = new Date(),
  note?: string
): { updatedTask: Task; historyEvent: TaskHistoryEvent } {
  const skipIso = skipTime.toISOString();

  const updatedTask: Task = {
    ...task,
    status: 'skipped',
  };

  const historyEvent: TaskHistoryEvent = {
    id: generateUUID(),
    taskId: task.id,
    eventType: 'skipped',
    timestamp: skipIso,
    oldStartTime: task.startTime,
    oldEndTime: task.endTime,
    note: note || 'Explicitly skipped by user',
  };

  return { updatedTask, historyEvent };
}

/**
 * Reschedules a task to a new time window.
 * Preserves old schedule in the history event.
 * Re-evaluates status immediately based on the new start time.
 */
export function rescheduleTask(
  task: Task,
  newStartTime: string,
  newEndTime: string,
  rescheduleTime: Date = new Date(),
  note?: string
): { updatedTask: Task; historyEvent: TaskHistoryEvent } {
  const rescheduleIso = rescheduleTime.toISOString();
  const refMs = rescheduleTime.getTime();
  const newStartMs = new Date(newStartTime).getTime();
  const newEndMs = new Date(newEndTime).getTime();

  let newStatus: TaskStatus = 'upcoming';
  if (refMs >= newStartMs && refMs < newEndMs) {
    newStatus = 'in_progress';
  } else if (refMs >= newEndMs) {
    newStatus = 'missed';
  }

  const updatedTask: Task = {
    ...task,
    startTime: newStartTime,
    endTime: newEndTime,
    status: newStatus,
    completedAt: null, // Reset if was previously completed
  };

  const historyEvent: TaskHistoryEvent = {
    id: generateUUID(),
    taskId: task.id,
    eventType: 'rescheduled',
    timestamp: rescheduleIso,
    oldStartTime: task.startTime,
    oldEndTime: task.endTime,
    newStartTime,
    newEndTime,
    note: note || 'Rescheduled to new time window',
  };

  return { updatedTask, historyEvent };
}

/**
 * Computes the daily progress summary.
 */
export function computeDaySummary(tasks: Task[]): DayProgressSummary {
  const total = tasks.length;
  let completed = 0;
  let inProgress = 0;
  let upcoming = 0;
  let missed = 0;
  let skipped = 0;

  for (const t of tasks) {
    switch (t.status) {
      case 'completed':
        completed++;
        break;
      case 'in_progress':
        inProgress++;
        break;
      case 'upcoming':
        upcoming++;
        break;
      case 'missed':
        missed++;
        break;
      case 'skipped':
        skipped++;
        break;
    }
  }

  const completionRate = total > 0 ? completed / total : 0;

  return {
    total,
    completed,
    inProgress,
    upcoming,
    missed,
    skipped,
    completionRate,
  };
}

/**
 * UUID generator that works across React Native, Node, and browser
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
