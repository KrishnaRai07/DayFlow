import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DayProgressSummary } from '../types/task';

interface Props {
  summary: DayProgressSummary;
}

export const CoachingBanner: React.FC<Props> = ({ summary }) => {
  let title = 'Intentional Focus';
  let message = 'Plan your day with balanced, manageable milestones.';
  let bgStyle = styles.neutralBg;
  let textStyle = styles.neutralText;
  let icon = '🌱';

  if (summary.total === 0) {
    title = 'Clean Slate';
    message = 'No tasks scheduled yet. Set one or two realistic intentions for your day.';
    icon = '✨';
  } else if (summary.completed === summary.total && summary.total > 0) {
    title = 'All Done!';
    message = 'Fantastic job showing up for yourself. Take time to relax and recharge.';
    bgStyle = styles.successBg;
    textStyle = styles.successText;
    icon = '🎉';
  } else if (summary.missed > 0) {
    title = 'No Guilt, Just Reset';
    message = `${summary.missed} task${summary.missed > 1 ? 's' : ''} passed scheduled time. Life happens—feel free to complete late or reschedule.`;
    bgStyle = styles.warningBg;
    textStyle = styles.warningText;
    icon = '🤝';
  } else if (summary.inProgress > 0) {
    title = 'In Motion';
    message = 'You have an active block right now. Give yourself permission to single-task.';
    bgStyle = styles.activeBg;
    textStyle = styles.activeText;
    icon = '⚡';
  } else if (summary.completed > 0) {
    title = 'Steady Momentum';
    message = 'Every completed step builds quiet confidence. Keep going at your own pace.';
    bgStyle = styles.successBg;
    textStyle = styles.successText;
    icon = '👏';
  }

  return (
    <View style={[styles.container, bgStyle]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, textStyle]}>{title}</Text>
        <Text style={[styles.message, textStyle]}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
  },
  neutralBg: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  neutralText: {
    color: '#334155',
  },
  activeBg: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  activeText: {
    color: '#1E40AF',
  },
  warningBg: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  warningText: {
    color: '#92400E',
  },
  successBg: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  successText: {
    color: '#065F46',
  },
});
