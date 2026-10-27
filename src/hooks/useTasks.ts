import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Task, DayProgressSummary, TaskPriority, TaskHistoryEvent } from '../types/task';
import { TaskRepository } from '../database/taskRepository';
import {
  evaluateTaskStatus,
  reconcileAllTasks,
  completeTask,
  skipTask,
  rescheduleTask,
  computeDaySummary,
  generateUUID,
} from '../services/statusEngine';
import {
  scheduleRemindersForTask,
  cancelNotificationIds,
  requestNotificationPermissions,
} from '../services/notificationService';
import { getDayBoundaries } from '../utils/dateUtils';

export function useTasks(initialDate: Date = new Date()) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyModalTask, setHistoryModalTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEvent[]>([]);

  const isReconcilingRef = useRef<boolean>(false);

  // Load tasks for selected date
  const loadTasks = useCallback(async (date: Date = selectedDate) => {
    try {
      const { startOfDay, endOfDay } = getDayBoundaries(date);
      const dateTasks = await TaskRepository.getTasksForDateRange(startOfDay, endOfDay);
      setTasks(dateTasks);
    } catch (error) {
      console.warn('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Reconcile all tasks deterministically
  const reconcile = useCallback(async () => {
    if (isReconcilingRef.current) return;
    isReconcilingRef.current = true;

    try {
      const allTasks = await TaskRepository.getAllTasks();
      const now = new Date();
      const { updatedTasks, generatedEvents } = reconcileAllTasks(allTasks, now);

      if (generatedEvents.length > 0) {
        // Collect tasks that changed status
        const changedTasks = updatedTasks.filter((t) => {
          const original = allTasks.find((o) => o.id === t.id);
          return original && original.status !== t.status;
        });

        await TaskRepository.batchUpdateTaskStatuses(changedTasks, generatedEvents);
      }

      await loadTasks(selectedDate);
    } catch (error) {
      console.warn('Failed to reconcile task statuses:', error);
    } finally {
      isReconcilingRef.current = false;
    }
  }, [loadTasks, selectedDate]);

  // Reconcile on mount, foreground resume, and interval
  useEffect(() => {
    requestNotificationPermissions();

    reconcile();

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        reconcile();
      }
    });

    // Foreground periodic tick (every 30 seconds) to update active task visual state
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        reconcile();
      }
    }, 30000);

    return () => {
      appStateSub.remove();
      clearInterval(interval);
    };
  }, [reconcile]);

  // Reload when date changes
  useEffect(() => {
    loadTasks(selectedDate);
  }, [selectedDate, loadTasks]);

  // Actions
  const handleCreateTask = async (
    title: string,
    description: string | undefined,
    startTime: string,
    endTime: string,
    priority: TaskPriority = 'medium'
  ) => {
    const now = new Date();
    const newTask: Task = {
      id: generateUUID(),
      title: title.trim(),
      description: description?.trim() || undefined,
      startTime,
      endTime,
      status: 'upcoming',
      priority,
      createdAt: now.toISOString(),
      completedAt: null,
    };

    // Immediate status check against current time
    const evalResult = evaluateTaskStatus(newTask, now);
    const finalTask = evalResult.updatedTask;

    const reminders = await scheduleRemindersForTask(finalTask, now);

    const historyEvent: TaskHistoryEvent = {
      id: generateUUID(),
      taskId: finalTask.id,
      eventType: 'created',
      timestamp: now.toISOString(),
      newStartTime: startTime,
      newEndTime: endTime,
      note: 'Task scheduled',
    };

    await TaskRepository.createTask(finalTask, reminders, historyEvent);
    await loadTasks(selectedDate);
  };

  const handleComplete = async (task: Task) => {
    const now = new Date();
    const { updatedTask, historyEvent } = completeTask(task, now);

    const cancelledIds = await TaskRepository.completeTask(updatedTask, historyEvent);
    await cancelNotificationIds(cancelledIds);

    await loadTasks(selectedDate);
  };

  const handleSkip = async (task: Task, note?: string) => {
    const now = new Date();
    const { updatedTask, historyEvent } = skipTask(task, now, note);

    const cancelledIds = await TaskRepository.skipTask(updatedTask, historyEvent);
    await cancelNotificationIds(cancelledIds);

    await loadTasks(selectedDate);
  };

  const handleReschedule = async (
    task: Task,
    newStartTime: string,
    newEndTime: string,
    note?: string
  ) => {
    const now = new Date();
    const { updatedTask, historyEvent } = rescheduleTask(task, newStartTime, newEndTime, now, note);

    const newReminders = await scheduleRemindersForTask(updatedTask, now);

    const cancelledIds = await TaskRepository.rescheduleTask(
      updatedTask,
      newReminders,
      historyEvent
    );
    await cancelNotificationIds(cancelledIds);

    await loadTasks(selectedDate);
  };

  const handleDelete = async (taskId: string) => {
    const cancelledIds = await TaskRepository.deleteTask(taskId);
    await cancelNotificationIds(cancelledIds);
    await loadTasks(selectedDate);
  };

  const handleViewHistory = async (task: Task) => {
    const history = await TaskRepository.getTaskHistory(task.id);
    setTaskHistory(history);
    setHistoryModalTask(task);
  };

  const closeHistoryModal = () => {
    setHistoryModalTask(null);
    setTaskHistory([]);
  };

  const daySummary: DayProgressSummary = computeDaySummary(tasks);

  return {
    selectedDate,
    setSelectedDate,
    tasks,
    loading,
    daySummary,
    historyModalTask,
    taskHistory,
    reconcile,
    handleCreateTask,
    handleComplete,
    handleSkip,
    handleReschedule,
    handleDelete,
    handleViewHistory,
    closeHistoryModal,
  };
}
