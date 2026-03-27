# 🏥 Health Tracker

A full-stack health calendar app — Spring Boot backend + React frontend.

---

## Features (MVP)

| Feature | Details |
|---|---|
| 📅 Calendar View | Monthly grid with color-coded days and emoji indicators |
| ✏️ Daily Entry Form | Dropdown to selectively add only the metrics you want per day |
| ⚙️ Metrics Management | Create custom metrics: `NUMBER`, `SCALE (slider)`, `YES/NO` |
| 📅 Calendar-Only Flag | Mark metrics to keep them off trend charts |
| 📈 Health Trends | Dual Y-axis line charts to compare metrics on different scales |
| 🎨 Day Appearance | Per-day background color, emoji, and short label |

---

## Tech Stack

```
backend/    →  Java 21 · Spring Boot 3 · Spring Data JPA · H2 (file-based)
Frontend/   →  React 18 · Vite · Tailwind CSS · Recharts · React Router
```

## Current Frontend Architecture

The current mobile app is local-first.

- UI state and feature data are stored in `Frontend/src/services/localStore.js` under `ht_*` localStorage keys.
- The backend still exists in the repo, but the active frontend features currently read and write local device storage instead of calling the Spring API.
- Alarms are handled by a Capacitor Android plugin bridge plus React state restoration logic so ringing alarms can recover even after the app is backgrounded or relaunched.
- Medication tracking is tied to alarms and also mirrored into calendar-compatible metric entries so the medication tracker and calendar data stay aligned.
- Goals and habits are intentionally separate from the main calendar entry system.

## Frontend Map

- `Frontend/src/services/localStore.js`: Single source of truth for metrics, calendar entries, appearances, alarms, medications, habits, goals, and reset behavior.
- `Frontend/src/services/nativeAlarms.js`: Thin JS wrapper around the custom Capacitor alarm plugin and Android scheduling rules.
- `Frontend/src/hooks/useAlarmFiring.js`: Restores and manages the currently firing alarm overlay state.
- `Frontend/src/components/Layout/Layout.jsx`: App shell, route container, permission prompts, snooze toast, and full-screen alarm dismissal overlay.
- `Frontend/src/components/Calendar/*`: Monthly calendar grid and day cells.
- `Frontend/src/components/DailyEntry/DailyEntryForm.jsx`: Daily entry editing and appearance selection.
- `Frontend/src/components/Charts/HealthTrendsChart.jsx`: Trend charts plus the weekly medication tracker.
- `Frontend/src/components/GoalsHabits/GoalsHabitsPage.jsx`: Current goal editor and separate habits tracker with streak logic.
- `Frontend/src/components/Alarms/*`: Alarm CRUD, medication attachment UI, time picker, and ringing overlay.
- `Frontend/src/components/Metrics/MetricsManager.jsx`: Settings, metric management, medication overview, theme choice, and full local reset.

---

## Running the Project

### 1 — Backend (Spring Boot)

**Prerequisites:** Java 21, Maven 3.9+

```bash
cd backend
mvn spring-boot:run
# API available at http://localhost:8080
# H2 console at  http://localhost:8080/h2-console  (JDBC URL: jdbc:h2:file:./data/healthtracker)
```

Data is persisted to `backend/data/healthtracker.mv.db`.

### 2 — Frontend (React + Vite)

**Prerequisites:** Node.js 18+

```bash
cd Frontend
npm install
npm run dev
# App available at http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `localhost:8080`.

---

## REST API

| Method | Path | Description |
|---|---|---|
| `GET`    | `/api/metrics`            | List all metrics |
| `POST`   | `/api/metrics`            | Create a metric |
| `PUT`    | `/api/metrics/{id}`       | Update a metric |
| `DELETE` | `/api/metrics/{id}`       | Delete a metric |
| `GET`    | `/api/entries?year=&month=` | Entries for a month |
| `GET`    | `/api/entries/{date}`     | Single day entry |
| `PUT`    | `/api/entries/{date}`     | Create / update entry |
| `DELETE` | `/api/entries/{date}`     | Delete entry |
| `GET`    | `/api/entries/range?start=&end=` | Range of entries (for charts) |
| `GET`    | `/api/appearances?year=&month=` | Day appearances for a month |
| `PUT`    | `/api/appearances/{date}` | Create / update appearance |
| `DELETE` | `/api/appearances/{date}` | Delete appearance |

---

## Project Structure

```
Health-Tracker/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/healthtracker/
│       ├── HealthTrackerApplication.java
│       ├── model/          Metric, DailyEntry, MetricValue, DayAppearance
│       ├── repository/     Spring Data JPA interfaces
│       ├── dto/            MetricDTO, DailyEntryDTO, DayAppearanceDTO
│       ├── service/        MetricService, DailyEntryService, DayAppearanceService
│       └── controller/     MetricController, DailyEntryController, DayAppearanceController
└── Frontend/
    └── src/
        ├── services/localStore.js       Local-first app data source
        ├── services/nativeAlarms.js     Capacitor alarm bridge
        ├── services/api.js              Re-exports active frontend APIs
        ├── components/
        │   ├── Layout/                  Navbar + Layout wrapper
        │   ├── Calendar/CalendarView    Monthly grid
        │   ├── Calendar/DayCell         Individual day cell with dots & emoji
        │   ├── DailyEntry/              Entry form with metric inputs
        │   ├── Metrics/MetricsManager   CRUD for custom metrics
        │   └── Charts/HealthTrendsChart Dual Y-axis line chart
        └── App.jsx                      Router setup
```
