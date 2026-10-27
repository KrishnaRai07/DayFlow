import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TaskPriority } from '../types/task';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    description: string | undefined,
    startTime: string,
    endTime: string,
    priority: TaskPriority
  ) => void;
  selectedDate: Date;
}

export const CreateTaskModal: React.FC<Props> = ({
  visible,
  onClose,
  onCreate,
  selectedDate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  // Quick preset offsets from current moment or selected date
  const [timePreset, setTimePreset] = useState<'now' | 'in15m' | 'nextHour'>('now');

  const computeTimes = () => {
    const base = new Date(selectedDate);
    const now = new Date();

    // If selected date is today, base from current time
    if (
      base.getFullYear() === now.getFullYear() &&
      base.getMonth() === now.getMonth() &&
      base.getDate() === now.getDate()
    ) {
      base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    } else {
      // Default to 9:00 AM on selected date
      base.setHours(9, 0, 0, 0);
    }

    const start = new Date(base);
    if (timePreset === 'in15m') {
      start.setMinutes(start.getMinutes() + 15);
    } else if (timePreset === 'nextHour') {
      start.setHours(start.getHours() + 1, 0, 0, 0);
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const { startTime, endTime } = computeTimes();
    onCreate(title, description, startTime, endTime, priority);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDurationMinutes(45);
    setTimePreset('now');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Schedule New Task</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            {/* Title */}
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Deep Work: Refactor status engine"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Key deliverables, context, or notes..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Time Preset */}
            <Text style={styles.label}>Start Time Preset</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetBtn, timePreset === 'now' && styles.presetBtnActive]}
                onPress={() => setTimePreset('now')}
              >
                <Text style={[styles.presetBtnText, timePreset === 'now' && styles.presetBtnTextActive]}>
                  Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, timePreset === 'in15m' && styles.presetBtnActive]}
                onPress={() => setTimePreset('in15m')}
              >
                <Text style={[styles.presetBtnText, timePreset === 'in15m' && styles.presetBtnTextActive]}>
                  +15 Mins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, timePreset === 'nextHour' && styles.presetBtnActive]}
                onPress={() => setTimePreset('nextHour')}
              >
                <Text style={[styles.presetBtnText, timePreset === 'nextHour' && styles.presetBtnTextActive]}>
                  Next Hour
                </Text>
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={styles.label}>Duration</Text>
            <View style={styles.presetRow}>
              {[15, 30, 45, 60, 90].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.presetBtn, durationMinutes === mins && styles.presetBtnActive]}
                  onPress={() => setDurationMinutes(mins)}
                >
                  <Text style={[styles.presetBtnText, durationMinutes === mins && styles.presetBtnTextActive]}>
                    {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority */}
            <Text style={styles.label}>Priority</Text>
            <View style={styles.presetRow}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, priority === p && styles.presetBtnActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.presetBtnText, priority === p && styles.presetBtnTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={styles.saveBtnText}>Schedule Task</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '600',
  },
  scrollArea: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  multilineInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  presetBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  presetBtnTextActive: {
    color: '#4F46E5',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    backgroundColor: '#A5B4FC',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
