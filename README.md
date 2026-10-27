# 🌊 DayFlow (SeeYourSelf)

> **The Intentional Accountability Engine for High-Performers.**  
> Built with **React Native**, **Expo (SDK 58)**, **TypeScript**, and **local SQLite (`expo-sqlite`)**.

DayFlow is a local-first, privacy-focused daily scheduling and accountability application. Unlike traditional to-do lists that turn into guilt graveyards or rigid calendar blockers that break under real-world disruptions, DayFlow combines **hard time-boundary accountability** with a **balanced, psychological-safety coaching philosophy**.

---

## 🌟 Key Features

### 1. 🛡️ 100% Local-First & Zero Cloud Lock-In
- No user accounts, remote databases, or cloud tracking.
- Fast, ACID-compliant persistence using modern **`expo-sqlite`** with WAL (Write-Ahead Logging) mode, foreign key enforcement, and indexed queries.
- Zero server cost per user, delivering instant 0ms offline responsiveness.

### 2. ⏱️ Deterministic & Idempotent Status Engine
Task status transitions are calculated purely based on scheduled time boundaries:
- **`upcoming`**: Scheduled start time is in the future.
- **`in_progress`**: Current time is between `startTime` and `endTime` (triggers `started` audit event).
- **`missed`**: Current time has passed `endTime` without completion (triggers `missed` audit event).
- **`completed`**: Completed on or before `endTime` (records actual `completedAt` timestamp).
- **`completed_late`**: Completed after scheduled `endTime`. **Preserves original schedule intact** while giving full completion credit.
- **`skipped`**: Explicit user action, strictly separate from `missed`.
- **`rescheduled`**: Shifts to a new time window, preserves previous schedule in history, and resets status deterministically.
- **Idempotency**: Running status reconciliation 1 time or 100 times at the same moment yields 0 duplicate history events and 0 duplicate notification alerts.

### 3. 🤝 Balanced Coaching Style
- **No guilt or toxic streaks**: If a task ends without being marked done, DayFlow flags it with supportive, non-judgmental guidance ("Life happens—feel free to complete late or reschedule").
- **Dynamic Coaching Banner**: Analyzes daily progress and offers encouraging, context-aware prompts throughout the day.

### 4. 🔔 Smart 3-Tier Reminders (`expo-notifications`)
- **15 Minutes Before Start**: Mindful pre-focus prompt to ease into the block.
- **At Start**: Immediate launch notification.
- **Overdue Check-in**: Associated with the scheduled end time.
- **Short-Task Duplicate Avoidance**: Automatically suppresses 15-minute reminders for short micro-tasks (< 15 mins) and filters out past times.
- **Automatic Notification Reconciler**: When a task is completed, skipped, or rescheduled, obsolete pending OS notifications are automatically cancelled and replaced.

### 5. 📜 Chronological Accountability Log
- Every creation, auto-start, reschedule, skip, and completion event is logged in the `task_history` table.
- Accessible directly on each task card via the **📜 History** button.

### 6. 📊 Intuitive Daily Schedule Interface
- **Header Progress**: Day selector (Previous, Today, Next) with completion progress bar and counters (*Done*, *Active*, *Upcoming*, *Missed*, *Skipped*).
- **Task Timeline Cards**: Color-coded status badges, live activity pulse, duration indicators, and 1-tap action buttons.
- **Fast Modals**: Easy task scheduling presets (*Now*, *+15m*, *Next Hour*) and 1-tap reschedule options (*+1h*, *+2h*, *+3h*, *Tomorrow*).
- **Pull-to-Refresh**: Instant manual status reconciliation via `RefreshControl`.

---

## 🏗️ Architecture & Project Structure

