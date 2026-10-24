import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  IconAI,
  IconAffordable,
  IconChip,
  IconDevice,
  IconKit,
  IconLab,
  IconLeaf,
  IconPore,
  IconSample,
  IconSignal,
  IconTarget,
} from './icons'
import { QUALITY, useInView } from './perf'

const GEO_TIP = new THREE.SphereGeometry(1, 12, 12)

const NAV_LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'how-it-works', label: 'Technology' },
  { id: 'ecosystem', label: 'Platform' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'about', label: 'About' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
]

const VALUE_CHIPS = [
  { label: 'Earlier Detection', Icon: IconTarget },
  { label: 'Affordable', Icon: IconAffordable },
  { label: 'Accessible Labs', Icon: IconLab },
  { label: 'Healthier Tomorrow', Icon: IconLeaf },
]

const PROCESS_STEPS = [
  {
    title: 'Sample',
    body: 'Blood or urine is prepared for single-molecule readout — no heavy lab chemistry.',
    Icon: IconSample,
  },
  {
    title: 'Nanopore sensing',
    body: 'Molecules pass a nanometer aperture, each leaving a unique electrical event.',
    Icon: IconPore,
  },
  {
    title: 'Electrical signal',
    body: 'Ionic current blockades become clean signatures of identity and structure.',
    Icon: IconSignal,
  },
  {
    title: 'AI analysis',
    body: 'Models classify cancer-relevant patterns so clinics can act before symptoms.',
    Icon: IconAI,
  },
]

const PROCESS_POINTS = [
  'Single-molecule sensitivity',
  'Label-free & real-time',
  'DNA / RNA / proteins',
  'High accuracy with AI',
]

const PLATFORM_ITEMS = [
  {
    kicker: 'Sensor',
    title: 'Solid-State Nanopore Chips',
    body: 'Engineered for high sensitivity, durability, and scale.',
    Icon: IconChip,
    visual: 'chip',
  },
  {
    kicker: 'Hardware',
    title: 'Readout System',
    body: 'Custom electronics for high-speed, high-resolution signal acquisition.',
    Icon: IconDevice,
    visual: 'device',
  },
  {
    kicker: 'Software',
    title: 'AI Analysis Software',
    body: 'Turns raw signals into actionable insights with real-time scoring.',
    Icon: IconAI,
    visual: 'software',
  },
  {
    kicker: 'Workflow',
    title: 'Reagents & Consumables',
    body: 'Optimized for performance, consistency, and cost-effectiveness.',
    Icon: IconKit,
    visual: 'kits',
  },
]

const STANDS_APART = [
  { title: 'Ultrasensitive', body: 'Detects low-abundance cancer biomarkers.', Icon: IconTarget },
  { title: 'Affordable', body: 'Designed for India-first and global markets.', Icon: IconAffordable },
  { title: 'Portable & scalable', body: 'Fits clinics as well as regional diagnostics.', Icon: IconDevice },
  { title: 'Sustainable', body: 'Enables early treatment and better outcomes.', Icon: IconLeaf },
]

const ROADMAP = [
  {
    num: '01',
    title: 'Chip Engineering',
    points: ['Pore geometry', 'Membrane durability', 'Wafer-level characterization'],
  },
  {
    num: '02',
    title: 'Readout Integration',
    points: ['Current electronics', 'Noise floor', 'Signal acquisition'],
  },
  {
    num: '03',
    title: 'Assay + AI',
    points: ['Sample workflow', 'Signature models', 'Clinical reporting'],
  },
  {
    num: '04',
    title: 'Validation & Scale',
    points: ['Analytical validation', 'Pilot manufacturing', 'Clinic partners'],
  },
]

const TRUST_PARTNERS = [
  { name: 'C-CAMP', role: 'Life Sciences Innovation Hub', src: '/partners/ccamp.jpg' },
  { name: 'MeitY Startup Hub', role: 'Government Innovation Support', src: '/partners/meity.png' },
  { name: 'SID-IISc', role: 'Technology Transfer & Incubation', src: '/partners/sid-iisc.jpg' },
  { name: 'INCENSE', role: 'Deep Tech Incubator', src: '/partners/incense.png' },
]

