import { useEffect, useRef, useState } from 'react'

function detectQuality() {
  if (typeof window === 'undefined') {
    return {
      low: false,
      mobile: false,
      dpr: [1, 1.25],
      stars: 280,
      molecules: 0,
      antialias: true,
      latticeStep: 0.28,
      ringSegs: 64,
      dnaCount: 24,
      dnaTubular: [80, 8],
      dnaSugars: true,
      cursorGlow: false,
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
    // Quiet hero: soft starfield only — no floating molecule swarm
    stars: low ? 120 : 280,
    molecules: 0,
    antialias: !low,
    latticeStep: low ? 0.34 : 0.28,
    ringSegs: low ? 40 : 64,
    dnaCount: low ? 14 : 24,
    dnaTubular: low ? [48, 6] : [80, 8],
    dnaSugars: !low,
    cursorGlow: false,
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
      if (!raf && running && visible && !document.hidden) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }, { rootMargin: '12% 0px' })
    io.observe(el)

    const onVis = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      } else if (visible) start()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      running = false
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
}
