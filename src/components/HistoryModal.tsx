import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Task, TaskHistoryEvent } from '../types/task';
import { formatTime, formatDate } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  task: Task | null;
  history: TaskHistoryEvent[];
  onClose: () => void;
}

export const HistoryModal: React.FC<Props> = ({
  visible,
  task,
  history,
  onClose,
}) => {
  if (!task) return null;

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'created':
        return { label: 'Created', color: '#4F46E5', bg: '#EEF2FF' };
      case 'started':
        return { label: 'Started', color: '#2563EB', bg: '#EFF6FF' };
      case 'completed':
        return { label: 'Completed', color: '#059669', bg: '#D1FAE5' };
      case 'completed_late':
        return { label: 'Completed Late', color: '#059669', bg: '#ECFDF5' };
      case 'missed':
        return { label: 'Became Missed', color: '#D97706', bg: '#FEF3C7' };
      case 'skipped':
        return { label: 'Skipped', color: '#64748B', bg: '#F1F5F9' };
      case 'rescheduled':
        return { label: 'Rescheduled', color: '#7C3AED', bg: '#F5F3FF' };
      default:
        return { label: type, color: '#334155', bg: '#F1F5F9' };
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Task Accountability Log</Text>
              <Text style={styles.subtitle}>"{task.title}"</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline Events */}
          <ScrollView style={styles.scrollArea}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>No historical events logged yet.</Text>
            ) : (
              history.map((ev, index) => {
                const badge = getEventBadge(ev.eventType);
                const evDate = new Date(ev.timestamp);
                const timeString = `${formatDate(evDate)} at ${formatTime(ev.timestamp)}`;

                return (
                  <View key={ev.id || index} style={styles.timelineItem}>
                    {/* Left indicator line */}
                    <View style={styles.timelineIndicator}>
                      <View style={[styles.timelineDot, { backgroundColor: badge.color }]} />
                      {index < history.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    {/* Content */}
                    <View style={styles.eventContent}>
                      <View style={styles.eventHeader}>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text style={styles.eventTime}>{timeString}</Text>
                      </View>

                      {ev.eventType === 'rescheduled' && ev.oldStartTime && ev.newStartTime && (
                        <View style={styles.rescheduleDetails}>
                          <Text style={styles.scheduleChangeText}>
                            From: {formatTime(ev.oldStartTime)} – {formatTime(ev.oldEndTime || '')}
                          </Text>
                          <Text style={styles.scheduleChangeText}>
                            To: {formatTime(ev.newStartTime)} – {formatTime(ev.newEndTime || '')}
                          </Text>
                        </View>
                      )}

                      {ev.note ? <Text style={styles.noteText}>{ev.note}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
  },
  scrollArea: {
    paddingVertical: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 20,
    fontSize: 13,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  rescheduleDetails: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 6,
  },
  scheduleChangeText: {
    fontSize: 12,
    color: '#334155',
  },
  noteText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
  },
  doneBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
});
