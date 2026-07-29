import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

interface UseIdleTimeoutOptions {
  idleMs: number
  warningMs: number
  onTimeout: () => void
  enabled: boolean
}

export function useIdleTimeout({ idleMs, warningMs, onTimeout, enabled }: UseIdleTimeoutOptions) {
  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.round(warningMs / 1000))
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setWarningOpen(false)
    setSecondsLeft(Math.round(warningMs / 1000))
    if (!enabled) return

    warningTimer.current = setTimeout(() => {
      setWarningOpen(true)
      setSecondsLeft(Math.round(warningMs / 1000))
      countdownInterval.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1))
      }, 1000)
    }, idleMs - warningMs)

    logoutTimer.current = setTimeout(() => {
      clearTimers()
      onTimeout()
    }, idleMs)
  }, [clearTimers, enabled, idleMs, onTimeout, warningMs])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      setWarningOpen(false)
      return
    }

    reset()

    // Any activity — including while the warning dialog is showing — counts as "not idle" and restarts the cycle.
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset))
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset))
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { warningOpen, secondsLeft, stayLoggedIn: reset }
}
