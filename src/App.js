import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

/**
 * Aagami SEQ — nanopore sequencing scroll hero.
 * HeroSphere threads downward through a flat membrane nanopore as you scroll.
 * Brand reveals once the sphere passes through and emerges on the other side.
 */

// ── scratch vectors (reused, never leaked between frames) ──────────────────
const cameraTarget = new THREE.Vector3()
const lookAtTarget = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _fogA = new THREE.Color('#12383c')
const _fogB = new THREE.Color('#164850')
const _fogC = new THREE.Color('#143e3c')
const _fogNow = new THREE.Color()
const _cursorDir = new THREE.Vector3()
const _heroColor = new THREE.Color()
const _heroEmissive = new THREE.Color()
const HERO_COLOR = new THREE.Color('#2f5c58')
const HERO_COLOR_PULSE = new THREE.Color('#3a6e68')
const HERO_EMISSIVE = new THREE.Color('#143430')
const HERO_EMISSIVE_PULSE = new THREE.Color('#1e4a44')
const PORE_RADIUS = 0.72
const MEMBRANE_Y = 0.0

/** Soft round sprite for PointsMaterial (default points are square) */
function makeDiscTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Extra-soft radial glow for the Q blast (no hard sphere edge) */
function makeGlowTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  // Very soft falloff — no visible disc rim
  g.addColorStop(0, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.08, 'rgba(255,255,255,0.28)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.1)')
  g.addColorStop(0.38, 'rgba(255,255,255,0.035)')
  g.addColorStop(0.58, 'rgba(255,255,255,0.012)')
  g.addColorStop(0.78, 'rgba(255,255,255,0.003)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ── palette — desaturated clinical / graphite ─────────────────────────────
const C = {
  steel: '#5a6a72',
  slate: '#3e4c54',
  bone: '#a8b2ac',
  teal: '#2f5c58',
  deepTeal: '#1e3e3c',
  ice: '#6e8490',
  mutedBlue: '#3a5470',
  graphite: '#2e3438',
  moss: '#4a5640',
  copper: '#6e5648',
  ghost: '#7a8c90',
}
const BOND_DARK = '#2e383c'
const BOND_MID = '#4a565c'

// ── helpers ────────────────────────────────────────────────────────────────
const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max)
const smooth = (a, b, v) => {
  const n = clamp((v - a) / (b - a))
  return n * n * (3 - 2 * n)
}
// Gentler ease — flatter at the start/end for long fades
const smoother = (a, b, v) => {
  const n = clamp((v - a) / (b - a))
  return n * n * n * (n * (n * 6 - 15) + 10)
}
const lerp = THREE.MathUtils.lerp

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function bondQuat(dir) {
  _dir.set(dir[0], dir[1], dir[2]).normalize()
  return _quat.setFromUnitVectors(_up, _dir).clone()
}

// ── scroll timeline ────────────────────────────────────────────────────────
// idle → descend → pore → thread → dive off-screen → reenter BR → settle in Q
const BEATS = {
  focusStart: 0.04,
  focusEnd: 0.26,
  poreInStart: 0.08,
  poreInEnd: 0.36,
  transitStart: 0.34,
  transitEnd: 0.54,
  diveStart: 0.5,
  diveEnd: 0.7,
  // Fade nanopore once hero is below and membrane sits at frame top
  clearStart: 0.48,
  clearEnd: 0.62,
  poreOutStart: 0.48,
  poreOutEnd: 0.62,
  // Title only after lattice is gone
  brandRevealStart: 0.7,
  brandRevealEnd: 0.8,
  reenterStart: 0.72,
  reenterEnd: 0.88,
  brandStart: 0.82,
  brandEnd: 0.93,
  // Blast only after hero has fully arrived at the Q
  dissolveStart: 0.945,
  dissolveEnd: 1.0,
  // Manifesto visible (dim) from the start; fill on scroll; out by the drop
  manifestoFillStart: 0.04,
  manifestoFillEnd: 0.44,
  manifestoOutStart: 0.46,
  manifestoOutEnd: 0.54,
}

const MANIFESTO_LINES = [
  'Detecting molecular signatures',
  'with sub-nanometer precision.',
  'A paradigm shift in early-stage oncology.',
]
const MANIFESTO = MANIFESTO_LINES.join(' ')

const progressApi = { current: 0, target: 0 }
// Live hero sphere pose — molecules bounce off this instead of clipping through
const heroApi = { x: 0, y: 7.35, z: -1.35, r: 0.34 }

// ── field molecule blueprints (background) ─────────────────────────────────
const STRUCTURES = [
  { kind: 'mono', core: C.steel, coreR: 0.34, tips: [] },
  { kind: 'di', core: C.slate, coreR: 0.22, tips: [{ pos: [0.55, 0.05, 0], color: C.ice, r: 0.2 }] },
  {
    kind: 'tri',
    core: C.teal,
    coreR: 0.2,
    tips: [
      { pos: [0.48, 0.28, 0.1], color: C.bone, r: 0.16 },
      { pos: [-0.42, 0.22, -0.12], color: C.mutedBlue, r: 0.15 },
    ],
  },
  {
    kind: 'tetra',
    core: C.deepTeal,
    coreR: 0.18,
    tips: [
      { pos: [0.42, 0.35, 0.15], color: C.moss, r: 0.14 },
      { pos: [-0.4, 0.28, 0.2], color: C.ice, r: 0.13 },
      { pos: [0.05, -0.42, 0.22], color: C.copper, r: 0.15 },
      { pos: [0.1, 0.08, -0.48], color: C.steel, r: 0.14 },
    ],
  },
  {
    kind: 'ring',
    core: C.ghost,
    coreR: 0.12,
    tips: [
      { pos: [0.45, 0, 0], color: C.ice, r: 0.11 },
      { pos: [0.22, 0, 0.39], color: C.ghost, r: 0.11 },
      { pos: [-0.22, 0, 0.39], color: C.steel, r: 0.11 },
      { pos: [-0.45, 0, 0], color: C.ghost, r: 0.11 },
      { pos: [-0.22, 0, -0.39], color: C.ice, r: 0.11 },
      { pos: [0.22, 0, -0.39], color: C.slate, r: 0.11 },
    ],
  },
]