const TEAM_MEMBERS = [
  {
    name: 'Prof. Manoj Varma',
    role: 'Founder | R&D Advisor',
    bio: 'Nanoscale engineering and semiconductor physics, leading R&D.',
    src: '/team/manoj.jpg',
  },
  {
    name: 'Divya Mohan Yadav, PhD',
    role: 'Founder | CEO',
    bio: 'Scientific expertise and entrepreneurial leadership as CEO.',
    src: '/team/divya.jpg',
  },
  {
    name: 'Muddukrishna P',
    role: 'Founder | CPO',
    bio: 'Product and engineering — from research to scalable diagnostics.',
    src: '/team/muddu.jpeg',
  },
  {
    name: 'Anumol Dominic, PhD',
    role: 'Lead Fabrication Engg',
    bio: 'Nanopore chip fabrication, reproducibility, and scale.',
    src: '/team/anumol.jpeg',
  },
]

function scrollToId(id) {
  if (id === 'hero') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function App() {
  return (
    <main>
      <SiteNav />
      <HeroSection />
      <HowItWorksSection />
      <PlatformSection />
      <ArchitectureSection />
      <StandsApartSection />
      <RoadmapSection />
      <AboutSection />
      <TrustSection />
      <TeamSection />
      <SiteFooter />
    </main>
  )
}

function SiteNav() {
  const [open, setOpen] = useState(false)
  const go = (id) => {
    setOpen(false)
    scrollToId(id)
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
          <img src="/aagamiseq-logo.png" alt="AagamiSEQ Technologies" width="160" height="64" decoding="async" />
        </a>

        <nav className="site-nav-links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" className="site-nav-link" onClick={() => go(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>

        <a className="site-nav-cta" href="#contact" onClick={(e) => { e.preventDefault(); go('contact') }}>
          Partner with us
        </a>

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

      <div id="site-nav-menu" className={`site-nav-panel${open ? ' is-open' : ''}`} aria-hidden={!open}>
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

function HeroSection() {
  return (
    <section id="hero" className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">Solid-state nanopore platform</p>
          <h1>
            From Molecules
            <br />
            <span>to Answers.</span>
          </h1>
          <p className="hero-lede">
            Building an affordable molecular diagnostics platform for earlier cancer detection.
          </p>
          <div className="hero-actions">
            <a
              className="btn-primary"
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault()
                scrollToId('how-it-works')
              }}>
              Our Technology
              <span aria-hidden>→</span>
            </a>
          </div>
          <ul className="hero-chips">
            {VALUE_CHIPS.map(({ label, Icon }) => (
              <li key={label}>
                <Icon className="hero-chip-icon" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-visual">
          <PoreStage />
          <aside className="hero-callout">
            <span className="hero-callout-dot" aria-hidden />
            Detecting cancer biomarkers in single-molecule time.
          </aside>
        </div>
      </div>
    </section>
  )
}

function DNAHelix({ tilt = 0.35 }) {
  const group = useRef()
  const { strandA, strandB, pairs, sugarsA, sugarsB, tubular } = useMemo(() => {
    const count = QUALITY.dnaCount
    const height = 9.6
    const radius = 1.05
    const turns = count / 10.5
    const pointsA = []
    const pointsB = []
    const sugarsA = []
    const sugarsB = []
    const pairData = []

    for (let i = 0; i < count; i++) {
      const u = i / (count - 1)
      const t = u * turns * Math.PI * 2
      const y = (u - 0.5) * height
      const rx = radius * (1 + 0.04 * Math.sin(t * 2))
      const rz = radius * (1 - 0.03 * Math.sin(t * 2))
      const ax = Math.cos(t) * rx
      const az = Math.sin(t) * rz
      const bx = Math.cos(t + Math.PI) * rx
      const bz = Math.sin(t + Math.PI) * rz
      pointsA.push(new THREE.Vector3(ax, y, az))
      pointsB.push(new THREE.Vector3(bx, y, bz))
      if (QUALITY.dnaSugars) {
        sugarsA.push([ax * 0.92, y, az * 0.92])
        sugarsB.push([bx * 0.92, y, bz * 0.92])
      }
      const mx = (ax + bx) * 0.5
      const mz = (az + bz) * 0.5
      const dx = bx - ax
      const dz = bz - az
      const len = Math.hypot(dx, dz)
      pairData.push({ mx, y, mz, len, angle: Math.atan2(dz, dx), thick: i % 2 === 0 ? 0.038 : 0.048 })
    }

    return {
      strandA: new THREE.CatmullRomCurve3(pointsA),
      strandB: new THREE.CatmullRomCurve3(pointsB),
      pairs: pairData,
      sugarsA,
      sugarsB,
      tubular: QUALITY.dnaTubular,
    }
  }, [])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18
  })

  return (
    <group ref={group} rotation={[0.18, tilt, 0.08]} scale={0.92}>
      <mesh>
        <tubeGeometry args={[strandA, tubular[0], 0.078, tubular[1], false]} />
        <meshStandardMaterial color="#F15BB5" metalness={0.2} roughness={0.28} />
      </mesh>
      <mesh>
        <tubeGeometry args={[strandB, tubular[0], 0.078, tubular[1], false]} />
        <meshStandardMaterial color="#00BBF9" metalness={0.2} roughness={0.28} />
      </mesh>
      {sugarsA.map((pos, i) => (
        <mesh key={`sa-${i}`} position={pos} scale={0.09} geometry={GEO_TIP}>
          <meshStandardMaterial color="#F15BB5" />
        </mesh>
      ))}
      {sugarsB.map((pos, i) => (
        <mesh key={`sb-${i}`} position={pos} scale={0.09} geometry={GEO_TIP}>
          <meshStandardMaterial color="#00BBF9" />
        </mesh>
      ))}
      {pairs.map((p, i) => (
        <group key={i} position={[p.mx, p.y, p.mz]} rotation={[0, -p.angle, 0]}>
          <mesh position={[-p.len * 0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.065, p.len * 0.28, 4, 8]} />
            <meshStandardMaterial color="#F15BB5" />
          </mesh>
          <mesh position={[p.len * 0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.065, p.len * 0.28, 4, 8]} />
            <meshStandardMaterial color="#5BB8E8" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function PoreChip() {
  return (
    <group rotation={[-1.12, 0.35, 0.18]} position={[0.15, -0.05, 0.2]}>
      <mesh>
        <ringGeometry args={[0.62, 2.55, 4, 1]} />
        <meshStandardMaterial color="#8fd4f8" metalness={0.55} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <ringGeometry args={[0.62, 2.55, 4, 1]} />
        <meshStandardMaterial color="#1B4F8A" metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  )
}

function PoreStage({ compact = false }) {
  const wrap = useRef(null)
  const near = useInView(wrap, { rootMargin: '40% 0px', initial: true })

  return (
    <div ref={wrap} className={`pore-stage${compact ? ' is-compact' : ''}`} aria-hidden>
      {near ? (
        <Canvas
          frameloop="always"
          dpr={QUALITY.dpr}
          camera={{ position: compact ? [0, 0.2, 7.2] : [1.4, 1.1, 8.2], fov: compact ? 42 : 36, near: 0.1, far: 40 }}
          gl={{ antialias: QUALITY.antialias, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
          }}>
          <ambientLight intensity={0.55} color="#d7e8f8" />
          <directionalLight position={[6, 8, 4]} intensity={1.15} color="#ffffff" />
          <pointLight position={[-2, 1, 3]} intensity={0.8} color="#00BBF9" distance={16} />
          <pointLight position={[2, -1, 2]} intensity={0.55} color="#F15BB5" distance={14} />
          <DNAHelix tilt={compact ? 0.1 : 0.42} />
          {compact ? null : <PoreChip />}
        </Canvas>
      ) : null}
    </div>
  )
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="science" aria-labelledby="science-heading">
      <div className="science-inner">
        <div className="science-intro">
          <p className="eyebrow">The science</p>
          <h2 id="science-heading">How it works</h2>
          <p className="science-lede">
            Our solid-state nanopore reads the unique electrical signatures of cancer biomarkers
            (DNA / RNA / proteins) as they pass through a nanometer-scale pore.
          </p>
        </div>

        <div className="science-grid">
          <ol className="science-steps">
            {PROCESS_STEPS.map((step, i) => (
              <li key={step.title} className="science-step">
                <span className="science-step-num">{String(i + 1).padStart(2, '0')}</span>
                <step.Icon className="science-step-icon" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="science-visual">
            <PoreStage compact />
          </div>

          <ul className="science-points">
            {PROCESS_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function PlatformSection() {
  return (
    <section id="ecosystem" className="platform" aria-labelledby="platform-heading">
      <div className="platform-inner">
        <header className="platform-header">
          <p className="eyebrow">Our platform</p>
          <h2 id="platform-heading">An integrated ecosystem for early cancer screening</h2>
          <p>Four core products. One complete path from sensor to clinical insight.</p>
        </header>

        <div className="platform-grid">
          {PLATFORM_ITEMS.map((item) => (
            <article key={item.title} className="platform-card">
              <div className={`platform-art platform-art-${item.visual}`} aria-hidden>
                <item.Icon className="platform-art-icon" />
              </div>
              <p className="platform-kicker">{item.kicker}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchitectureSection() {
  return (
    <section id="architecture" className="arch" aria-labelledby="arch-heading">
      <div className="arch-inner">
        <header>
          <p className="eyebrow">The complete solution</p>
          <h2 id="arch-heading">Product architecture</h2>
          <p>A seamless stack of hardware, electronics, and AI — from sample to insight.</p>
        </header>

        <div className="arch-board">
          {PLATFORM_ITEMS.map((item) => (
            <div key={item.title} className="arch-node">
              <item.Icon className="arch-node-icon" />
              <p>{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StandsApartSection() {
  return (
    <section id="impact" className="apart" aria-labelledby="apart-heading">
      <div className="apart-inner">
        <header>
          <p className="eyebrow">Why us</p>
          <h2 id="apart-heading">Why our platform stands apart</h2>
        </header>
        <div className="apart-grid">
          {STANDS_APART.map((item) => (
            <article key={item.title} className="apart-card">
              <item.Icon className="apart-icon" />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <aside className="apart-panel">
          <p className="apart-panel-kicker">Liquid biopsy. Real-time answers.</p>
          <p>A compact clinic-ready stack that reads what matters most — molecule by molecule.</p>
        </aside>
      </div>
    </section>
  )
}

function RoadmapSection() {
  return (
    <section id="roadmap" className="roadmap" aria-labelledby="roadmap-heading">
      <div className="roadmap-inner">
        <header>
          <p className="eyebrow">Our roadmap</p>
          <h2 id="roadmap-heading">Development roadmap</h2>
          <p>From R&amp;D to real-world impact — in a focused, phased approach.</p>
        </header>
        <ol className="roadmap-list">
          {ROADMAP.map((item) => (
            <li key={item.num} className="roadmap-item">
              <span>{item.num}</span>
              <h3>{item.title}</h3>
              <ul>
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="about" aria-labelledby="about-heading">
      <div className="about-inner">
        <div>
          <p className="eyebrow">Mission</p>
          <h2 id="about-heading">To democratize genetic insights for a healthier world.</h2>
        </div>
        <p>
          We are building India’s first solid-state nanopore platform for cancer screening —
          combining chip technology, intelligent software, and affordable diagnostics to make
          earlier detection accessible.
        </p>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section id="trust" className="trust" aria-labelledby="trust-heading">
      <div className="trust-inner">
        <header className="trust-header">
          <p className="eyebrow">Network of Trust</p>
          <h2 id="trust-heading">Backed by leading research and innovation hubs</h2>
        </header>
        <ul className="trust-grid">
          {TRUST_PARTNERS.map((partner) => (
            <li key={partner.name} className="trust-item">
              <div className="trust-logo">
                <img src={partner.src} alt={partner.name} loading="lazy" decoding="async" />
              </div>
              <p className="trust-name">{partner.name}</p>
              <p className="trust-role">{partner.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function TeamSection() {
  return (
    <section id="team" className="team" aria-labelledby="team-heading">
      <div className="team-inner">
        <header className="team-header">
          <div>
            <p className="eyebrow">The Team</p>
            <h2 id="team-heading">
              The minds behind <span>the innovation.</span>
            </h2>
          </div>
          <p className="team-lede">
            Quantum physics, semiconductor engineering, and clinical oncology — together to redefine diagnostics.
          </p>
        </header>
        <ul className="team-grid">
          {TEAM_MEMBERS.map((member) => (
            <li key={member.name}>
              <article className="team-card">
                <div className="team-card-photo">
                  <img src={member.src} alt={member.name} loading="lazy" decoding="async" />
                </div>
                <p className="team-card-name">{member.name}</p>
                <p className="team-card-role">{member.role}</p>
                <p className="team-card-bio">{member.bio}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer id="contact" className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-cta">
          <h2>
            Let’s solve
            <br />
            <span>cancer together.</span>
          </h2>
          <p>Want to learn more or partner with us? We’d love to hear from you.</p>
        </div>
        <div className="site-footer-grid">
          <div>
            <p className="site-footer-label">Email us</p>
            <a href="mailto:contact@aagamiseq.com">contact@aagamiseq.com</a>
          </div>
          <div>
            <p className="site-footer-label">Headquarters</p>
            <p>
              INCeNSE Office, CeNSE, IISc,
              <br />
              Bengaluru, Karnataka 560012
            </p>
          </div>
        </div>
        <div className="site-footer-bottom">
          <p>© 2026 AagamiSEQ Technologies. All rights reserved.</p>
          <p>
            Website crafted by{' '}
            <a href="https://imaad6.vercel.app" target="_blank" rel="noopener noreferrer">
              Imaad
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
