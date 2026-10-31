import { useEffect, useRef, useState } from 'react'
import { useInView } from './perf'

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

function useReveal(initial = false) {
  const ref = useRef(null)
  const inView = useInView(ref, { rootMargin: '-8% 0px', initial })
  const [shown, setShown] = useState(initial)
  useEffect(() => {
    if (inView) setShown(true)
  }, [inView])
  return [ref, shown]
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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.55)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
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
  const [ref, inView] = useReveal(true)
  return (
    <section id="hero" ref={ref} className={`hero panel${inView ? ' is-in' : ''}`}>
      <div className="wrap hero-shell reveal-content">
        <div className="hero-copy">
          <p className="hero-kicker">Solid-state nanopore platform</p>
          <h1>
            From Molecules
            <br />
            to Answers.
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
            <li>
              <span className="hero-chip-icon" aria-hidden />
              Earlier Detection
            </li>
            <li>
              <span className="hero-chip-icon" aria-hidden />
              Affordable
            </li>
            <li>
              <span className="hero-chip-icon" aria-hidden />
              Accessible Labs
            </li>
            <li>
              <span className="hero-chip-icon" aria-hidden />
              Healthier Tomorrow
            </li>
          </ul>
        </div>
        <div className="hero-visual">
          <img src="/products/hero.jpg" alt="DNA strand passing through a solid-state nanopore" decoding="async" />
          <aside className="hero-callout">Detecting cancer biomarkers</aside>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const [ref, inView] = useReveal()
  const steps = [
    { title: 'Sample', note: 'blood / urine' },
    { title: 'Nanopore sensing', note: '' },
    { title: 'Electrical signal', note: '' },
    { title: 'AI analysis', note: '' },
  ]
  const points = [
    'Single-molecule sensitivity',
    'Label-free & real-time',
    'Detects ctDNA / RNA biomarkers',
    'High accuracy with AI',
  ]

  return (
    <section id="how-it-works" ref={ref} className={`science panel${inView ? ' is-in' : ''}`}>
      <div className="wrap science-wrap reveal-content">
        <div className="science-left">
          <p className="eyebrow">The science</p>
          <h2>How It Works</h2>
          <p className="lede">
            Our solid-state nanopore senses the unique electrical signatures of cancer biomarkers (ctDNA/RNA) as they
            pass through a nanometer-scale pore.
          </p>
          <a
            className="btn-navy"
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
            {steps.map((step, i) => (
              <div key={step.title} className="science-step">
                <span className={`science-step-icon step-${i + 1}`} aria-hidden />
                <p>
                  {step.title}
                  {step.note ? <small>{step.note}</small> : null}
                </p>
              </div>
            ))}
          </div>
          <img className="science-helix" src="/products/science.jpg" alt="Nanopore membrane with DNA passing through" decoding="async" />
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
      body: 'Engineered for high sensitivity, reliability and scale.',
      src: '/products/chip.jpg',
    },
    {
      title: 'Readout System',
      body: 'Custom electronics for high-speed, high-resolution signal acquisition.',
      src: '/products/device.jpg',
    },
    {
      title: 'AI Analysis Software',
      body: 'Turns raw signals into actionable insights with machine learning.',
      src: '/products/laptop.jpg',
    },
    {
      title: 'Reagents & Consumables',
      body: 'Optimized for performance, consistency and cost-effectiveness.',
      src: '/products/vials.jpg',
    },
  ]

  const [ref, inView] = useReveal()
  return (
    <section id="ecosystem" ref={ref} className={`platform panel${inView ? ' is-in' : ''}`}>
      <div className="wrap reveal-content">
        <div className="section-head">
          <p className="eyebrow light">Our platform</p>
          <h2>An Integrated Ecosystem for Early Cancer Screening</h2>
          <p className="lede-light">
            Four core products. One powerful platform. Designed for affordability, scalability and local laboratory use.
          </p>
        </div>
        <div className="platform-grid">
          {items.map((item) => (
            <article key={item.title}>
              <div className="platform-art-wrap">
                <img className="platform-art" src={item.src} alt={item.title} decoding="async" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className="platform-arrow" aria-hidden>
                →
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ArchitectureSection() {
  const [ref, inView] = useReveal()
  return (
    <section ref={ref} className={`arch panel${inView ? ' is-in' : ''}`}>
      <div className="wrap arch-wrap reveal-content">
        <div className="arch-copy">
          <p className="eyebrow">The complete solution</p>
          <h2>Product Architecture</h2>
          <p>A seamless integration of hardware, chemistry and AI — from sample to insight.</p>
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
          <img className="arch-photo" src="/products/architecture.jpg" alt="Readout system, AI software, chip cartridge and reagents" decoding="async" />
          <ul className="arch-labels">
            <li>Readout System &amp; Electronics</li>
            <li>AI Analysis Software</li>
            <li>Nanopore Chip Cartridge</li>
            <li>Reagents &amp; Consumables</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function StandsApartSection() {
  const items = [
    { title: 'Ultra-sensitive', body: 'Detects low-abundance cancer biomarkers.' },
    { title: 'Affordable', body: 'Designed for India-first and global markets.' },
    { title: 'Portable & scalable', body: 'From clinics to regional diagnostics.' },
    { title: 'Sustainable', body: 'Enables early treatment and better outcomes.' },
  ]
  const [ref, inView] = useReveal()
  return (
    <section id="impact" ref={ref} className={`apart panel${inView ? ' is-in' : ''}`}>
      <div className="wrap apart-wrap reveal-content">
        <div>
          <div className="section-head">
            <p className="eyebrow">Why us</p>
            <h2>Why Our Platform Stands Apart</h2>
          </div>
          <div className="apart-grid">
            {items.map((item) => (
              <article key={item.title}>
                <span className="apart-dot" aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="apart-panel">
          <img className="apart-art" src="/products/why.jpg" alt="Liquid biopsy visualization" decoding="async" />
          <div>
            <h3>Liquid biopsy. Real-time answers.</h3>
            <p>A simple blood or urine sample could reveal what matters most.</p>
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
      time: '0–3 months',
      points: ['100 nm nanopore chip', 'Packaging & flow cell design', 'Electrical characterization'],
    },
    {
      num: '2',
      title: 'Readout Integration',
      time: '3–6 months',
      points: ['Custom electronics', 'Cartridge development', 'Signal acquisition'],
    },
    {
      num: '3',
      title: 'Assay + AI Development',
      time: '6–9 months',
      points: ['Biomarker panels', 'AI models & software', 'Data validation'],
    },
    {
      num: '4',
      title: 'Validation & Scale-up',
      time: '9–12 months',
      points: ['Analytical validation', 'Reproducibility & QC', 'Pilot manufacturing'],
    },
  ]
  const [ref, inView] = useReveal()
  return (
    <section id="roadmap" ref={ref} className={`roadmap panel${inView ? ' is-in' : ''}`}>
      <div className="wrap reveal-content">
        <div className="section-head">
          <p className="eyebrow light">Our journey</p>
          <h2>Development Roadmap</h2>
          <p className="lede-light">From R&amp;D to real-world impact — in a focused, phased approach.</p>
        </div>
        <ol className="roadmap-list">
          {items.map((item) => (
            <li key={item.num}>
              <i aria-hidden>{item.num}</i>
              <strong>{item.title}</strong>
              <span className="roadmap-time">{item.time}</span>
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
  const [ref, inView] = useReveal()
  return (
    <section id="about" ref={ref} className={`mission panel${inView ? ' is-in' : ''}`}>
      <img className="mission-bg" src="/products/mission.jpg" alt="" decoding="async" />
      <div className="wrap mission-wrap reveal-content">
        <p className="eyebrow">Our mission</p>
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

const TEAM_MEMBERS = [
  { name: 'Prof. Manoj Varma', role: 'Founder | R&D Advisor', src: '/team/manoj.jpg' },
  { name: 'Divya Mohan Yadav, PhD', role: 'Founder | CEO', src: '/team/divya.jpg' },
  { name: 'Muddukrishna P', role: 'Founder | CPO', src: '/team/muddu.jpeg' },
  { name: 'Anumol Dominic, PhD', role: 'Lead Fabrication Engg', src: '/team/anumol.jpeg' },
]

function TrustSection() {
  const [ref, inView] = useReveal()
  return (
    <section id="trust" ref={ref} className={`trust panel${inView ? ' is-in' : ''}`}>
      <div className="wrap reveal-content">
        <div className="section-head">
          <p className="eyebrow">Network of Trust</p>
          <h2>Backed by leading research and innovation hubs</h2>
        </div>
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

function TeamSection() {
  const [ref, inView] = useReveal()
  return (
    <section id="team" ref={ref} className={`team panel${inView ? ' is-in' : ''}`}>
      <div className="wrap reveal-content">
        <div className="section-head">
          <p className="eyebrow">The Team</p>
          <h2>The minds behind the innovation.</h2>
        </div>
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
          <p className="footer-tag">Early Detection. Greater Possibilities.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {NAV_LINKS.map((link) => (
            <button key={link.id} type="button" onClick={() => scrollToId(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>
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
