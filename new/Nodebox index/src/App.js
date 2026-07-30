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
const poreScale = new THREE.Vector3(1, 1, 1)
const _up = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _fogA = new THREE.Color('#061820')
const _fogB = new THREE.Color('#0a2438')
const _fogC = new THREE.Color('#0c2a28')
const _fogNow = new THREE.Color()

// ── palette ────────────────────────────────────────────────────────────────
const C = {
  steel: '#6a7f88',
  slate: '#4a5c66',
  bone: '#c5cfc8',
  teal: '#3d7a74',
  deepTeal: '#2a5552',
  ice: '#8aa4ae',
  mutedBlue: '#4a6a82',
  graphite: '#3a4248',
  moss: '#5a6b4a',
  copper: '#8a6a55',
  ghost: '#9bb0b4',
}
const BOND_DARK = '#3e4a50'
const BOND_MID = '#5a6870'

// ── helpers ────────────────────────────────────────────────────────────────
const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max)
const smooth = (a, b, v) => {
  const n = clamp((v - a) / (b - a))
  return n * n * (3 - 2 * n)
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
// 0%   5%──22%    22%──36%   36%──70%   72%──84%   82%──94%
// idle  focus       poreIn   threading   poreOut    brand
const BEATS = {
  focusStart: 0.05,
  focusEnd: 0.22,
  poreInStart: 0.22,
  poreInEnd: 0.36,
  transitStart: 0.36,
  transitEnd: 0.70,
  clearStart: 0.58,
  clearEnd: 0.78,
  poreOutStart: 0.72,
  poreOutEnd: 0.84,
  brandStart: 0.82,
  brandEnd: 0.94,
}

const progressApi = { current: 0, target: 0 }

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
  { metalness: 0.55, roughness: 0.35, opacity: 1, emissiveIntensity: 0.08 },
  { metalness: 0.15, roughness: 0.55, opacity: 1, emissiveIntensity: 0.05 },
  { metalness: 0.3, roughness: 0.2, opacity: 0.55, emissiveIntensity: 0.12 },
  { metalness: 0.7, roughness: 0.18, opacity: 0.92, emissiveIntensity: 0.15 },
  { metalness: 0.05, roughness: 0.7, opacity: 0.4, emissiveIntensity: 0.2 },
]

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [ui, setUi] = useState({ brand: 0 })

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      progressApi.target = scrollable > 0 ? clamp(window.scrollY / scrollable) : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    let raf = 0
    let lastKey = -1
    const tick = () => {
      progressApi.current = lerp(progressApi.current, progressApi.target, 0.085)
      const brand = smooth(BEATS.brandStart, BEATS.brandEnd, progressApi.current)
      const key = Math.round(brand * 100)
      if (key !== lastKey) {
        lastKey = key
        setUi({ brand })
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
    <main className="experience-shell">
      <div className="gradient-wash" aria-hidden />
      <div className="grain-overlay" aria-hidden />

      <div className="canvas-stage">
        <div className="canvas-grain" aria-hidden />
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 12], fov: 36, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.92
          }}>
          <Atmosphere />
          <ambientLight intensity={0.4} color="#8a9aa0" />
          <directionalLight position={[6, 10, 4]} intensity={1.4} color="#e8eee8" />
          <directionalLight position={[-5, 2, -4]} intensity={0.5} color="#4a6a78" />
          <pointLight position={[0, 0, 6]} intensity={0.6} color="#6a9088" distance={30} />

          <CameraRig />
          <Starfield />
          <FieldMolecules />
          <HeroSphere />
          <Nanopore />
        </Canvas>

        <div className="brand-reveal" style={{ opacity: ui.brand }}>
          <div className="brand-name">
            AAGAMI
            <span>
              SE
              <span className="brand-q">
                Q
                <i className="brand-q-dot" aria-hidden />
              </span>
            </span>
          </div>
          <p className="brand-tagline">Clarity in the fight against cancer</p>
        </div>
      </div>
      <div className="scroll-space" aria-hidden />
    </main>
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

  return <fog ref={fogRef} attach="fog" args={['#061820', 16, 38]} />
}

