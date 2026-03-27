import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/trends',   icon: '📈', label: 'Health'   },
  { to: '/goals-habits', icon: '🎯', label: 'Goals' },
  { to: '/alarms',   icon: '⏰', label: 'Alarms'   },
  { to: '/metrics',  icon: '⚙️', label: 'Settings'  },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 px-1.5 py-1.5">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="relative flex min-w-0 items-center justify-center"
          >
            {({ isActive }) => (
              <div
                className={`relative flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-3 transition-all duration-300 ease-out active:scale-95 ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span
                  className={`absolute inset-x-1 inset-y-1 rounded-2xl transition-all duration-300 ease-out ${
                    isActive
                      ? 'scale-100 bg-primary-50 dark:bg-primary-900/30 shadow-sm'
                      : 'scale-75 bg-transparent opacity-0'
                  }`}
                />
                <span className={`relative text-2xl leading-none transition-transform duration-300 ease-out ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</span>
                <span
                  className={`relative text-[11px] font-semibold transition-all duration-300 ease-out ${
                    isActive ? 'opacity-100' : 'opacity-85'
                  }`}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