```text
SeeYourSelf/
├── src/
│   ├── types/
│   │   └── task.ts                 # Domain models, types & status definitions
│   ├── database/
│   │   ├── db.ts                   # SQLite schema, WAL mode, tables & indexes
│   │   └── taskRepository.ts       # Atomic transactions, CRUD & history logging
│   ├── services/
│   │   ├── statusEngine.ts         # Pure, deterministic state machine & transitions
│   │   ├── notificationPlanner.ts  # Decoupled 3-tier reminder planning logic
│   │   └── notificationService.ts  # OS expo-notifications scheduling & cancellation
│   ├── hooks/
│   │   └── useTasks.ts             # AppState foreground resume hook & task store
│   ├── components/
│   │   ├── HeaderProgress.tsx      # Date navigation, progress bar & stat counters
│   │   ├── CoachingBanner.tsx      # Balanced coaching guidance banner
│   │   ├── TaskCard.tsx            # Task item, action buttons & status badges
│   │   ├── CreateTaskModal.tsx     # Fast task creation with presets & durations
│   │   ├── RescheduleModal.tsx     # 1-tap time-shift modal with reason capture
│   │   └── HistoryModal.tsx        # Chronological audit trail modal
│   └── utils/
│       └── dateUtils.ts            # Date boundary isolation & formatting helpers
├── tests/
│   ├── statusEngine.test.ts        # 13 pure unit tests covering time boundaries
│   └── notificationPlanning.test.ts# 6 tests for reminder planning & short task filtering
├── App.tsx                         # Main schedule screen
├── app.json                        # Expo plugins (expo-sqlite, expo-notifications)
├── tsconfig.json                   # Strict TypeScript configuration
├── package.json                    # Dependencies and npm scripts
├── DayFlow_Investor_Pitch_Deck.pptx# Editable 16:9 Investor Presentation
└── DayFlow_Investor_Pitch_Deck.pdf # Executive Landscape Presentation PDF
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher; tested on v24.21.0)
- [Expo Go](https://expo.dev/go) app installed on your physical iOS or Android device

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Start the Development Server
```bash
npx expo start
```
- **Android**: Open the **Expo Go** app and scan the QR code displayed in your terminal.
- **iOS**: Open the native **Camera** app, scan the terminal QR code, and tap to launch in Expo Go.
- **Web**: Press `w` in the terminal to view in your web browser.

---

## 🧪 Testing & Verification

The core scheduling engine and notification planner are decoupled from native device drivers, allowing **100% headless testing** using Node's test runner and `tsx`:

```bash
# Run all automated tests
npm test
```

### Test Coverage (19 / 19 Passing Tests):
- ✅ **Boundary times**: Before start, exactly at start, during window, exactly at end, and after end.
- ✅ **Completion modes**: Standard completion vs. Late completion (preserving original schedule).
- ✅ **Disciplinary actions**: Explicit skipping vs. Rescheduling (old schedule preserved in audit log).
- ✅ **Idempotency**: Repeated status reconciliation guarantees 0 duplicate events.
- ✅ **Calendar boundaries**: Crossing midnight and day/week boundary isolation.
- ✅ **Smart notifications**: 3-tier reminder generation, short-task (< 15 mins) duplicate avoidance, and terminal state cleanup.

### Diagnostic Commands:
```bash
# Verify TypeScript strict type-checking (0 errors)
npx tsc --noEmit

# Run Expo health check
npx expo-doctor
```

---

## 📱 Mobile Lifecyle & Known Constraints

1. **Background Execution**:
   - Mobile operating systems (iOS and Android) strictly restrict third-party apps from running background JavaScript loops.
   - **How DayFlow Solves This**: Local reminders are scheduled directly in the OS notification daemon (`expo-notifications`). When the user brings the app to the foreground, `useTasks` hooks into `AppState: active` to instantly reconcile all task statuses against current clock time.
2. **Notification Permissions**:
   - On iOS and Android 13+ (API 33+), OS banner notifications require user permission. DayFlow requests permission on launch. If denied, tasks will still transition correctly in SQLite, but OS banner alerts will be disabled.

---

## 💼 Investor Materials

Included in this repository are investor presentation assets for Seed/Pre-Seed meetings:
- 📊 **PowerPoint Presentation**: [`DayFlow_Investor_Pitch_Deck.pptx`](./DayFlow_Investor_Pitch_Deck.pptx)
- 📄 **Executive PDF Deck**: [`DayFlow_Investor_Pitch_Deck.pdf`](./DayFlow_Investor_Pitch_Deck.pdf)

---

## 📄 License
MIT License. Built with ❤️ for intentional, balanced daily execution.
#   D a y F l o w  
 