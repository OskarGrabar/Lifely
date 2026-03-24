/**
 * Step-by-step permission prompt for alarm permissions.
 * Shows one card at a time for each missing permission.
 * For notifications: taps the inline Android dialog.
 * For exact alarms / full-screen intent: explains why, then opens Settings.
 */
export default function PermissionPrompt({ permission, onAction, onSkip }) {
  const configs = {
    notifications: {
      icon: '🔔',
      title: 'Allow Notifications',
      body: 'Health Tracker needs notification permission to ring your alarms.',
      action: 'Allow',
      skip: 'Skip',
    },
    exactAlarm: {
      icon: '⏰',
      title: 'Allow Exact Alarms',
      body: "To fire alarms at the exact time you set, tap \"Open Settings\", then enable \"Alarms & reminders\" for Health Tracker.",
      action: 'Open Settings',
      skip: 'Skip',
    },
    fullScreen: {
      icon: '📲',
      title: 'Allow Full-Screen Alerts',
      body: "To show the alarm on your lock screen, tap \"Open Settings\", then enable \"Display pop-up while Do Not Disturb\" for Health Tracker.",
      action: 'Open Settings',
      skip: 'Skip',
    },
  }

  const cfg = configs[permission]
  if (!cfg) return null

  return (
    <div className="fixed inset-0 z-[998] flex items-end justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="text-4xl text-center">{cfg.icon}</div>
        <h2 className="text-lg font-bold text-center text-gray-900 dark:text-white">
          {cfg.title}
        </h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-300 leading-relaxed">
          {cfg.body}
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium"
          >
            {cfg.skip}
          </button>
          <button
            onClick={onAction}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
          >
            {cfg.action}
          </button>
        </div>
      </div>
    </div>
  )
}
