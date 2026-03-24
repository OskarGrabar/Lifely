import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import CalendarView from './components/Calendar/CalendarView'
import MetricsManager from './components/Metrics/MetricsManager'
import HealthTrendsChart from './components/Charts/HealthTrendsChart'
import AlarmsPage from './components/Alarms/AlarmsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/calendar" replace />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="metrics" element={<MetricsManager />} />
          <Route path="trends" element={<HealthTrendsChart />} />
          <Route path="alarms" element={<AlarmsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
