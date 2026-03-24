import { useEffect, useState } from 'react'

/**
 * Toast – slides up from the bottom, auto-dismisses after `duration` ms.
 * Props: message (string), onClose (fn), duration (ms, default 4000)
 */
export default function Toast({ message, onClose, duration = 4000 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next frame
    const show = requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // wait for exit transition
    }, duration)
    return () => {
      cancelAnimationFrame(show)
      clearTimeout(hide)
    }
  }, [duration, onClose])

  return (
    <div
      className={`
        fixed bottom-28 left-1/2 -translate-x-1/2 z-[1000]
        px-5 py-3 rounded-2xl shadow-xl
        bg-gray-800 dark:bg-gray-700 text-white text-sm font-medium
        flex items-center gap-2 whitespace-nowrap
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      💤 {message}
    </div>
  )
}
