import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  ArtArchitecture,
  ArtBody,
  ArtChip,
  ArtDevice,
  ArtHelixStrip,
  ArtLaptop,
  ArtVials,
  IconBrain,
  IconDrop,
  IconGridPore,
  IconWave,
} from './art'
import { QUALITY, useInView } from './perf'

const GEO_TIP = new THREE.SphereGeometry(1, 12, 12)

const NAV_LINKS = [
  { id: 'hero', label: 'Home' },
  { id: 'how-it-works', label: 'Technology' },
  { id: 'ecosystem', label: 'Platform' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
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
      <MissionSection />
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
        <a
          className="site-nav-cta"
          href="#contact"
          onClick={(e) => {
            e.preventDefault()
            go('contact')
          }}>
          Partner With Us
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
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" className="site-nav-drawer-link" tabIndex={open ? 0 : -1} onClick={() => go(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section id="hero" className="hero">
      <div className="hero-shell">
        <div className="hero-copy">
          <p className="hero-kicker">Solid-state nanopore platform</p>
          <h1>
            From Molecules
            <br />
            to <em>Answers.</em>
          </h1>
          <p className="hero-lede">
            Building an affordable molecular diagnostics platform for earlier cancer detection.
          </p>
          <a
            className="btn-cyan"
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault()
              scrollToId('how-it-works')
            }}>
            Our Technology
            <span aria-hidden>→</span>
          </a>
          <ul className="hero-chips">
            <li>Earlier Detection</li>
            <li>Affordable</li>
            <li>Accessible Labs</li>
            <li>Healthier Tomorrow</li>
          </ul>
        </div>
        <div className="hero-visual">
          <PoreStage />
          <aside className="hero-callout">
            Detecting cancer biomarkers in single-molecule time.
          </aside>
        </div>
      </div>
    </section>
  )
}

function DNAHelix() {
  const group = useRef()
  const { strandA, strandB, pairs, sugarsA, sugarsB, tubular } = useMemo(() => {
    const count = QUALITY.dnaCount
    const height = 10.4
    const radius = 1.08
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
      const ax = Math.cos(t) * radius
      const az = Math.sin(t) * radius
      const bx = Math.cos(t + Math.PI) * radius
      const bz = Math.sin(t + Math.PI) * radius
      pointsA.push(new THREE.Vector3(ax, y, az))
      pointsB.push(new THREE.Vector3(bx, y, bz))
      if (QUALITY.dnaSugars) {
        sugarsA.push([ax * 0.92, y, az * 0.92])
        sugarsB.push([bx * 0.92, y, bz * 0.92])
      }
      const dx = bx - ax
      const dz = bz - az
      pairData.push({
        mx: (ax + bx) * 0.5,
        y,
        mz: (az + bz) * 0.5,
        len: Math.hypot(dx, dz),
        angle: Math.atan2(dz, dx),
      })
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
    if (group.current) group.current.rotation.y += delta * 0.16
  })

  return (
    <group ref={group} rotation={[0.12, 0.55, 0.18]} position={[0.4, 0.15, 0]}>
      <mesh>
        <tubeGeometry args={[strandA, tubular[0], 0.09, tubular[1], false]} />
        <meshStandardMaterial color="#4CC9F0" metalness={0.25} roughness={0.22} />
      </mesh>
      <mesh>
        <tubeGeometry args={[strandB, tubular[0], 0.09, tubular[1], false]} />
        <meshStandardMaterial color="#F15BB5" metalness={0.25} roughness={0.22} />
      </mesh>
      {sugarsA.map((pos, i) => (
        <mesh key={`a-${i}`} position={pos} scale={0.1} geometry={GEO_TIP}>
          <meshStandardMaterial color="#4CC9F0" />
        </mesh>
      ))}
      {sugarsB.map((pos, i) => (
        <mesh key={`b-${i}`} position={pos} scale={0.1} geometry={GEO_TIP}>
          <meshStandardMaterial color="#F15BB5" />
        </mesh>
      ))}
      {pairs.map((p, i) => (
        <mesh key={i} position={[p.mx, p.y, p.mz]} rotation={[0, -p.angle, Math.PI / 2]}>
          <capsuleGeometry args={[0.055, p.len * 0.55, 4, 8]} />
          <meshStandardMaterial color={i % 2 ? '#7ad3f2' : '#ff8cc8'} />
        </mesh>
      ))}
    </group>
  )
}

function PoreChip() {
  return (
    <group rotation={[-1.05, 0.42, 0.22]} position={[0.55, -0.35, 0.35]}>
      <mesh>
        <ringGeometry args={[0.7, 2.7, 4, 1]} />
        <meshStandardMaterial color="#9ad8f8" metalness={0.62} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <ringGeometry args={[0.7, 2.7, 4, 1]} />
        <meshStandardMaterial color="#163a63" metalness={0.4} roughness={0.32} />
      </mesh>
    </group>
  )
}

