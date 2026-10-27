import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Task } from '../types/task';
import { formatTime } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (task: Task, newStartTime: string, newEndTime: string, note?: string) => void;
}

export const RescheduleModal: React.FC<Props> = ({
  visible,
  task,
  onClose,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [selectedShift, setSelectedShift] = useState<number | 'tomorrow'>(1); // hours

  if (!task) return null;

  const originalStart = new Date(task.startTime);
  const originalEnd = new Date(task.endTime);
  const durationMs = originalEnd.getTime() - originalStart.getTime();

  const computeNewTimes = (shift: number | 'tomorrow') => {
    let newStart: Date;
    if (shift === 'tomorrow') {
      newStart = new Date(originalStart);
      newStart.setDate(newStart.getDate() + 1);
    } else {
      // Shift from now or from original start (if in future)
      const now = new Date();
      const base = originalStart > now ? originalStart : now;
      newStart = new Date(base.getTime() + shift * 60 * 60 * 1000);
    }
    const newEnd = new Date(newStart.getTime() + durationMs);
    return {
      newStartIso: newStart.toISOString(),
      newEndIso: newEnd.toISOString(),
      newStart,
      newEnd,
    };
  };

  const preview = computeNewTimes(selectedShift);

  const handleConfirm = () => {
    const { newStartIso, newEndIso } = computeNewTimes(selectedShift);
    onConfirm(task, newStartIso, newEndIso, note.trim() || undefined);
    setNote('');
    setSelectedShift(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Reschedule Task</Text>
          <Text style={styles.taskTitle}>"{task.title}"</Text>

          <Text style={styles.sectionLabel}>Choose New Schedule:</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[styles.presetBtn, selectedShift === 1 && styles.presetBtnActive]}
              onPress={() => setSelectedShift(1)}
            >
              <Text style={[styles.presetText, selectedShift === 1 && styles.presetTextActive]}>
                +1 Hour
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedShift === 2 && styles.presetBtnActive]}
              onPress={() => setSelectedShift(2)}
            >
              <Text style={[styles.presetText, selectedShift === 2 && styles.presetTextActive]}>
                +2 Hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedShift === 3 && styles.presetBtnActive]}
              onPress={() => setSelectedShift(3)}
            >
              <Text style={[styles.presetText, selectedShift === 3 && styles.presetTextActive]}>
                +3 Hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedShift === 'tomorrow' && styles.presetBtnActive]}
              onPress={() => setSelectedShift('tomorrow')}
            >
              <Text style={[styles.presetText, selectedShift === 'tomorrow' && styles.presetTextActive]}>
                Tomorrow
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>New Scheduled Window:</Text>
            <Text style={styles.previewValue}>
              {formatTime(preview.newStartIso)} - {formatTime(preview.newEndIso)}
            </Text>
          </View>

          {/* Optional Note */}
          <Text style={styles.sectionLabel}>Reason / Note (Optional):</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Prioritized urgent call, taking a walk..."
            placeholderTextColor="#94A3B8"
            value={note}
            onChangeText={setNote}
          />

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Save Reschedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskTitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  presetText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#4F46E5',
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
