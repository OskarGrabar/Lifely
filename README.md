# Health Tracker

Health Tracker is a hybrid mobile-first health journaling app with a React + Vite frontend, a retained Spring Boot backend, and Android alarm support through Capacitor.

The current product direction is local-first on the frontend: the live app stores its working data in device localStorage and uses Capacitor for Android alarm behavior. The backend is still present in the repository and exposes a REST API for metrics, daily entries, and day appearances.

## What the app does

Health Tracker combines several related workflows in one app:

- A calendar for daily health logging
- A multi-step daily check-in flow
- Custom health metrics and trend charts
- Medication-linked alarms with Android scheduling
- A goals and habits page separate from the main calendar
- Day appearance tagging with color and emoji cues

## Current product status

The repository contains both a backend and a frontend, but they are not currently used in the same way:

- The frontend is the active user experience.
- The frontend stores app data locally through `Frontend/src/services/localStore.js`.
- The backend still runs and exposes REST endpoints for metrics, daily entries, and day appearances.
- Alarm scheduling and ringing behavior are implemented for Android with a custom Capacitor plugin.

That distinction matters if you are extending the app: many frontend screens no longer depend on the Spring API even though the backend remains fully present in the repo.

## Main features

### Calendar and daily entry flow

- Monthly calendar grid with day cells and appearance indicators
- Dedicated daily entry form for per-day notes and metric values
- Day appearance customization for color, emoji, and labels
- Daily check-in call to action on the calendar with clear status states:
    not started, in progress, and submitted

### Daily check-in

The daily check-in is a dedicated multi-step flow rather than an inline modal.

Current check-in steps:

1. Overall day
2. Sleep
3. Food
4. Stress
5. Activity
6. Daily bean selection
7. Submission

The final bean-selection page lets users tag their day with selectable context items such as shopping, travel, anxiety, focused, brain fog, grateful, social, tired, and energetic.

The check-in data is persisted into daily entries using fields such as:

- `overallDay`
- `sleepToday`
- `foodToday`
- `stressToday`
- `activityToday`
- `dailyBeans`
- `dailyCheckInCompleted`

The flow also includes animated step transitions and bottom-positioned back navigation.

### Metrics and trends

- Custom metric creation and editing
- Supported metric types include numeric values, scales, and yes/no values
- Ability to mark metrics as calendar-only
- Health trend chart built with Recharts
- Range filters for 1 week, 2 weeks, 1 month, 3 months, and 6 months
- Trend summaries that incorporate daily check-in values and selected daily beans
- Medication tracker integrated into the health trends area

Default metrics are seeded automatically in local storage:

- Weight
- Pain
- Sleep

### Goals and habits

- Multiple goals stored as a list rather than a single current goal
- Swipeable goal carousel with wraparound behavior
- Drag-follow swipe interaction where adjacent goals are visible during the gesture
- Timed goals with optional target dates
- Completed goals stay visible and are marked as completed instead of being removed
- Separate habits tracker with per-day completion cells and streak calculation
- Completion celebrations and confetti effects for goals and habits

### Alarms and medication support

- Alarm creation, editing, enabling, disabling, and deletion
- Support for one-time alarms, daily alarms, and custom weekday schedules
- Medication attachment on alarms
- Alarm permission prompts coordinated from the app shell
- Full-screen dismissal overlay for firing alarms
- Snooze handling and firing-state restoration after relaunch
- Medication tracking mirrored into calendar-compatible metric entries so alarms and tracking stay aligned

On Android, alarm behavior is backed by a custom Capacitor plugin at:

- `Frontend/android/app/src/main/java/com/healthtracker/app/AlarmPlugin.java`

### Theme and app-level settings

- Light and dark theme support through a shared theme context
- Metrics management page also acts as a settings hub
- Full app data reset support through the local-first data layer

## Architecture overview

## Frontend

Stack:

- React 18
- Vite 5
- Tailwind CSS 3
- React Router 6
- Recharts
- date-fns
- Capacitor Android

