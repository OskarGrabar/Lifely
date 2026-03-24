import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/calendar', label: '📅 Calendar' },
  { to: '/trends',   label: '📈 Trends'   },
  { to: '/metrics',  label: '⚙️ Metrics'  },
]

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
        <span className="text-lg font-bold text-primary-700 tracking-tight">
          🏥 Health Tracker
        </span>
        <div className="flex gap-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
