import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTasks } from './src/hooks/useTasks';
import { HeaderProgress } from './src/components/HeaderProgress';
import { CoachingBanner } from './src/components/CoachingBanner';
import { TaskCard } from './src/components/TaskCard';
import { CreateTaskModal } from './src/components/CreateTaskModal';
import { RescheduleModal } from './src/components/RescheduleModal';
import { HistoryModal } from './src/components/HistoryModal';
import { Task } from './src/types/task';

export default function App() {
  const {
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
  } = useTasks();

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Task | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await reconcile();
    setRefreshing(false);
  };

  // Group or separate current/upcoming and completed/other
  const activeAndUpcoming = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'upcoming' || t.status === 'missed'
  );
  const resolvedTasks = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Main Top Bar */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.appTitle}>DayFlow</Text>
          <Text style={styles.appSubtitle}>Accountability & Schedule Foundation</Text>
        </View>
        <TouchableOpacity
          style={styles.newTaskButton}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.newTaskButtonText}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Progress & Date Header */}
      <HeaderProgress
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        summary={daySummary}
      />

      {/* Scrollable Schedule */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Balanced Coaching Banner */}
        <CoachingBanner summary={daySummary} />

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loaderText}>Loading schedule...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>Nothing Scheduled</Text>
            <Text style={styles.emptyText}>
              Keep your day balanced. Add your first task when you're ready to focus.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.emptyAddButtonText}>Schedule First Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active / Actionable Section */}
            {activeAndUpcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Tasks Requiring Attention</Text>
                {activeAndUpcoming.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onReschedule={(t) => setRescheduleTarget(t)}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </View>
            )}

            {/* Resolved Section */}
            {resolvedTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Completed & Skipped</Text>
                {resolvedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onReschedule={(t) => setRescheduleTarget(t)}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateTaskModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateTask}
        selectedDate={selectedDate}
      />

      <RescheduleModal
        visible={rescheduleTarget !== null}
        task={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleReschedule}
      />

      <HistoryModal
        visible={historyModalTask !== null}
        task={historyModalTask}
        history={taskHistory}
        onClose={closeHistoryModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  newTaskButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  newTaskButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 6,
    marginTop: 8,
  },
  loaderContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  loaderText: {
    color: '#64748B',
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
  },
});