Frontend routing is defined in `Frontend/src/App.jsx`:

- `/calendar`
- `/daily-check-in`
- `/goals-habits`
- `/metrics`
- `/trends`
- `/alarms`

The app shell in `Frontend/src/components/Layout/Layout.jsx` coordinates:

- route rendering
- alarm permission prompts
- ringing alarm restoration
- dismissal and snooze handling
- toast notifications
- the persistent bottom navigation

### Local-first data model

The active frontend data layer lives in `Frontend/src/services/localStore.js`.

It stores user-facing state under `ht_*` localStorage keys, including:

- metrics
- entries
- day appearances
- medication tracker data
- habits
- habit tracker data
- goals
- next id counters

This module also centralizes feature coordination logic, including:

- default metric seeding
- medication metric creation
- syncing medication tracker actions into daily entries
- cleanup of orphaned local data
- cross-feature delete behavior

The lightweight `Frontend/src/services/api.js` file currently re-exports the active local-store APIs so UI components can keep a stable import surface.

### Alarm implementation

Alarm behavior is split across several layers:

- `Frontend/src/services/nativeAlarms.js`
    JavaScript bridge around the native Capacitor plugin
- `Frontend/src/hooks/useAlarmScheduler.js`
    web fallback scheduler and notification logic for non-native use
- `Frontend/src/hooks/useAlarmFiring.js`
    persistent firing-state restoration for native alarm events
- `Frontend/android/app/src/main/java/com/healthtracker/app/AlarmPlugin.java`
    native Android plugin implementation

This allows the app to behave differently on web and Android while sharing the same React screens.

## Backend

Stack:

- Java 21
- Spring Boot 3.2.3
- Spring Web
- Spring Data JPA
- Spring Validation
- H2 file database
- Lombok

The backend exposes three main resource groups:

- Metrics
- Daily entries
- Day appearances

Configured CORS origins:

- `http://localhost:5173`
- `http://localhost:3000`

Persistence is configured with a file-backed H2 database, not an in-memory database, using:

- `jdbc:h2:file:./data/healthtracker;AUTO_SERVER=TRUE`

The H2 console is enabled at:

- `http://localhost:8080/h2-console`

## REST API

### Metrics

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/metrics` | List metrics |
| `GET` | `/api/metrics/{id}` | Get one metric |
| `POST` | `/api/metrics` | Create metric |
| `PUT` | `/api/metrics/{id}` | Update metric |
| `DELETE` | `/api/metrics/{id}` | Delete metric |

### Daily entries

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/entries?year=&month=` | Get entries for a month |
| `GET` | `/api/entries/{date}` | Get one entry by date |
| `PUT` | `/api/entries/{date}` | Create or update an entry |
| `DELETE` | `/api/entries/{date}` | Delete an entry |
| `GET` | `/api/entries/range?start=&end=` | Get entries in a date range |

### Day appearances

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/appearances?year=&month=` | Get appearances for a month |
| `GET` | `/api/appearances/{date}` | Get one day appearance |
| `PUT` | `/api/appearances/{date}` | Create or update appearance |
| `DELETE` | `/api/appearances/{date}` | Delete appearance |

## Repository structure

```text
Health-Tracker/
|-- README.md
|-- backend/
|   |-- pom.xml
|   `-- src/main/
|       |-- java/com/healthtracker/
|       |   |-- HealthTrackerApplication.java
|       |   |-- config/
|       |   |-- controller/
|       |   |-- dto/
|       |   |-- model/
|       |   |-- repository/
|       |   `-- service/
|       `-- resources/application.properties
|-- data/
`-- Frontend/
        |-- package.json
        |-- vite.config.js
        |-- capacitor.config.json
        |-- android/
        `-- src/
                |-- App.jsx
                |-- main.jsx
                |-- index.css
                |-- components/
                |   |-- Alarms/
                |   |-- Calendar/
                |   |-- Charts/
                |   |-- DailyEntry/
                |   |-- GoalsHabits/
                |   |-- Layout/
                |   |-- Metrics/
                |   `-- common/
                |-- context/
                |-- hooks/
                `-- services/
```

