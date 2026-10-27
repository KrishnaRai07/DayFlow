import { getDatabase } from './db';
import { Task, TaskHistoryEvent, TaskReminder, TaskStatus } from '../types/task';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  priority: string;
  created_at: string;
  completed_at: string | null;
}

interface HistoryRow {
  id: string;
  task_id: string;
  event_type: string;
  timestamp: string;
  old_start_time: string | null;
  old_end_time: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  note: string | null;
}

interface ReminderRow {
  id: string;
  task_id: string;
  notification_id: string;
  trigger_type: string;
  scheduled_for: string;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as TaskStatus,
    priority: row.priority as any,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapRowToHistory(row: HistoryRow): TaskHistoryEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    eventType: row.event_type as any,
    timestamp: row.timestamp,
    oldStartTime: row.old_start_time,
    oldEndTime: row.old_end_time,
    newStartTime: row.new_start_time,
    newEndTime: row.new_end_time,
    note: row.note || undefined,
  };
}

function mapRowToReminder(row: ReminderRow): TaskReminder {
  return {
    id: row.id,
    taskId: row.task_id,
    notificationId: row.notification_id,
    triggerType: row.trigger_type as any,
    scheduledFor: row.scheduled_for,
  };
}

export class TaskRepository {
  /**
   * Inserts a new task, its initial reminders, and creation history event atomically.
   */
  static async createTask(
    task: Task,
    reminders: TaskReminder[] = [],
    historyEvent?: TaskHistoryEvent
  ): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO tasks (id, title, description, start_time, end_time, status, priority, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.title,
          task.description ?? null,
          task.startTime,
          task.endTime,
          task.status,
          task.priority,
          task.createdAt,
          task.completedAt ?? null,
        ]
      );

      if (historyEvent) {
        await db.runAsync(
          `INSERT INTO task_history (id, task_id, event_type, timestamp, old_start_time, old_end_time, new_start_time, new_end_time, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            historyEvent.id,
            historyEvent.taskId,
            historyEvent.eventType,
            historyEvent.timestamp,
            historyEvent.oldStartTime ?? null,
            historyEvent.oldEndTime ?? null,
            historyEvent.newStartTime ?? null,
            historyEvent.newEndTime ?? null,
            historyEvent.note ?? null,
          ]
        );
      }

      for (const reminder of reminders) {
        await db.runAsync(
          `INSERT INTO task_reminders (id, task_id, notification_id, trigger_type, scheduled_for)
           VALUES (?, ?, ?, ?, ?)`,
          [
            reminder.id,
            reminder.taskId,
            reminder.notificationId,
            reminder.triggerType,
            reminder.scheduledFor,
          ]
        );
      }
    });
  }

  /**
   * Fetch all tasks that overlap with or belong to a specified ISO date range.
   */
  static async getTasksForDateRange(rangeStartIso: string, rangeEndIso: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks 
       WHERE (start_time >= ? AND start_time <= ?)
          OR (end_time >= ? AND end_time <= ?)
          OR (start_time <= ? AND end_time >= ?)
       ORDER BY start_time ASC`,
      [rangeStartIso, rangeEndIso, rangeStartIso, rangeEndIso, rangeStartIso, rangeEndIso]
    );
    return rows.map(mapRowToTask);
  }

  /**
   * Fetch all tasks (e.g. for complete status reconciliation).
   */
  static async getAllTasks(): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(`SELECT * FROM tasks ORDER BY start_time ASC`);
    return rows.map(mapRowToTask);
  }

  /**
   * Fetch a single task by ID.
   */
  static async getTaskById(taskId: string): Promise<Task | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TaskRow>(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    return row ? mapRowToTask(row) : null;
  }

  /**
   * Batch updates tasks that changed status during reconciliation, saving corresponding history events atomically.
   */
  static async batchUpdateTaskStatuses(
    tasks: Task[],
    events: TaskHistoryEvent[]
  ): Promise<void> {
    if (tasks.length === 0) return;
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      for (const task of tasks) {
        await db.runAsync(
          `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
          [task.status, task.completedAt ?? null, task.id]
        );
      }

      for (const ev of events) {
        await db.runAsync(
          `INSERT INTO task_history (id, task_id, event_type, timestamp, old_start_time, old_end_time, new_start_time, new_end_time, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ev.id,
            ev.taskId,
            ev.eventType,
            ev.timestamp,
            ev.oldStartTime ?? null,
            ev.oldEndTime ?? null,
            ev.newStartTime ?? null,
            ev.newEndTime ?? null,
            ev.note ?? null,
          ]
        );
      }
    });
  }

  /**
   * Mark a task completed or completed_late.
   */
  static async completeTask(task: Task, historyEvent: TaskHistoryEvent): Promise<string[]> {
    const db = await getDatabase();
    let cancelledNotificationIds: string[] = [];

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
        [task.status, task.completedAt ?? null, task.id]
      );

      await db.runAsync(
        `INSERT INTO task_history (id, task_id, event_type, timestamp, old_start_time, old_end_time, new_start_time, new_end_time, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyEvent.id,
          historyEvent.taskId,
          historyEvent.eventType,
          historyEvent.timestamp,
          historyEvent.oldStartTime ?? null,
          historyEvent.oldEndTime ?? null,
          historyEvent.newStartTime ?? null,
          historyEvent.newEndTime ?? null,
          historyEvent.note ?? null,
        ]
      );

      // Cancel and clear remaining pending reminders
      const reminders = await db.getAllAsync<ReminderRow>(
        `SELECT * FROM task_reminders WHERE task_id = ?`,
        [task.id]
      );
      cancelledNotificationIds = reminders.map((r) => r.notification_id);

      await db.runAsync(`DELETE FROM task_reminders WHERE task_id = ?`, [task.id]);
    });

    return cancelledNotificationIds;
  }

  /**
   * Mark a task skipped.
   */
  static async skipTask(task: Task, historyEvent: TaskHistoryEvent): Promise<string[]> {
    const db = await getDatabase();
    let cancelledNotificationIds: string[] = [];

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET status = ? WHERE id = ?`,
        [task.status, task.id]
      );

      await db.runAsync(
        `INSERT INTO task_history (id, task_id, event_type, timestamp, old_start_time, old_end_time, new_start_time, new_end_time, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyEvent.id,
          historyEvent.taskId,
          historyEvent.eventType,
          historyEvent.timestamp,
          historyEvent.oldStartTime ?? null,
          historyEvent.oldEndTime ?? null,
          historyEvent.newStartTime ?? null,
          historyEvent.newEndTime ?? null,
          historyEvent.note ?? null,
        ]
      );

      const reminders = await db.getAllAsync<ReminderRow>(
        `SELECT * FROM task_reminders WHERE task_id = ?`,
        [task.id]
      );
      cancelledNotificationIds = reminders.map((r) => r.notification_id);

      await db.runAsync(`DELETE FROM task_reminders WHERE task_id = ?`, [task.id]);
    });

    return cancelledNotificationIds;
  }

  /**
   * Reschedule a task to new times.
   * Removes old reminders, inserts new reminders, and saves reschedule history.
   */
  static async rescheduleTask(
    task: Task,
    newReminders: TaskReminder[],
    historyEvent: TaskHistoryEvent
  ): Promise<string[]> {
    const db = await getDatabase();
    let cancelledNotificationIds: string[] = [];

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET start_time = ?, end_time = ?, status = ?, completed_at = NULL WHERE id = ?`,
        [task.startTime, task.endTime, task.status, task.id]
      );

      await db.runAsync(
        `INSERT INTO task_history (id, task_id, event_type, timestamp, old_start_time, old_end_time, new_start_time, new_end_time, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyEvent.id,
          historyEvent.taskId,
          historyEvent.eventType,
          historyEvent.timestamp,
          historyEvent.oldStartTime ?? null,
          historyEvent.oldEndTime ?? null,
          historyEvent.newStartTime ?? null,
          historyEvent.newEndTime ?? null,
          historyEvent.note ?? null,
        ]
      );

      // Fetch old reminder IDs for OS cancellation
      const existing = await db.getAllAsync<ReminderRow>(
        `SELECT * FROM task_reminders WHERE task_id = ?`,
        [task.id]
      );
      cancelledNotificationIds = existing.map((r) => r.notification_id);

      await db.runAsync(`DELETE FROM task_reminders WHERE task_id = ?`, [task.id]);

      for (const r of newReminders) {
        await db.runAsync(
          `INSERT INTO task_reminders (id, task_id, notification_id, trigger_type, scheduled_for)
           VALUES (?, ?, ?, ?, ?)`,
          [r.id, r.taskId, r.notificationId, r.triggerType, r.scheduledFor]
        );
      }
    });

    return cancelledNotificationIds;
  }

  /**
   * Delete a task and its reminders/history completely.
   */
  static async deleteTask(taskId: string): Promise<string[]> {
    const db = await getDatabase();
    let cancelledNotificationIds: string[] = [];

    await db.withTransactionAsync(async () => {
      const existing = await db.getAllAsync<ReminderRow>(
        `SELECT * FROM task_reminders WHERE task_id = ?`,
        [taskId]
      );
      cancelledNotificationIds = existing.map((r) => r.notification_id);

      await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    });

    return cancelledNotificationIds;
  }

  /**
   * Fetch all history events for a task.
   */
  static async getTaskHistory(taskId: string): Promise<TaskHistoryEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HistoryRow>(
      `SELECT * FROM task_history WHERE task_id = ? ORDER BY timestamp ASC`,
      [taskId]
    );
    return rows.map(mapRowToHistory);
  }
}
