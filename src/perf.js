import { useEffect, useRef, useState } from 'react'

function detectQuality() {
  if (typeof window === 'undefined') {
    return {
      low: false,
      mobile: false,
      dpr: [1, 1.25],
      stars: 1600,
      molecules: 32,
      antialias: true,
      latticeStep: 0.22,
      ringSegs: 72,
      dnaCount: 28,
      dnaTubular: [96, 8],
      dnaSugars: true,
      cursorGlow: true,
    }
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 899px)').matches
  const saveData = Boolean(navigator.connection?.saveData)
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  const mobile = coarse || narrow
  const low = saveData || mobile || cores <= 4 || mem <= 4

  return {
    low,
    mobile,
    dpr: low ? [1, 1] : [1, 1.25],
    stars: low ? 720 : 1600,
    molecules: low ? 18 : 32,
    antialias: !low,
    latticeStep: low ? 0.3 : 0.22,
    ringSegs: low ? 48 : 72,
    dnaCount: low ? 16 : 28,
    dnaTubular: low ? [56, 6] : [96, 8],
    dnaSugars: !low,
    cursorGlow: !low,
  }
}

export const QUALITY = detectQuality()

export function useInView(ref, { rootMargin = '20% 0px', initial = false } = {}) {
  const [inView, setInView] = useState(initial)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
    }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])

  return inView
}

/** rAF that only runs while `ref` intersects the viewport and the tab is visible. */
export function useVisibleRaf(ref, callback) {
  const cb = useRef(callback)
  cb.current = callback

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    let visible = false
    let raf = 0
    let running = true

    const tick = () => {
      raf = 0
      if (!running || !visible || document.hidden) return
      cb.current()
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (!raf && running && visible && !document.hidden) {
        raf = requestAnimationFrame(tick)
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
      },
      { rootMargin: '12% 0px' },
    )
    io.observe(el)

    const onVis = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      } else {
        start()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ref])
}