## Key files

### Frontend

- `Frontend/src/App.jsx`
    Route definitions for the main app pages
- `Frontend/src/components/Layout/Layout.jsx`
    App-wide coordinator for alarms, overlays, prompts, and shared layout
- `Frontend/src/components/Calendar/CalendarView.jsx`
    Monthly calendar and entry loading
- `Frontend/src/components/Calendar/DailyCheckInPage.jsx`
    Multi-step daily check-in flow
- `Frontend/src/components/DailyEntry/DailyEntryForm.jsx`
    Day-specific entry editing
- `Frontend/src/components/Charts/HealthTrendsChart.jsx`
    Trend charting and medication tracking UI
- `Frontend/src/components/Metrics/MetricsManager.jsx`
    Metric CRUD, theme handling, and app reset controls
- `Frontend/src/components/GoalsHabits/GoalsHabitsPage.jsx`
    Swipeable goals and weekly habits tracker
- `Frontend/src/components/Alarms/AlarmsPage.jsx`
    Alarm CRUD and medication attachment
- `Frontend/src/services/localStore.js`
    Source of truth for local frontend persistence
- `Frontend/src/services/nativeAlarms.js`
    JS bridge to native Android alarms

### Backend

- `backend/src/main/java/com/healthtracker/controller/MetricController.java`
- `backend/src/main/java/com/healthtracker/controller/DailyEntryController.java`
- `backend/src/main/java/com/healthtracker/controller/DayAppearanceController.java`
- `backend/src/main/java/com/healthtracker/config/CorsConfig.java`
- `backend/src/main/resources/application.properties`

## Getting started

## Prerequisites

- Java 21
- Maven 3.9+
- Node.js 18+
- npm

Optional for Android work:

- Android Studio
- Android SDK
- a connected device or emulator

## Run the backend

```bash
cd backend
mvn spring-boot:run
```

Backend URLs:

- API base: `http://localhost:8080`
- H2 console: `http://localhost:8080/h2-console`

Useful H2 connection details:

- JDBC URL: `jdbc:h2:file:./data/healthtracker`
- Username: `sa`
- Password: empty

## Run the frontend in the browser

```bash
cd Frontend
npm install
npm run dev
```

Vite runs on:

- `http://localhost:5173`

The Vite dev server proxies `/api` requests to the Spring backend on port 8080.

## Build the frontend

```bash
cd Frontend
npm run build
```

## Sync the Capacitor Android project

```bash
cd Frontend
npx cap sync android
```

If you want to open the native Android project:

```bash
cd Frontend
npx cap open android
```

## Current development workflow

For most frontend changes:

1. Start the Vite dev server from `Frontend`
2. Make UI or data-layer changes in `Frontend/src`
3. Run `npm run build` to verify production compilation
4. If the change affects native Android behavior, run `npx cap sync android`

For backend work:

1. Start Spring Boot from `backend`
2. Verify endpoints under `/api`
3. Use the H2 console when inspecting persisted backend data

## Notes for contributors

- The frontend currently uses local storage as the active persistence layer.
- Do not assume a frontend screen is backed by the Spring API unless you verify the service imports first.
- Alarm behavior is split between web fallback logic and native Android plugin logic.
- Medication-related data affects multiple features: alarms, medication tracker state, and calendar-compatible metric entries.
- Goals and habits are intentionally separate from the main calendar entry system.

## Known architectural split

This repository is in a hybrid state:

- The backend still models the original server-backed health tracker resources.
- The frontend has evolved into a richer local-first mobile app with alarms, medication flows, goals, habits, and daily check-ins that are centered in `localStore.js`.

That means a future cleanup path likely involves one of these directions:

1. reconnecting all frontend features to the backend, or
2. treating the backend as optional / legacy and continuing the app as a local-first mobile product

## License

No license file is currently included in this repository.
