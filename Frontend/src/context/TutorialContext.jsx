import { createContext, useContext, useState } from 'react'

export const TUTORIAL_KEY = 'ht_tutorial_done'

const TutorialContext = createContext(null)

export function TutorialProvider({ children }) {
  const [active, setActive] = useState(() => !localStorage.getItem(TUTORIAL_KEY))
  const [step, setStep]     = useState(0)

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => Math.max(0, s - 1))

  const skip = () => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setActive(false)
  }

  const complete = () => {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setActive(false)
  }

  return (
    <TutorialContext.Provider value={{ active, step, next, back, skip, complete }}>
      {children}
    </TutorialContext.Provider>
  )
}

export const useTutorial = () => useContext(TutorialContext)
