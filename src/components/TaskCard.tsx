import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Task, TaskStatus } from '../types/task';
import { formatTime, formatDuration } from '../utils/dateUtils';

interface Props {
  task: Task;
  onComplete: (task: Task) => void;
  onSkip: (task: Task) => void;
  onReschedule: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewHistory: (task: Task) => void;
}

export const TaskCard: React.FC<Props> = ({
  task,
  onComplete,
  onSkip,
  onReschedule,
  onDelete,
  onViewHistory,
}) => {
  const isTerminal = task.status === 'completed' || task.status === 'skipped';
  const isMissed = task.status === 'missed';
  const isInProgress = task.status === 'in_progress';

  const durationStr = formatDuration(task.startTime, task.endTime);
  const timeRange = `${formatTime(task.startTime)} - ${formatTime(task.endTime)} (${durationStr})`;

  const renderBadge = (status: TaskStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <View style={[styles.badge, styles.badgeActive]}>
            <View style={styles.pulseDot} />
            <Text style={[styles.badgeText, styles.badgeActiveText]}>In Progress</Text>
          </View>
        );
      case 'upcoming':
        return (
          <View style={[styles.badge, styles.badgeUpcoming]}>
            <Text style={[styles.badgeText, styles.badgeUpcomingText]}>Upcoming</Text>
          </View>
        );
      case 'missed':
        return (
          <View style={[styles.badge, styles.badgeMissed]}>
            <Text style={[styles.badgeText, styles.badgeMissedText]}>Missed</Text>
          </View>
        );
      case 'completed':
        return (
          <View style={[styles.badge, styles.badgeCompleted]}>
            <Text style={[styles.badgeText, styles.badgeCompletedText]}>✓ Done</Text>
          </View>
        );
      case 'skipped':
        return (
          <View style={[styles.badge, styles.badgeSkipped]}>
            <Text style={[styles.badgeText, styles.badgeSkippedText]}>Skipped</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.card, isInProgress && styles.cardActive, isMissed && styles.cardMissed]}>
      {/* Top Header: Time range, Priority, and Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{timeRange}</Text>
        </View>
        <View style={styles.headerRight}>
          {renderBadge(task.status)}
        </View>
      </View>

      {/* Title & Description */}
      <View style={styles.contentSection}>
        <Text style={[styles.title, isTerminal && styles.titleMuted]}>{task.title}</Text>
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}
      </View>

      {/* Missed Task Messaging */}
      {isMissed && (
        <View style={styles.missedNotice}>
          <Text style={styles.missedNoticeText}>
            Scheduled block passed. Mark it done now to log late completion, or reschedule for later.
          </Text>
        </View>
      )}

      {/* Completed Info */}
      {task.status === 'completed' && task.completedAt && (
        <View style={styles.completedNotice}>
          <Text style={styles.completedNoticeText}>
            Completed at {formatTime(task.completedAt)}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {!isTerminal ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => onComplete(task)}
              activeOpacity={0.8}
            >
              <Text style={styles.completeBtnText}>
                {isMissed ? 'Complete Late' : 'Complete'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rescheduleBtn]}
              onPress={() => onReschedule(task)}
              activeOpacity={0.8}
            >
              <Text style={styles.rescheduleBtnText}>Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.skipBtn]}
              onPress={() => onSkip(task)}
              activeOpacity={0.8}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.terminalContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rescheduleBtn]}
              onPress={() => onReschedule(task)}
              activeOpacity={0.8}
            >
              <Text style={styles.rescheduleBtnText}>Re-run / Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.iconActions}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => onViewHistory(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.historyBtnText}>📜 History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(task.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardActive: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    backgroundColor: '#FAFCFF',
  },
  cardMissed: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFEFA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentSection: {
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  titleMuted: {
    color: '#64748B',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeUpcoming: {
    backgroundColor: '#EEF2FF',
  },
  badgeUpcomingText: {
    color: '#4F46E5',
  },
  badgeActive: {
    backgroundColor: '#EFF6FF',
  },
  badgeActiveText: {
    color: '#2563EB',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginRight: 5,
  },
  badgeMissed: {
    backgroundColor: '#FEF3C7',
  },
  badgeMissedText: {
    color: '#D97706',
  },
  badgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  badgeCompletedText: {
    color: '#059669',
  },
  badgeSkipped: {
    backgroundColor: '#F1F5F9',
  },
  badgeSkippedText: {
    color: '#64748B',
  },
  missedNotice: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  missedNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  completedNotice: {
    marginBottom: 10,
  },
  completedNoticeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  completeBtn: {
    backgroundColor: '#10B981',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rescheduleBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  rescheduleBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  skipBtn: {
    backgroundColor: '#F1F5F9',
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  terminalContainer: {
    flexDirection: 'row',
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  historyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyBtnText: {
    fontSize: 11,
    color: '#64748B',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
