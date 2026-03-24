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
        ├── services/api.js              Axios API client
        ├── components/
        │   ├── Layout/                  Navbar + Layout wrapper
        │   ├── Calendar/CalendarView    Monthly grid
        │   ├── Calendar/DayCell         Individual day cell with dots & emoji
        │   ├── DailyEntry/              Entry form with metric inputs
        │   ├── Metrics/MetricsManager   CRUD for custom metrics
        │   └── Charts/HealthTrendsChart Dual Y-axis line chart
        └── App.jsx                      Router setup
```