// ── CameraRig ──────────────────────────────────────────────────────────────
// Phase 0 (idle):    slightly elevated, looking at helix centre
// Phase 1 (focus):   pull in, tilt to see helix entering pore from side
// Phase 2 (transit): hold side-on view tracking the threading
// Phase 3 (brand):   zoom back out, helix recedes, brand appears
function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const p = progressApi.current
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)

    // Camera moves from front-centre → slight right + closer for threading view
    const camX = lerp(0, 1.8, focus) * (1 - brand)
    const camY = lerp(0.5, 0.2, focus) * (1 - brand * 0.6)
    const camZ = lerp(12, 9.5, focus) * lerp(1, 1.08, brand)

    cameraTarget.set(camX, camY, camZ)
    // Look at the pore (y=0) during transit, drift up for brand
    lookAtTarget.set(0, lerp(0.5, 0, focus) * (1 - transit * 0.6) + brand * 0.8, 0)

    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 3.2))
    camera.lookAt(lookAtTarget)
    camera.fov = lerp(36, 32, focus)
    camera.updateProjectionMatrix()
  })

  return null
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
const COUNT = 32  // fewer molecules → easier to separate cleanly

function FieldMolecules() {
  const fadeRef = useRef(1)

  // current world-space XZ positions for every molecule — written each frame
  // by HoverMolecule, then the separation pass reads + adjusts them
  const posXZ = useRef(null)  // Float32Array [x0,z0, x1,z1, ...]
  const posY  = useRef(null)  // Float32Array [y0, y1, ...]

  const layout = useMemo(() => {
    posXZ.current = new Float32Array(COUNT * 2)
    posY.current  = new Float32Array(COUNT)
    const items = []
    for (let i = 0; i < COUNT; i += 1) {
      const scale = 0.28 + seededRandom(i + 51) * 0.38  // smaller range, no giants
      const structure = Math.floor(seededRandom(i + 99) * STRUCTURES.length)
      const coreR = STRUCTURES[structure].coreR
      const boundR = (coreR + 0.45) * scale
      items.push({
        base: [
          (seededRandom(i + 2) - 0.5) * 13,   // tighter X spread — no edge clipping
          -1.5 + seededRandom(i + 19) * 5,    // bias downward, away from hero
          -1 + (seededRandom(i + 37) - 0.5) * 8, // push back in Z
        ],
        scale,
        drift: 0.18 + seededRandom(i + 67) * 0.44,
        phase: seededRandom(i + 83) * Math.PI * 2,
        structure,
        matPreset: Math.floor(seededRandom(i + 111) * MAT_PRESETS.length),
        boundR,
        idx: i,
      })
    }
    return items
  }, [])

  useFrame((_state) => {  // priority omitted = 0; HoverMolecule uses priority -1 to run first
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
            px[a * 2]     += nx
            px[a * 2 + 1] += nz
            px[b * 2]     -= nx
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
  // glowAmt lerps 0→1 on hover, stays where it lands on mouse-out
  const glowAmt = useRef(0)
  // sway: permanent displacement that accumulates — never springs back
  const swayX = useRef(0)
  const swayZ = useRef(0)
  // velocity for organic drift after hover
  const velX = useRef(0)
  const velZ = useRef(0)
  // per-molecule kick direction
  const swayAngle = useMemo(
    () => seededRandom(item.base[0] * 31.7 + item.base[2] * 17.3) * Math.PI * 2,
    [item.base]
  )
  const glowSeeded = useRef(false)
  const wasHovered = useRef(false)

  // Priority 1 — writes posXZ first, then FieldMolecules (priority 2) separates
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

    // ── glow ─────────────────────────────────────────────────────────
    if (isHov) glowAmt.current = Math.min(1, glowAmt.current + delta * 4)

    // ── sway impulse on fresh hover ───────────────────────────────────
    if (isHov && !wasHovered.current) {
      velX.current += Math.cos(swayAngle) * 1.4
      velZ.current += Math.sin(swayAngle) * 1.4
    }
    wasHovered.current = isHov

    // Integrate velocity — near-zero drag so it feels floaty
    const drag = Math.pow(0.012, delta)
    velX.current *= drag
    velZ.current *= drag
    swayX.current += velX.current * delta
    swayZ.current += velZ.current * delta

    // Soft boundary
    const sdist = Math.hypot(swayX.current, swayZ.current)
    if (sdist > 2.5) {
      const pull = (sdist - 2.5) * 0.4 * delta
      swayX.current -= (swayX.current / sdist) * pull
      swayZ.current -= (swayZ.current / sdist) * pull
    }

    // ── Step 1: write this molecule's orbital XZ into shared buffer ───
    const orbX = item.base[0] + Math.cos(t * item.drift * 0.65 + item.phase) * 0.3 + swayX.current
    const orbZ = item.base[2] + Math.sin(t * item.drift * 0.5 + item.phase) * 0.25 + swayZ.current
    if (posXZ.current) {
      posXZ.current[idx * 2]     = orbX
      posXZ.current[idx * 2 + 1] = orbZ
    }

    // ── Step 2 (after separation pass): read back adjusted XZ ─────────
    // On this same frame FieldMolecules hasn't run yet (priority 2),
    // so we use last frame's separated value — one frame lag, imperceptible.
    const finalX = posXZ.current ? posXZ.current[idx * 2]     : orbX
    const finalZ = posXZ.current ? posXZ.current[idx * 2 + 1] : orbZ

    // ── position + rotation + scale ──────────────────────────────────
    group.current.position.set(
      finalX,
      item.base[1] + Math.sin(t * item.drift + item.phase) * 0.22,
      finalZ,
    )
    group.current.rotation.x = t * 0.04 * item.drift
    group.current.rotation.y = t * 0.08 * item.drift + item.phase
    group.current.scale.setScalar(item.scale * (0.5 + fade * 0.5))

    // ── glow ─────────────────────────────────────────────────────────
    group.current.traverse((obj) => {
      if (!obj.isMesh || obj.material?.emissiveIntensity == null) return
      if (!glowSeeded.current) obj.userData.baseE = obj.material.emissiveIntensity
      obj.material.emissiveIntensity = (obj.userData.baseE ?? 0) + glowAmt.current * 0.12
    })
    if (!glowSeeded.current) glowSeeded.current = true
  }, -1)  // priority -1 = runs before everything else including FieldMolecules (0)

  return (
    <group
      ref={group}
      onPointerOver={(e) => { e.stopPropagation(); hovered.current = true }}
      onPointerOut={() => { hovered.current = false }}>
      <StructureMesh structureIndex={item.structure} matPreset={item.matPreset} />
    </group>
  )
}

