import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/trends',   icon: '📈', label: 'Trends'   },
  { to: '/alarms',   icon: '⏰', label: 'Alarms'   },
  { to: '/metrics',  icon: '⚙️', label: 'Settings'  },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors active:bg-gray-100 dark:active:bg-gray-800 ${
                isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-2xl leading-none">{icon}</span>
                <span className={`text-[11px] font-semibold ${isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
