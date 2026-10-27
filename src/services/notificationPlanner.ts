import { Task, ReminderTriggerType } from '../types/task';

export interface PlannedReminder {
  triggerType: ReminderTriggerType;
  scheduledFor: string; // ISO string
  title: string;
  body: string;
}

/**
 * Pure calculation of which reminders should be scheduled for a given task.
 * Avoids duplicate reminders for short tasks and filters out past times.
 */
export function planTaskReminders(task: Task, referenceTime: Date = new Date()): PlannedReminder[] {
  // If task is already completed or skipped, no reminders needed
  if (task.status === 'completed' || task.status === 'skipped') {
    return [];
  }

  const nowMs = referenceTime.getTime();
  const startMs = new Date(task.startTime).getTime();
  const endMs = new Date(task.endTime).getTime();
  const durationMs = endMs - startMs;

  const planned: PlannedReminder[] = [];

  // Minimum duration check: end must be after start
  if (durationMs <= 0) {
    return planned;
  }

  // 1. 15-Minute Pre-start Reminder
  // Criteria:
  // - Alarm must be in the future (at least 60 seconds from referenceTime)
  // - Task duration should be reasonable (at least 15 minutes), so short 5-minute micro-tasks don't barrage the user
  const fifteenBeforeMs = startMs - 15 * 60 * 1000;
  if (fifteenBeforeMs > nowMs + 60 * 1000 && durationMs >= 15 * 60 * 1000) {
    planned.push({
      triggerType: '15min_before',
      scheduledFor: new Date(fifteenBeforeMs).toISOString(),
      title: `Upcoming: ${task.title}`,
      body: `Starts in 15 minutes. Take a breath and get ready to ease into it.`,
    });
  }

  // 2. At Start Reminder
  // Only schedule if start time is in the future
  if (startMs > nowMs + 30 * 1000) {
    planned.push({
      triggerType: 'at_start',
      scheduledFor: new Date(startMs).toISOString(),
      title: `Time to Begin: ${task.title}`,
      body: `Your scheduled block starts now. Steady focus—you've got this!`,
    });
  }

  // 3. Overdue Reminder (associated with scheduled end time)
  // Triggers when the task becomes missed. Must be in the future and strictly after start.
  if (endMs > nowMs + 30 * 1000 && endMs > startMs) {
    planned.push({
      triggerType: 'overdue',
      scheduledFor: new Date(endMs).toISOString(),
      title: `Task Check-in: ${task.title}`,
      body: `Scheduled block ended. Ready to complete, or would you like to reschedule without guilt?`,
    });
  }

  return planned;
}