// ── HeroSphere — the star; threads downward through the nanopore ───────────
const heroTarget = new THREE.Vector3()

function HeroSphere() {
  const mesh = useRef()
  const mat = useRef()

  useFrame((state, delta) => {
    if (!mesh.current || !mat.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const focus   = smooth(BEATS.focusStart,   BEATS.focusEnd,   p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand   = smooth(BEATS.brandStart,   BEATS.brandEnd,   p)

    if (p < BEATS.transitStart) {
      heroTarget.set(
        lerp(1.2, 0, focus) + Math.sin(t * 0.35) * 0.06 * (1 - focus),
        lerp(1.2, 1.6, focus) + Math.cos(t * 0.42) * 0.05 * (1 - focus),
        lerp(0.5, 0.1, focus),
      )
    } else if (p < BEATS.poreOutEnd) {
      heroTarget.set(
        Math.sin(t * 0.18) * 0.06,               // tiny wobble left-right while threading
        lerp(1.6, -3.0, transit),
        0.05,
      )
    } else {
      heroTarget.set(
        lerp(0, 1.4, brand) + Math.sin(t * 0.28) * 0.04,
        lerp(-3.0, 0.1, brand) + Math.cos(t * 0.22) * 0.03,
        lerp(0.05, 0.2, brand),
      )
    }

    mesh.current.position.lerp(heroTarget, 1 - Math.exp(-delta * 4.5))

    // Continuous self-rotation — never stops
    mesh.current.rotation.x += delta * 0.22
    mesh.current.rotation.y += delta * 0.31

    const size = lerp(0.28, 0.48, focus) * lerp(1, 0.82, transit * 0.4) * lerp(1, 0.22, brand)
    mesh.current.scale.setScalar(size)

    // emissive pulses always, stronger near pore
    mat.current.emissiveIntensity = 0.14 + focus * 0.32 + Math.sin(t * 2.4) * 0.05
  })

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial
        ref={mat}
        color="#3d7a74"
        emissive="#1e4a46"
        emissiveIntensity={0.18}
        metalness={0.55}
        roughness={0.28}
      />
    </mesh>
  )
}

// ── Nanopore ───────────────────────────────────────────────────────────────
// Clean flat membrane with a pore hole. Rises from below as hero descends.
// Just: membrane sheet (ring), tight glowing rim, scattered protein bumps.
function Nanopore() {
  const group = useRef()
  const sheetMat = useRef()
  const rimMat = useRef()
  const nodeMatRefs = useRef([])

  const nodes = useMemo(() => {
    const list = []
    for (let i = 0; i < 52; i++) {
      const a = seededRandom(i * 3 + 1) * Math.PI * 2
      const r = 1.3 + seededRandom(i * 3 + 2) * 4.0
      list.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        r: 0.035 + seededRandom(i * 3 + 3) * 0.055,
        color: seededRandom(i) > 0.5 ? C.steel : C.slate,
      })
    }
    return list
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime

    const fadeIn  = smooth(BEATS.poreInStart, BEATS.poreInEnd, p)
    const fadeOut = smooth(BEATS.poreOutStart, BEATS.poreOutEnd, p)
    const vis = fadeIn * (1 - fadeOut)

    group.current.visible = vis > 0.004

    // Rise from below — membrane climbs up from Y=-10 to Y=0
    group.current.position.y = lerp(-10, 0, fadeIn) * (1 - fadeOut) + fadeOut * -10

    // Slow pulse on XZ scale
    const pulse = 1 + Math.sin(t * 1.4) * 0.005
    group.current.scale.set(pulse, 1, pulse)

    if (sheetMat.current) { sheetMat.current.opacity = vis * 0.78; sheetMat.current.needsUpdate = true }
    if (rimMat.current)   { rimMat.current.opacity   = vis * 0.95; rimMat.current.needsUpdate   = true }
    nodeMatRefs.current.forEach(m => { if (m) { m.opacity = vis; m.needsUpdate = true } })
  })

  return (
    <group ref={group}>
      {/* Flat membrane — ring with pore hole at centre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.08, 6.2, 128]} />
        <meshStandardMaterial
          ref={sheetMat}
          color="#2a4450"
          emissive="#0c1e28"
          emissiveIntensity={0.22}
          metalness={0.42}
          roughness={0.58}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing inner rim — marks the pore opening */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.02, 1.22, 96]} />
        <meshStandardMaterial
          ref={rimMat}
          color="#5a9a90"
          emissive="#2a6a62"
          emissiveIntensity={0.85}
          metalness={0.5}
          roughness={0.25}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Scattered protein bumps on membrane surface */}
      {nodes.map((n, i) => (
        <mesh
          key={i}
          position={[n.x, 0.012, n.z]}
          ref={el => { if (el) nodeMatRefs.current[i] = el.material }}
        >
          <sphereGeometry args={[n.r, 7, 7]} />
          <meshStandardMaterial
            color={n.color}
            emissive={n.color}
            emissiveIntensity={0.06}
            metalness={0.38}
            roughness={0.55}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Starfield ──────────────────────────────────────────────────────────────
function Starfield() {
  const points = useRef()
  const data = useRef(null)
  if (!data.current) {
    const count = 1800  // more particles
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const o = i * 3
      positions[o] = (seededRandom(i + 1) - 0.5) * 44
      positions[o + 1] = seededRandom(i + 2) * 20 - 7
      positions[o + 2] = (seededRandom(i + 3) - 0.5) * 32 - 4
      seeds[i] = seededRandom(i + 4)
      const shade = 0.5 + seeds[i] * 0.5
      const tone = seededRandom(i + 5)
      if (tone < 0.55) {
        // cool white / steel blue
        colors[o]     = shade * 0.82
        colors[o + 1] = shade * 0.88
        colors[o + 2] = shade
      } else if (tone < 0.78) {
        // gold / amber
        colors[o]     = shade * 1.0
        colors[o + 1] = shade * 0.78
        colors[o + 2] = shade * 0.15
      } else {
        // muted green / teal
        colors[o]     = shade * 0.28
        colors[o + 1] = shade * 0.82
        colors[o + 2] = shade * 0.52
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    data.current = { geometry, seeds, count }
  }

  useFrame((state) => {
    if (!points.current || !data.current) return
    const p = progressApi.current
    const clear = smooth(BEATS.clearStart, BEATS.clearEnd, p)
    const t = state.clock.elapsedTime
    const positions = data.current.geometry.attributes.position.array
    const { seeds, count } = data.current

    for (let i = 0; i < count; i += 1) {
      const o = i * 3
      positions[o] += 0.0004 + seeds[i] * 0.0007
      positions[o + 1] += Math.sin(t * 0.08 + seeds[i] * 12) * 0.00035
      if (positions[o] > 20) positions[o] = -20
    }
    data.current.geometry.attributes.position.needsUpdate = true
    points.current.material.opacity = 0.55 * (1 - clear * 0.65) + 0.12
  })

  return (
    <points ref={points} geometry={data.current.geometry}>
      <pointsMaterial
        vertexColors
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