function PoreStage() {
  const wrap = useRef(null)
  const near = useInView(wrap, { rootMargin: '30% 0px', initial: true })
  return (
    <div ref={wrap} className="pore-stage" aria-hidden>
      {near ? (
        <Canvas
          frameloop="always"
          dpr={QUALITY.dpr}
          camera={{ position: [2.1, 1.15, 8.4], fov: 34, near: 0.1, far: 40 }}
          gl={{ antialias: QUALITY.antialias, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
          <ambientLight intensity={0.62} color="#d5ecff" />
          <directionalLight position={[6, 8, 5]} intensity={1.25} color="#ffffff" />
          <pointLight position={[-2, 2, 4]} intensity={1.1} color="#00BBF9" distance={18} />
          <pointLight position={[3, -1, 2]} intensity={0.7} color="#F15BB5" distance={16} />
          <DNAHelix />
          <PoreChip />
        </Canvas>
      ) : null}
    </div>
  )
}

function HowItWorksSection() {
  const steps = [
    { title: 'Sample', Icon: IconDrop },
    { title: 'Nanopore sensing', Icon: IconGridPore },
    { title: 'Electrical signal', Icon: IconWave },
    { title: 'AI analysis', Icon: IconBrain },
  ]
  const points = [
    'Single-molecule sensitivity',
    'Label-free & real-time',
    'Detects ssDNA / RNA / biomarkers',
    'High accuracy with AI',
  ]

  return (
    <section id="how-it-works" className="science">
      <div className="wrap science-wrap">
        <div className="science-left">
          <p className="eyebrow">The science</p>
          <h2>How It Works</h2>
          <p>
            Our solid-state nanopore senses the unique electrical signatures of cancer biomarkers (DNA/RNA) as they
            pass through a nanometer-scale pore.
          </p>
          <a
            className="btn-cyan"
            href="#ecosystem"
            onClick={(e) => {
              e.preventDefault()
              scrollToId('ecosystem')
            }}>
            Learn More
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="science-mid">
          <div className="science-steps">
            {steps.map((step) => (
              <div key={step.title} className="science-step">
                <step.Icon />
                <p>{step.title}</p>
              </div>
            ))}
          </div>
          <ArtHelixStrip className="science-helix" />
        </div>
        <ul className="science-points">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PlatformSection() {
  const items = [
    {
      title: 'Solid-State Nanopore Chips',
      body: 'Engineered for high sensitivity, durability and scale.',
      Art: ArtChip,
    },
    {
      title: 'Readout System',
      body: 'Custom electronics for high-speed, high-resolution signal acquisition.',
      Art: ArtDevice,
    },
    {
      title: 'AI Analysis Software',
      body: 'Turns raw signals into actionable insights with real-time scoring.',
      Art: ArtLaptop,
    },
    {
      title: 'Reagents & Consumables',
      body: 'Optimized for performance, consistency and cost-effectiveness.',
      Art: ArtVials,
    },
  ]

  return (
    <section id="ecosystem" className="platform">
      <div className="wrap">
        <p className="eyebrow light">Our platform</p>
        <h2>An Integrated Ecosystem for Early Cancer Screening</h2>
        <p className="lede-light">
          Four core products. One powerful platform. Designed for affordability, scalability and local discovery use.
        </p>
        <div className="platform-grid">
          {items.map((item) => (
            <article key={item.title}>
              <item.Art className="platform-art" />
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
    <section className="arch">
      <div className="wrap arch-wrap">
        <div>
          <p className="eyebrow">The complete solution</p>
          <h2>Product Architecture</h2>
          <p>A seamless integration of hardware, electronics and AI — from sample to insight.</p>
          <a
            className="btn-cyan"
            href="#ecosystem"
            onClick={(e) => {
              e.preventDefault()
              scrollToId('ecosystem')
            }}>
            Explore the Platform
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="arch-visual">
          <ArtArchitecture className="arch-svg" />
          <span className="arch-label arch-label-a">Readout System &amp; Electronics</span>
          <span className="arch-label arch-label-b">AI Analysis Software</span>
          <span className="arch-label arch-label-c">Nanopore Chip Cartridge</span>
          <span className="arch-label arch-label-d">Reagents &amp; Consumables</span>
        </div>
      </div>
    </section>
  )
}

function StandsApartSection() {
  const items = [
    { title: 'Ultrasensitive', body: 'Detects low-abundance cancer biomarkers.' },
    { title: 'Affordable', body: 'Designed for India-first and global markets.' },
    { title: 'Portable & scalable', body: 'From clinics to regional diagnostics.' },
    { title: 'Sustainable', body: 'Enables early treatment and better outcomes.' },
  ]
  return (
    <section id="impact" className="apart">
      <div className="wrap apart-wrap">
        <div>
          <p className="eyebrow">Why us</p>
          <h2>Why Our Platform Stands Apart</h2>
          <div className="apart-grid">
            {items.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="apart-panel">
          <ArtBody className="apart-art" />
          <div>
            <h3>Liquid biopsy. Real-time answers.</h3>
            <p>A compact clinic-ready system that reads what matters most.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function RoadmapSection() {
  const items = [
    {
      num: '1',
      title: 'Chip Engineering',
      points: ['Pore geometry', 'Membrane durability (SiN/2D)', 'Electrical characterization'],
    },
    {
      num: '2',
      title: 'Readout Integration',
      points: ['Current electronics', 'Noise reduction', 'Signal acquisition'],
    },
    {
      num: '3',
      title: 'Assay + AI Development',
      points: ['Sample workflow', 'Signature software', 'Data validation'],
    },
    {
      num: '4',
      title: 'Validation & Scale-up',
      points: ['Analytical validation', 'Pilot manufacturing', 'Clinic partnerships'],
    },
  ]
  return (
    <section id="roadmap" className="roadmap">
      <div className="wrap">
        <p className="eyebrow">Our roadmap</p>
        <h2>Development Roadmap</h2>
        <p className="lede">From R&amp;D to real-world impact — in a focused, phased approach.</p>
        <ol className="roadmap-list">
          {items.map((item) => (
            <li key={item.num}>
              <i aria-hidden />
              <strong>
                {item.num}. {item.title}
              </strong>
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

function MissionSection() {
  return (
    <section id="about" className="mission">
      <div className="wrap mission-wrap">
        <h2>To democratize genetic insights for a healthier world.</h2>
        <p>
          We are building India’s first solid-state nanopore platform for cancer screening — combining cutting-edge
          technology, intelligent software and affordable diagnostics to make earlier detection accessible.
        </p>
      </div>
    </section>
  )
}

const TRUST_PARTNERS = [
  { name: 'C-CAMP', role: 'Life Sciences Innovation Hub', src: '/partners/ccamp.jpg' },
  { name: 'MeitY Startup Hub', role: 'Government Innovation Support', src: '/partners/meity.png' },
  { name: 'SID-IISc', role: 'Technology Transfer & Incubation', src: '/partners/sid-iisc.jpg' },
  { name: 'INCENSE', role: 'Deep Tech Incubator', src: '/partners/incense.png' },
]

function TrustSection() {
  return (
    <section id="trust" className="trust">
      <div className="wrap">
        <p className="eyebrow">Network of Trust</p>
        <h2>Backed by leading research and innovation hubs</h2>
        <ul className="logo-grid">
          {TRUST_PARTNERS.map((partner) => (
            <li key={partner.name}>
              <img src={partner.src} alt={partner.name} />
              <p>{partner.name}</p>
              <span>{partner.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const TEAM_MEMBERS = [
  { name: 'Prof. Manoj Varma', role: 'Founder | R&D Advisor', src: '/team/manoj.jpg' },
  { name: 'Divya Mohan Yadav, PhD', role: 'Founder | CEO', src: '/team/divya.jpg' },
  { name: 'Muddukrishna P', role: 'Founder | CPO', src: '/team/muddu.jpeg' },
  { name: 'Anumol Dominic, PhD', role: 'Lead Fabrication Engg', src: '/team/anumol.jpeg' },
]

function TeamSection() {
  return (
    <section id="team" className="team">
      <div className="wrap">
        <p className="eyebrow">The Team</p>
        <h2>The minds behind the innovation.</h2>
        <ul className="logo-grid team-grid">
          {TEAM_MEMBERS.map((member) => (
            <li key={member.name}>
              <img src={member.src} alt={member.name} />
              <p>{member.name}</p>
              <span>{member.role}</span>
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
      <div className="wrap footer-wrap">
        <div>
          <img src="/aagamiseq-logo.png" alt="" className="footer-logo" />
          <p>AagamiSEQ · Nanopore Diagnostics</p>
        </div>
        <div>
          <p className="footer-label">Get in Touch</p>
          <a href="mailto:contact@aagamiseq.com">contact@aagamiseq.com</a>
          <p>
            INCeNSE Office, CeNSE, IISc
            <br />
            Bengaluru, Karnataka 560012
          </p>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <p>© 2026 AagamiSEQ Technologies. All rights reserved.</p>
        <p>
          Website by{' '}
          <a href="https://imaad6.vercel.app" target="_blank" rel="noopener noreferrer">
            Imaad
          </a>
        </p>
      </div>
    </footer>
  )
}