const MAT_PRESETS = [
  { metalness: 0.5, roughness: 0.38, opacity: 1, emissiveIntensity: 0.1 },
  { metalness: 0.1, roughness: 0.58, opacity: 1, emissiveIntensity: 0.06 },
  { metalness: 0.25, roughness: 0.28, opacity: 0.55, emissiveIntensity: 0.12 },
  { metalness: 0.68, roughness: 0.22, opacity: 0.94, emissiveIntensity: 0.14 },
  { metalness: 0.04, roughness: 0.72, opacity: 0.42, emissiveIntensity: 0.16 },
]

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [ui, setUi] = useState({ brand: 0, blast: 0, manifesto: 0, fill: 0 })

  useEffect(() => {
    const onScroll = () => {
      const shell = document.querySelector('.experience-shell')
      const total = shell
        ? Math.max(1, shell.offsetHeight - window.innerHeight)
        : Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      // Complete the full nanopore → AAGAMISEQ animation before the end hold.
      // Ecosystem only begins after the shell (incl. hold) is fully scrolled past.
      const hold = Math.min(total * 0.22, window.innerHeight * 1.25)
      const animScroll = Math.max(1, total - hold)
      progressApi.target = clamp(window.scrollY / animScroll)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    let raf = 0
    let lastKey = -1
    const tick = () => {
      progressApi.current = lerp(progressApi.current, progressApi.target, 0.065)
      const p = progressApi.current
      const clear = smooth(BEATS.clearStart, BEATS.clearEnd, p)
      const poreOut = smooth(BEATS.poreOutStart, BEATS.poreOutEnd, p)
      const reveal = smooth(BEATS.brandRevealStart, BEATS.brandRevealEnd, p)
      // Never show title while field/nanopore lattice is still up
      const brand = reveal * clear * poreOut
      const dissolve = smooth(BEATS.dissolveStart, BEATS.dissolveEnd, p)
      // CSS Q glow is residual only — late, after the hero blast has peaked
      const blast = dissolve > 0.55 ? clamp((dissolve - 0.55) / 0.45) * 0.85 : 0
      const manifestoOut = smooth(BEATS.manifestoOutStart, BEATS.manifestoOutEnd, p)
      const manifesto = 1 - manifestoOut
      const fill = smooth(BEATS.manifestoFillStart, BEATS.manifestoFillEnd, p)
      const key =
        Math.round(brand * 100) * 1e6 +
        Math.round(blast * 100) * 1e4 +
        Math.round(manifesto * 100) * 100 +
        Math.round(fill * 2000)
      if (key !== lastKey) {
        lastKey = key
        setUi({ brand, blast: brand > 0.5 ? blast : 0, manifesto, fill })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <main>
      <SiteNav />

      <div className="experience-shell">
        <div className="gradient-wash" aria-hidden />
        <div className="shade-vignette" aria-hidden />
        <div className="grain-coarse" aria-hidden />
        <div className="grain-overlay" aria-hidden />

        <div className="canvas-stage">
          <div className="canvas-grain" aria-hidden />
          <Canvas
            frameloop="never"
            dpr={[1, 1.5]}
            camera={{ position: [0.3, 3.2, 11.5], fov: 36, near: 0.1, far: 90 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
            onCreated={({ gl, scene, camera }) => {
              gl.setClearColor(new THREE.Color('#12383c'), 1)
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 0.98
              window.__aagami = { gl, scene, camera }
            }}>
            <color attach="background" args={['#12383c']} />
            <Atmosphere />
            <ambientLight intensity={0.45} color="#6a9088" />
            <directionalLight position={[5, 9, 4]} intensity={1.1} color="#c8ddd4" />
            <directionalLight position={[-4, 1, -3]} intensity={0.4} color="#3a6870" />
            <pointLight position={[0, 2, 5]} intensity={0.45} color="#4a8a80" distance={28} />
            <CursorGlow />

            <CameraRig />
            <FrameLoopGuard />
            <Starfield />
            <FieldMolecules />
            <HeroSphere />
            <Nanopore />
          </Canvas>

          <ManifestoFill fill={ui.fill} opacity={ui.manifesto} />

          <div className="brand-reveal" style={{ opacity: ui.brand }}>
            <div className="brand-name">
              AAGAMI
              <span>
                SE
                <span className="brand-q">
                  Q
                  <i
                    className="brand-q-glow"
                    style={{
                      opacity: ui.blast * 0.7,
                      transform: `translate(-50%, -50%) scale(${0.85 + ui.blast * 0.4})`,
                    }}
                    aria-hidden
                  />
                  <i className="brand-q-dot" style={{ opacity: ui.blast }} aria-hidden />
                </span>
              </span>
            </div>
            <p className="brand-tagline">Nanopore Diagnostics</p>
          </div>
        </div>
        <div className="scroll-space" aria-hidden />
        <div className="experience-end-hold" aria-hidden />
      </div>

      <EcosystemSection />
    </main>
  )
}

function ManifestoFill({ fill, opacity }) {
  const lines = useMemo(() => {
    let offset = 0
    return MANIFESTO_LINES.map((line) => {
      const start = offset
      offset += line.length + 1 // +1 for the joining space in MANIFESTO
      return { line, start }
    })
  }, [])
  if (opacity < 0.02) return null

  const n = MANIFESTO.length
  return (
    <p className="manifesto-fill" style={{ opacity }} aria-label={MANIFESTO}>
      {lines.map(({ line, start }, li) => (
        <span key={li} className="manifesto-line">
          {Array.from(line).map((ch, ci) => {
            const i = start + ci
            if (ch === ' ') {
              return (
                <span key={`s-${i}`} className="manifesto-space" aria-hidden>
                  {' '}
                </span>
              )
            }
            const local = clamp(fill * n - i)
            return (
              <span
                key={`c-${i}`}
                className="manifesto-char"
                style={{ '--char-fill': local }}
                aria-hidden>
                {ch}
              </span>
            )
          })}
        </span>
      ))}
    </p>
  )
}

const ECOSYSTEM_ITEMS = [
  {
    kicker: 'The Engine of Discovery',
    title: 'Core Readout Device',
    body: 'Ultra-low-noise sensing hardware for high-precision current measurement and consistent signal readout from nanopore chips.',
    points: ['Pico-ampere sensitivity', 'Multi-channel I/O', 'Compact benchtop form factor'],
    cta: 'Coming Soon',
    ctaActive: false,
  },
  {
    kicker: 'Custom-Engineered Precision',
    title: 'Solid-State Nanopore Chips',
    body: 'Silicon-nitride membranes with atomically precise pores, tuned to specific biomarker sizes for reliable, high-fidelity sensing.',
    points: ['Custom pore diameters', 'High durability', 'Sub-nanometer precision'],
    cta: 'Contact Sales',
    ctaActive: true,
  },
  {
    kicker: 'Intelligent Signal Processing',
    title: 'AI Analysis Software',
    body: 'A cloud-native suite using deep learning to classify molecular signatures and identify cancer markers with real-time analysis.',
    points: ['Real-time functionality', 'Automated anomaly detection', 'Clinical reporting dashboard'],
    cta: 'Coming Soon',
    ctaActive: false,
  },
  {
    kicker: 'Standardized Workflow',
    title: 'Consumables & Kits',
    body: 'Ready-to-use sample prep kits and buffer solutions, optimized for high signal-to-noise and consistent, repeatable assay workflows.',
    points: ['Fast sample prep', 'High stability reagents', 'Lot-to-lot consistency'],
    cta: 'Coming Soon',
    ctaActive: false,
  },
]

function EcosystemSection() {
  const sectionRef = useRef(null)
  const [opens, setOpens] = useState(() => ECOSYSTEM_ITEMS.map(() => 0))

  useEffect(() => {
    let raf = 0
    let running = true
    const update = () => {
      if (!running) return
      const el = sectionRef.current
      if (el) {
        const vh = window.innerHeight
        const start = el.offsetTop
        const span = Math.max(1, el.offsetHeight - vh)
        // Reveal columns across the pinned ecosystem scroll
        const revealT = clamp((window.scrollY - start) / span)
        const slot = 1 / ECOSYSTEM_ITEMS.length
        const next = ECOSYSTEM_ITEMS.map((_, i) => {
          const a = 0.08 + i * slot * 0.9
          return smoother(a, a + slot * 0.55, revealT)
        })
        setOpens((prev) => prev.map((v, i) => lerp(v, next[i], 0.3)))
      }
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="ecosystem" className="ecosystem" ref={sectionRef}>
      <div className="ecosystem-track">
        <div className="ecosystem-sheet">
          <div className="ecosystem-intro">
            <p className="ecosystem-eyebrow">Our Ecosystem</p>
            <h2 className="ecosystem-heading">
              We provide a complete, integrated solution for single-molecule sensing, from the physical sensor to
              the final clinical insight.
            </h2>
          </div>

          <div className="ecosystem-grid">
            {ECOSYSTEM_ITEMS.map((item, i) => {
              const open = opens[i]
              return (
                <article
                  key={item.title}
                  className={`ecosystem-col${open > 0.55 ? ' is-open' : ''}`}
                  style={{ '--open': open }}>
                  <div
                    className="ecosystem-col-reveal"
                    style={{
                      opacity: open,
                      transform: `translate3d(0, ${(1 - open) * 16}px, 0)`,
                    }}>
                    <p className="ecosystem-col-body">{item.body}</p>
                    <ul className="ecosystem-col-points">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <span className={`ecosystem-col-cta${item.ctaActive ? ' is-active' : ''}`}>{item.cta}</span>
                  </div>
                  <div className="ecosystem-col-foot">
                    <p className="ecosystem-col-kicker">{item.kicker}</p>
                    <h3 className="ecosystem-col-title">{item.title}</h3>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

const NAV_LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'impact', label: 'Impact' },
  { id: 'about', label: 'About' },
  { id: 'team', label: 'Team' },
]

function SiteNav() {
  const [open, setOpen] = useState(false)

  const go = (id) => {
    setOpen(false)
    if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <a
          className="site-nav-logo"
          href="#hero"
          onClick={(e) => {
            e.preventDefault()
            go('hero')
          }}>
          <img src="/aagamiseq-logo.png" alt="AagamiSEQ Technologies" />
        </a>

        <nav className="site-nav-links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" className="site-nav-link" onClick={() => go(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className={`site-nav-toggle${open ? ' is-open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="site-nav-menu"
          onClick={() => setOpen((v) => !v)}>
          <span className="site-nav-toggle-bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="site-nav-toggle-label">{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      <div
        id="site-nav-menu"
        className={`site-nav-panel${open ? ' is-open' : ''}`}
        aria-hidden={!open}>
        <button type="button" className="site-nav-backdrop" aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
        <nav className="site-nav-drawer" aria-label="Mobile">
          <p className="site-nav-drawer-kicker">Navigate</p>
          <ul className="site-nav-drawer-list">
            {NAV_LINKS.map((link, i) => (
              <li key={link.id} style={{ '--i': i }}>
                <button type="button" className="site-nav-drawer-link" tabIndex={open ? 0 : -1} onClick={() => go(link.id)}>
                  <span className="site-nav-drawer-index">{String(i + 1).padStart(2, '0')}</span>
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

// ── Atmosphere ─────────────────────────────────────────────────────────────
function Atmosphere() {
  const fogRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.08
    const w1 = (Math.sin(t) + 1) * 0.5
    const w2 = (Math.sin(t * 0.7 + 1.2) + 1) * 0.5
    _fogNow.copy(_fogA).lerp(_fogB, w1).lerp(_fogC, w2 * 0.45)
    if (fogRef.current) fogRef.current.color.copy(_fogNow)
    document.documentElement.style.setProperty('--fog-r', String(Math.round(_fogNow.r * 255)))
    document.documentElement.style.setProperty('--fog-g', String(Math.round(_fogNow.g * 255)))
    document.documentElement.style.setProperty('--fog-b', String(Math.round(_fogNow.b * 255)))
  })

  return <fog ref={fogRef} attach="fog" args={['#12383c', 18, 52]} />
}

/** Own rAF loop — avoids blank canvas when the host stalls r3f's internal frameloop */
function FrameLoopGuard() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    let raf = 0
    let running = true
    const tick = (now) => {
      if (!running) return
      try {
        // Drive subscribers + render explicitly
        advance(now / 1000, true)
        gl.render(scene, camera)
      } catch (_) {
        try {
          gl.render(scene, camera)
        } catch (__) {
          /* ignore */
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [advance, gl, scene, camera])

  return null
}

// ── CameraRig — elevated side view; tracks hero descending from top ────────
function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const p = progressApi.current
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const dive = smoother(BEATS.diveStart, BEATS.diveEnd, p)
    const reenter = smooth(BEATS.reenterStart, BEATS.reenterEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)

    const camX =
      lerp(0.15, 2.4, focus) * (1 - brand * 0.7) + reenter * 0.35 + brand * 0.55
    const camY =
      lerp(3.15, 1.45, focus) * lerp(1, 0.62, transit) * lerp(1, 0.48, dive) * (1 - brand * 0.35) +
      brand * 0.4 +
      reenter * 0.15
    const camZ = lerp(11.6, 9.0, focus) * lerp(1, 1.06, brand)

    cameraTarget.set(camX, camY, camZ)
    // Look a touch lower early so the hero reads as emerging under the nav band
    const lookY =
      lerp(1.85, 1.2, focus) * (1 - transit) +
      lerp(1.2, -0.8, transit) * (1 - dive) * (1 - brand) +
      lerp(-0.8, -1.85, dive) * (1 - reenter) * (1 - brand) +
      reenter * 0.15 * (1 - brand) +
      brand * 0.35
    const lookX = brand * 0.55 + reenter * 0.25
    lookAtTarget.set(lookX, lookY, 0)

    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 2.8))
    camera.lookAt(lookAtTarget)
    camera.fov = lerp(34, 30, focus)
    camera.updateProjectionMatrix()
  })

  return null
}

// Soft glow that follows the cursor — stronger toward the top of the frame
function CursorGlow() {
  const light = useRef()
  const soft = useRef()
  const target = useRef(new THREE.Vector3(0, 2.5, 2))
  const { camera } = useThree()
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    if (!light.current || !soft.current) return
    const px = pointer.current.x
    const py = pointer.current.y

    _cursorDir.set(px, py, 0.32).unproject(camera)
    _cursorDir.sub(camera.position).normalize()
    target.current.copy(camera.position).addScaledVector(_cursorDir, 6.5)
    // Pull the glow up when cursor is in the upper region of the screen
    const topBias = Math.max(0, py)
    target.current.y += 0.6 + topBias * 2.4

    const ease = 1 - Math.exp(-delta * 9)
    light.current.position.lerp(target.current, ease)
    soft.current.position.lerp(target.current, ease * 0.85)

    // Stronger when aiming toward the top
    light.current.intensity = 2.2 + topBias * 2.0
    soft.current.intensity = 1.1 + topBias * 1.4
  })

  return (
    <>
      <pointLight ref={light} color="#4ab8a8" intensity={1.6} distance={14} decay={1.7} />
      <pointLight ref={soft} color="#2a7080" intensity={0.8} distance={18} decay={1.5} />
    </>
  )
}

// ── AtomMaterial ───────────────────────────────────────────────────────────
function AtomMaterial({ color, preset, emissiveBoost = 0 }) {
  const p = MAT_PRESETS[preset % MAT_PRESETS.length]
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={p.emissiveIntensity + emissiveBoost}
      metalness={p.metalness}
      roughness={p.roughness}
      transparent={p.opacity < 0.98}
      opacity={p.opacity}
      depthWrite={p.opacity > 0.7}
    />
  )
}

// ── StructureMesh ──────────────────────────────────────────────────────────
function StructureMesh({ structureIndex, matPreset }) {
  const def = STRUCTURES[structureIndex % STRUCTURES.length]
  const bondColor = matPreset % 2 === 0 ? BOND_DARK : BOND_MID

  return (
    <group>
      <mesh>
        <sphereGeometry args={[def.coreR, 24, 24]} />
        <AtomMaterial color={def.core} preset={matPreset} />
      </mesh>
      {def.tips.map((tip, i) => {
        const mid = [tip.pos[0] * 0.5, tip.pos[1] * 0.5, tip.pos[2] * 0.5]
        const length = Math.hypot(tip.pos[0], tip.pos[1], tip.pos[2]) * 0.68
        const tipPreset = (matPreset + i) % MAT_PRESETS.length
        return (
          <group key={i}>
            <mesh position={mid} quaternion={bondQuat(tip.pos)}>
              <cylinderGeometry args={[0.028, 0.028, length, 6]} />
              <meshStandardMaterial
                color={bondColor}
                metalness={0.4}
                roughness={0.5}
                transparent={MAT_PRESETS[matPreset].opacity < 0.9}
                opacity={Math.min(1, MAT_PRESETS[matPreset].opacity + 0.15)}
              />
            </mesh>
            <mesh position={tip.pos}>
              <sphereGeometry args={[tip.r, 16, 16]} />
              <AtomMaterial color={tip.color} preset={tipPreset} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ── FieldMolecules ─────────────────────────────────────────────────────────
const COUNT = 48

function FieldMolecules() {
  const fadeRef = useRef(1)

  // current world-space XZ positions for every molecule — written each frame
  // by HoverMolecule, then the separation pass reads + adjusts them
  const posXZ = useRef(null)  // Float32Array [x0,z0, x1,z1, ...]
  const posY = useRef(null)  // Float32Array [y0, y1, ...]

  const layout = useMemo(() => {
    posXZ.current = new Float32Array(COUNT * 2)
    posY.current = new Float32Array(COUNT)
    const items = []
    for (let i = 0; i < COUNT; i += 1) {
      const scale = 0.35 + seededRandom(i + 51) * 0.45
      const structure = Math.floor(seededRandom(i + 99) * STRUCTURES.length)
      const coreR = STRUCTURES[structure].coreR
      const boundR = (coreR + 0.45) * scale
      items.push({
        base: [
          (seededRandom(i + 2) - 0.5) * 13,
          // Keep field molecules above the membrane — only the hero threads the pore
          1.15 + seededRandom(i + 19) * 4.2,
          -1 + (seededRandom(i + 37) - 0.5) * 8,
        ],
        scale,
        drift: 0.18 + seededRandom(i + 67) * 0.44,
        phase: seededRandom(i + 83) * Math.PI * 2,
        structure,
        matPreset: Math.floor(seededRandom(i + 111) * MAT_PRESETS.length),
        boundR,
        idx: i,
        // Own-axis tumble rates (rad/sec) — each molecule spins differently
        spinX: (seededRandom(i + 130) - 0.5) * 1.4,
        spinY: (0.35 + seededRandom(i + 140) * 1.1) * (seededRandom(i + 141) > 0.5 ? 1 : -1),
        spinZ: (seededRandom(i + 150) - 0.5) * 1.2,
      })
    }
    return items
  }, [])

  useFrame((_state) => {
    // Runs at default priority 0 with HeroSphere; molecules resolve after (priority 1)
    const p = progressApi.current
    const clear = smooth(BEATS.clearStart, BEATS.clearEnd, p)
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    fadeRef.current = (1 - focus * 0.25) * (1 - clear)

    if (!posXZ.current) return
    const px = posXZ.current
    const n = COUNT

    for (let iter = 0; iter < 2; iter++) {
      for (let a = 0; a < n; a++) {
        const ax = px[a * 2]
        const az = px[a * 2 + 1]
        const ra = layout[a].boundR
        for (let b = a + 1; b < n; b++) {
          const bx = px[b * 2]
          const bz = px[b * 2 + 1]
          const rb = layout[b].boundR
          const dx = ax - bx
          const dz = az - bz
          const distSq = dx * dx + dz * dz
          const minDist = ra + rb
          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq)
            const push = (minDist - dist) * 0.5
            const nx = (dx / dist) * push
            const nz = (dz / dist) * push
            px[a * 2] += nx
            px[a * 2 + 1] += nz
            px[b * 2] -= nx
            px[b * 2 + 1] -= nz
          }
        }
      }
    }
  })

  return (
    <>
      {layout.map((item) => (
        <HoverMolecule key={item.idx} item={item} fadeRef={fadeRef} posXZ={posXZ} posY={posY} />
      ))}
    </>
  )
}

// ── HoverMolecule ──────────────────────────────────────────────────────────
function HoverMolecule({ item, fadeRef, posXZ, posY }) {
  const group = useRef()
  const hovered = useRef(false)
  const swayX = useRef(0)
  const swayY = useRef(0)
  const swayZ = useRef(0)
  const velX = useRef(0)
  const velY = useRef(0)
  const velZ = useRef(0)
  const wasHovered = useRef(false)

  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const fade = fadeRef.current
    const idx = item.idx

    if (fade <= 0.04) {
      group.current.visible = false
      return
    }
    group.current.visible = true

    const isHov = hovered.current

    // Fresh hover → kick in a random 3D direction (unlocked sway only — no color/scale)
    if (isHov && !wasHovered.current) {
      const a = Math.random() * Math.PI * 2
      const b = (Math.random() - 0.5) * Math.PI
      const strength = 1.1 + Math.random() * 0.8
      velX.current += Math.cos(a) * Math.cos(b) * strength
      velY.current += Math.sin(b) * strength * 0.65
      velZ.current += Math.sin(a) * Math.cos(b) * strength
    }
    wasHovered.current = isHov

    const drag = Math.pow(0.02, delta)
    velX.current *= drag
    velY.current *= drag
    velZ.current *= drag
    swayX.current += velX.current * delta
    swayY.current += velY.current * delta
    swayZ.current += velZ.current * delta

    const sdist = Math.hypot(swayX.current, swayY.current, swayZ.current)
    if (sdist > 2.8) {
      const pull = (sdist - 2.8) * 0.35 * delta
      swayX.current -= (swayX.current / sdist) * pull
      swayY.current -= (swayY.current / sdist) * pull
      swayZ.current -= (swayZ.current / sdist) * pull
    }

    const orbX = item.base[0] + Math.cos(t * item.drift * 0.65 + item.phase) * 0.3 + swayX.current
    const orbY = item.base[1] + Math.sin(t * item.drift + item.phase) * 0.22 + swayY.current
    const orbZ = item.base[2] + Math.sin(t * item.drift * 0.5 + item.phase) * 0.25 + swayZ.current
    if (posXZ.current) {
      posXZ.current[idx * 2] = orbX
      posXZ.current[idx * 2 + 1] = orbZ
    }

    const finalX = posXZ.current ? posXZ.current[idx * 2] : orbX
    const finalZ = posXZ.current ? posXZ.current[idx * 2 + 1] : orbZ

    let y = orbY

    // Bounce off the nanopore membrane — field molecules never pass through
    // (only the hero sphere may thread the pore)
    const floor = MEMBRANE_Y + item.boundR * 0.85 + 0.05
    const xzDist = Math.hypot(finalX, finalZ)
    if (y < floor) {
      y = floor + Math.abs(floor - y) * 0.15
      if (velY.current < 0) velY.current = Math.abs(velY.current) * 0.55 + 0.15
      if (swayY.current < 0) swayY.current *= -0.4
      // Nudge away from the pore opening so they don't nest in the hole
      if (xzDist < PORE_RADIUS * 1.35 && xzDist > 0.001) {
        const push = (PORE_RADIUS * 1.35 - xzDist) * 0.08
        const nx = finalX / xzDist
        const nz = finalZ / xzDist
        if (posXZ.current) {
          posXZ.current[idx * 2] += nx * push
          posXZ.current[idx * 2 + 1] += nz * push
        }
      }
    }

    let px = posXZ.current ? posXZ.current[idx * 2] : finalX
    let py = y
    let pz = posXZ.current ? posXZ.current[idx * 2 + 1] : finalZ

    // Bounce off the hero — resolve position only (safe, no kick spam)
    const hdx = px - heroApi.x
    const hdy = py - heroApi.y
    const hdz = pz - heroApi.z
    const hDistSq = hdx * hdx + hdy * hdy + hdz * hdz
    const minHero = item.boundR + heroApi.r * 1.05
    if (Number.isFinite(hDistSq) && hDistSq < minHero * minHero) {
      let hDist = Math.sqrt(Math.max(hDistSq, 1e-8))
      let nx = hdx / hDist
      let ny = hdy / hDist
      let nz = hdz / hDist
      if (hDist < 1e-4) {
        nx = 1
        ny = 0.25
        nz = 0
        hDist = 1e-4
      }
      const push = minHero - hDist
      px += nx * push
      py += ny * push
      pz += nz * push

      const rawX = item.base[0] + Math.cos(t * item.drift * 0.65 + item.phase) * 0.3
      const rawY = item.base[1] + Math.sin(t * item.drift + item.phase) * 0.22
      const rawZ = item.base[2] + Math.sin(t * item.drift * 0.5 + item.phase) * 0.25
      swayX.current = px - rawX
      swayY.current = py - rawY
      swayZ.current = pz - rawZ

      const vn = velX.current * nx + velY.current * ny + velZ.current * nz
      if (vn < 0) {
        velX.current -= nx * vn
        velY.current -= ny * vn
        velZ.current -= nz * vn
      }
      if (posXZ.current) {
        posXZ.current[idx * 2] = px
        posXZ.current[idx * 2 + 1] = pz
      }
    }

    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
      px = item.base[0]
      py = item.base[1]
      pz = item.base[2]
      swayX.current = 0
      swayY.current = 0
      swayZ.current = 0
    }

    group.current.position.set(px, py, pz)
    // Continuous tumble on own axes (not camera-locked)
    group.current.rotation.x += (item.spinX || 0) * delta
    group.current.rotation.y += (item.spinY || 0) * delta
    group.current.rotation.z += (item.spinZ || 0) * delta
    group.current.scale.setScalar(item.scale * (0.5 + fade * 0.5))
  }, 1)

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation()
        hovered.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hovered.current = false
        document.body.style.cursor = 'auto'
      }}>
      <StructureMesh structureIndex={item.structure} matPreset={item.matPreset} />
    </group>
  )
}

// ── HeroSphere — pore → dive off → reenter BR → Q → dissolve + glow blast ──
const heroTarget = new THREE.Vector3()

function heroSizeAt(p, focus, transit, dive, settle, dissolve) {
  const sIdle = 0.34
  const sFocus = 0.5
  const sPost = 0.44
  const sOff = 0.4
  const sQ = 0.14
  let base
  if (p <= BEATS.focusEnd) base = lerp(sIdle, sFocus, focus)
  else if (p <= BEATS.transitEnd) base = lerp(sFocus, sPost, transit)
  else if (p <= BEATS.diveEnd) base = lerp(sPost, sOff, dive)
  else if (p < BEATS.reenterStart) base = sOff
  else base = lerp(sOff, sQ, settle)
  // Expand gently into bloom — keep soft, avoid reading as a hard ball
  return base * lerp(1, 1.55, dissolve)
}

function HeroSphere() {
  const mesh = useRef()
  const mat = useRef()
  const blastGroup = useRef()
  const blastCore = useRef()
  const blastMid = useRef()
  const blastHalo = useRef()
  const blastLight = useRef()
  const prevP = useRef(0)
  const scaleRef = useRef(0.34)
  const glowMap = useMemo(() => makeGlowTexture(), [])

  useFrame((state, delta) => {
    if (!mesh.current || !mat.current) return
    const p = progressApi.current
    const prev = prevP.current
    const t = state.clock.elapsedTime
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const poreReady = smooth(BEATS.poreInStart, BEATS.poreInEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const dive = smoother(BEATS.diveStart, BEATS.diveEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)
    // Arrive at Q fully before any dissolve/blast
    const settle = smooth(BEATS.reenterStart, BEATS.dissolveStart, p)
    const dissolve = smooth(BEATS.dissolveStart, BEATS.dissolveEnd, p)

    const qX = 2.42
    const qY = 0.1
    const qZ = 0.22
    const offBR = { x: 4.6, y: -7.2, z: 0.3 }
    const offDown = { x: 0, y: -7.8, z: 0.04 }

    if (prev < BEATS.diveEnd && p >= BEATS.diveEnd) {
      mesh.current.position.set(offBR.x, offBR.y, offBR.z)
    } else if (prev >= BEATS.diveEnd && p < BEATS.diveEnd) {
      mesh.current.position.set(offDown.x, offDown.y, offDown.z)
    }

    if (p < BEATS.transitStart) {
      // Fully into the field by half of the manifesto's first "D"
      const halfD = BEATS.manifestoFillStart + (0.5 / MANIFESTO.length) * (BEATS.manifestoFillEnd - BEATS.manifestoFillStart)
      const fromNav = smooth(0, halfD, p)
      const reveal = Math.max(fromNav, focus)
      const hoverY = lerp(7.35, lerp(4.55, lerp(2.4, 1.45, poreReady), focus), reveal)
      const hoverZ = lerp(-1.35, 0.06, reveal)
      heroTarget.set(
        Math.sin(t * 0.28) * 0.05 * reveal * (1 - focus * 0.5),
        hoverY + Math.cos(t * 0.32) * 0.035 * reveal * (1 - focus * 0.7),
        hoverZ,
      )
    } else if (p < BEATS.diveEnd) {
      // Single ease only — double smoothstep made the mid-drop race
      const through = transit
      const down = dive
      const yThrough = lerp(1.45, -1.55, through)
      const yOff = lerp(-1.55, offDown.y, down)
      heroTarget.set(Math.sin(t * 0.1) * 0.015 * (1 - down), lerp(yThrough, yOff, down), 0.04)
    } else if (p < BEATS.reenterStart) {
      heroTarget.set(offBR.x, offBR.y, offBR.z)
    } else {
      // Hold at Q once settled — blast originates here from the hero
      const ease = settle * settle * (3 - 2 * settle)
      heroTarget.set(lerp(offBR.x, qX, ease), lerp(-5.2, qY, ease), lerp(offBR.z, qZ, ease))
    }

    const parked = p >= BEATS.diveEnd && p < BEATS.reenterStart
    const follow = parked ? 1 : 1 - Math.exp(-delta * (settle > 0.95 ? 8 : 5))
    mesh.current.position.lerp(heroTarget, follow)

    mesh.current.rotation.x += delta * 0.55
    mesh.current.rotation.y += delta * 0.85
    mesh.current.rotation.z += delta * 0.28

    const sizeTarget = heroSizeAt(p, focus, transit, dive, settle, dissolve)
    scaleRef.current = lerp(scaleRef.current, sizeTarget, 1 - Math.exp(-delta * 8))
    mesh.current.scale.setScalar(scaleRef.current)

    mat.current.transparent = true
    mat.current.opacity = 1 - dissolve
    mat.current.depthWrite = dissolve < 0.85

    // Soft teal pulse — same family, never a hard color swap
    const pulse = (Math.sin(t * 1.6) + 1) * 0.5
    _heroColor.copy(HERO_COLOR).lerp(HERO_COLOR_PULSE, pulse * 0.55)
    _heroEmissive.copy(HERO_EMISSIVE).lerp(HERO_EMISSIVE_PULSE, pulse * 0.65)
    mat.current.color.copy(_heroColor)
    mat.current.emissive.copy(_heroEmissive)

    const flash = dissolve * (1 - dissolve) * 4
    mat.current.emissiveIntensity =
      0.14 + pulse * 0.1 + focus * 0.12 + brand * 0.08 + flash * 1.4
    mesh.current.visible = dissolve < 0.98

    // Blast rides on the hero — same world position as the sphere
    const hx = mesh.current.position.x
    const hy = mesh.current.position.y
    const hz = mesh.current.position.z
    if (blastGroup.current) {
      blastGroup.current.position.set(hx, hy, hz)
      const grow = dissolve * dissolve * (3 - 2 * dissolve)
      const show = dissolve > 0.01
      blastGroup.current.visible = show

      // Soft bloom layers — wide, low opacity, no hard rim
      if (blastCore.current) {
        blastCore.current.scale.setScalar(Math.max(0.001, grow * 2.2))
        blastCore.current.material.opacity = flash * 0.45
      }
      if (blastMid.current) {
        blastMid.current.scale.setScalar(Math.max(0.001, grow * 4.2))
        blastMid.current.material.opacity = flash * 0.22
      }
      if (blastHalo.current) {
        blastHalo.current.scale.setScalar(Math.max(0.001, grow * 7.2))
        blastHalo.current.material.opacity = flash * 0.1
      }
    }
    if (blastLight.current) {
      blastLight.current.position.set(hx, hy, hz + 0.2)
      blastLight.current.intensity = flash * 8
      blastLight.current.visible = dissolve > 0.01
    }

    heroApi.x = hx
    heroApi.y = hy
    heroApi.z = hz
    heroApi.r = scaleRef.current * (1 - dissolve)
    prevP.current = p
  })

  return (
    <group>
      <mesh ref={mesh} position={[0, 7.35, -1.35]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          ref={mat}
          color="#2f5c58"
          emissive="#143430"
          emissiveIntensity={0.14}
          metalness={0.58}
          roughness={0.32}
          transparent
        />
      </mesh>

      <group ref={blastGroup} visible={false}>
        <sprite ref={blastCore} scale={[1, 1, 1]}>
          <spriteMaterial
            map={glowMap}
            color="#c8fff4"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <sprite ref={blastMid} scale={[1, 1, 1]}>
          <spriteMaterial
            map={glowMap}
            color="#7ee8d8"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <sprite ref={blastHalo} scale={[1, 1, 1]}>
          <spriteMaterial
            map={glowMap}
            color="#4ab0a0"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
      <pointLight ref={blastLight} color="#8ef0e0" intensity={0} distance={14} decay={2} />
    </group>
  )
}

// Shared fade bands — disc + lattice dissolve together
const MEMBRANE_FADE_BANDS = [
  { inner: 0, outer: 3.15, opacity: 0.94 },
  { inner: 3.15, outer: 3.55, opacity: 0.62 },
  { inner: 3.55, outer: 3.95, opacity: 0.34 },
  { inner: 3.95, outer: 4.3, opacity: 0.14 },
  { inner: 4.3, outer: 4.55, opacity: 0.05 },
]

function bandIndexForRadius(r) {
  for (let i = 0; i < MEMBRANE_FADE_BANDS.length; i += 1) {
    if (r < MEMBRANE_FADE_BANDS[i].outer) return i
  }
  return -1
}

// ── Nanopore — clean concentric lattice + soft faded disc
function Nanopore() {
  const group = useRef()
  const discMats = useRef([])
  const latticeMats = useRef([])
  const latticeMeshes = useRef([])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const PORE = PORE_RADIUS

  const discBands = useMemo(
    () => [
      { inner: PORE, outer: 3.15, opacity: 0.88, color: '#3a7a72' },
      { inner: 3.15, outer: 3.55, opacity: 0.55, color: '#347068' },
      { inner: 3.55, outer: 3.95, opacity: 0.3, color: '#2c635c' },
      { inner: 3.95, outer: 4.3, opacity: 0.14, color: '#245650' },
      { inner: 4.3, outer: 4.55, opacity: 0.05, color: '#1c4844' },
    ],
    [],
  )

  const atomBands = useMemo(() => {
    const bands = MEMBRANE_FADE_BANDS.map(() => [])
    const spacing = 0.168
    const atomR = 0.058
    let ring = 0
    for (let r = PORE + 0.12; r <= 4.5; r += spacing) {
      const bi = bandIndexForRadius(r)
      if (bi < 0) {
        ring += 1
        continue
      }
      const count = Math.max(8, Math.round((Math.PI * 2 * r) / spacing))
      const stagger = (ring % 2) * (Math.PI / count)
      for (let k = 0; k < count; k += 1) {
        const a = (k / count) * Math.PI * 2 + stagger
        bands[bi].push({
          x: Math.cos(a) * r,
          y: 0.052,
          z: Math.sin(a) * r,
          r: atomR,
        })
      }
      ring += 1
    }
    return bands
  }, [])

  useEffect(() => {
    atomBands.forEach((atoms, bandIdx) => {
      const mesh = latticeMeshes.current[bandIdx]
      if (!mesh || atoms.length === 0) return
      atoms.forEach((n, i) => {
        dummy.position.set(n.x, n.y, n.z)
        dummy.scale.setScalar(n.r)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.count = atoms.length
    })
  }, [atomBands, dummy])

  useFrame((state) => {
    if (!group.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const fadeIn = smoother(BEATS.poreInStart, BEATS.poreInEnd, p)
    const fadeOut = smooth(BEATS.poreOutStart, BEATS.poreOutEnd, p)
    const vis = fadeIn * (1 - fadeOut)

    group.current.visible = vis > 0.004
    group.current.position.y = 0
    group.current.rotation.y = Math.sin(t * 0.05) * 0.012

    discBands.forEach((band, i) => {
      const mat = discMats.current[i]
      if (mat) mat.opacity = vis * band.opacity
    })
    MEMBRANE_FADE_BANDS.forEach((band, i) => {
      const mat = latticeMats.current[i]
      if (mat) mat.opacity = vis * band.opacity
    })
  })

  return (
    <group ref={group}>
      {/* Disc — solid core → soft rim fade */}
      {discBands.map((band, i) => (
        <mesh key={`disc-${band.inner}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <ringGeometry args={[band.inner, band.outer, 192]} />
          <meshStandardMaterial
            ref={(m) => {
              discMats.current[i] = m
            }}
            color={band.color}
            emissive="#1a4a44"
            emissiveIntensity={0.16}
            metalness={0.2}
            roughness={0.55}
            transparent
            opacity={band.opacity}
            side={THREE.DoubleSide}
            depthWrite={i === 0}
          />
        </mesh>
      ))}

      {/* Lattice — same radial fade bands as the disc */}
      {atomBands.map((atoms, i) =>
        atoms.length === 0 ? null : (
          <instancedMesh
            key={`lat-${i}`}
            ref={(m) => {
              latticeMeshes.current[i] = m
            }}
            args={[undefined, undefined, atoms.length]}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial
              ref={(m) => {
                latticeMats.current[i] = m
              }}
              color="#4a9088"
              emissive="#1a4a44"
              emissiveIntensity={0.14}
              metalness={0.32}
              roughness={0.42}
              transparent
              opacity={MEMBRANE_FADE_BANDS[i].opacity}
              depthWrite={false}
            />
          </instancedMesh>
        ),
      )}
    </group>
  )
}

// ── Starfield — round soft discs, mixed speeds, flicker ────────────────────
function Starfield() {
  const points = useRef()
  const data = useRef(null)
  const discMap = useMemo(() => makeDiscTexture(), [])

  if (!data.current) {
    const count = 4200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const baseColors = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const flickers = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const o = i * 3
      positions[o] = (seededRandom(i + 1) - 0.5) * 50
      positions[o + 1] = seededRandom(i + 2) * 24 - 8
      positions[o + 2] = (seededRandom(i + 3) - 0.5) * 36 - 5

      const tier = seededRandom(i + 6)
      if (tier < 0.55) speeds[i] = 0.0003 + seededRandom(i + 7) * 0.0008
      else if (tier < 0.85) speeds[i] = 0.002 + seededRandom(i + 7) * 0.004
      else speeds[i] = 0.01 + seededRandom(i + 7) * 0.028

      flickers[i] = 0.4 + seededRandom(i + 8) * 4.5
      phases[i] = seededRandom(i + 9) * Math.PI * 2

      const shade = 0.45 + seededRandom(i + 4) * 0.55
      const tone = seededRandom(i + 5)
      let r
      let g
      let b
      if (tone < 0.45) {
        r = shade * 0.5
        g = shade * 0.82
        b = shade * 1.0
      } else if (tone < 0.82) {
        r = shade * 0.32
        g = shade * 0.95
        b = shade * 0.72
      } else {
        r = shade * 0.88
        g = shade * 0.98
        b = shade * 0.92
      }
      baseColors[o] = r
      baseColors[o + 1] = g
      baseColors[o + 2] = b
      colors[o] = r
      colors[o + 1] = g
      colors[o + 2] = b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    data.current = { geometry, speeds, flickers, phases, baseColors, count }
  }

  useFrame((state) => {
    if (!points.current || !data.current) return
    const p = progressApi.current
    const clear = smooth(BEATS.clearStart, BEATS.clearEnd, p)
    const t = state.clock.elapsedTime
    const { geometry, speeds, flickers, phases, baseColors, count } = data.current
    const positions = geometry.attributes.position.array
    const colors = geometry.attributes.color.array

    for (let i = 0; i < count; i += 1) {
      const o = i * 3
      const spd = speeds[i]
      positions[o] += spd
      positions[o + 1] += Math.sin(t * (0.05 + spd * 8) + phases[i]) * spd * 0.35
      positions[o + 2] += Math.cos(t * 0.04 + phases[i]) * spd * 0.15
      if (positions[o] > 25) positions[o] = -25
      if (positions[o + 1] > 16) positions[o + 1] = -8
      if (positions[o + 1] < -8) positions[o + 1] = 16

      const flick = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * flickers[i] + phases[i]))
      colors[o] = baseColors[o] * flick
      colors[o + 1] = baseColors[o + 1] * flick
      colors[o + 2] = baseColors[o + 2] * flick
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    points.current.material.opacity = 0.72 * (1 - clear * 0.55) + 0.18
  })

  return (
    <points ref={points} geometry={data.current.geometry} frustumCulled={false}>
      <pointsMaterial
        map={discMap}
        vertexColors
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
      />
    </points>
  )
}
