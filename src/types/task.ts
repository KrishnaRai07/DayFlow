export type TaskStatus = 'upcoming' | 'in_progress' | 'completed' | 'missed' | 'skipped';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string; // ISO string
  completedAt?: string | null; // ISO string when completed
}

export type HistoryEventType = 
  | 'created'
  | 'started'
  | 'completed'
  | 'completed_late'
  | 'missed'
  | 'skipped'
  | 'rescheduled';

export interface TaskHistoryEvent {
  id: string;
  taskId: string;
  eventType: HistoryEventType;
  timestamp: string; // ISO string
  oldStartTime?: string | null;
  oldEndTime?: string | null;
  newStartTime?: string | null;
  newEndTime?: string | null;
  note?: string;
}

export type ReminderTriggerType = '15min_before' | 'at_start' | 'overdue';

export interface TaskReminder {
  id: string;
  taskId: string;
  notificationId: string;
  triggerType: ReminderTriggerType;
  scheduledFor: string; // ISO string
}

export interface DayProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  missed: number;
  skipped: number;
  completionRate: number; // 0 to 1
}
