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
const _fogA = new THREE.Color('#062c30')
const _fogB = new THREE.Color('#0a3a48')
const _fogC = new THREE.Color('#0c4840')
const _fogNow = new THREE.Color()
const _cursorDir = new THREE.Vector3()
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
const lerp = THREE.MathUtils.lerp

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function bondQuat(dir) {
  _dir.set(dir[0], dir[1], dir[2]).normalize()
  return _quat.setFromUnitVectors(_up, _dir).clone()
}

// ── scroll timeline — clearer beats, less rushed ───────────────────────────
// idle → descend from top → pore reveals → thread → clear → brand
const BEATS = {
  focusStart: 0.04,
  focusEnd: 0.26,
  poreInStart: 0.18,
  poreInEnd: 0.32,
  transitStart: 0.34,
  transitEnd: 0.68,
  clearStart: 0.55,
  clearEnd: 0.74,
  poreOutStart: 0.7,
  poreOutEnd: 0.82,
  brandStart: 0.8,
  brandEnd: 0.93,
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
  { metalness: 0.5, roughness: 0.38, opacity: 1, emissiveIntensity: 0.1 },
  { metalness: 0.1, roughness: 0.58, opacity: 1, emissiveIntensity: 0.06 },
  { metalness: 0.25, roughness: 0.28, opacity: 0.55, emissiveIntensity: 0.12 },
  { metalness: 0.68, roughness: 0.22, opacity: 0.94, emissiveIntensity: 0.14 },
  { metalness: 0.04, roughness: 0.72, opacity: 0.42, emissiveIntensity: 0.16 },
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
      progressApi.current = lerp(progressApi.current, progressApi.target, 0.065)
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
      <div className="shade-vignette" aria-hidden />
      <div className="grain-coarse" aria-hidden />
      <div className="grain-overlay" aria-hidden />

      <div className="canvas-stage">
        <div className="canvas-grain" aria-hidden />
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0.3, 3.2, 11.5], fov: 36, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color('#062c30'), 1)
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.88
          }}>
          <color attach="background" args={['#062c30']} />
          <Atmosphere />
          <ambientLight intensity={0.48} color="#7ab8a8" />
          <directionalLight position={[5, 9, 4]} intensity={1.25} color="#d0f0e8" />
          <directionalLight position={[-4, 1, -3]} intensity={0.55} color="#3a8890" />
          <pointLight position={[0, 2, 5]} intensity={0.55} color="#4aa898" distance={28} />
          <CursorGlow />

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

  return <fog ref={fogRef} attach="fog" args={['#062c30', 18, 48]} />
}

// ── CameraRig — elevated side view; tracks hero descending from top ────────
function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const p = progressApi.current
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)

    const camX = lerp(0.15, 2.6, focus) * (1 - brand * 0.85)
    const camY = lerp(3.4, 1.45, focus) * lerp(1, 0.55, transit) * (1 - brand * 0.45) + brand * 0.35
    const camZ = lerp(12, 9.0, focus) * lerp(1, 1.04, brand)

    cameraTarget.set(camX, camY, camZ)
    // Follow the descent: look high early, then pore plane, then brand
    const lookY =
      lerp(2.4, 1.2, focus) * (1 - transit) +
      lerp(1.2, -0.2, transit) * (1 - brand) +
      brand * 0.4
    lookAtTarget.set(0, lookY, 0)

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
      <pointLight ref={light} color="#6ee8d8" intensity={2.4} distance={14} decay={1.7} />
      <pointLight ref={soft} color="#4ab0c8" intensity={1.2} distance={18} decay={1.5} />
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
const COUNT = 72

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
    const orbZ = item.base[2] + Math.sin(t * item.drift * 0.5 + item.phase) * 0.25 + swayZ.current
    if (posXZ.current) {
      posXZ.current[idx * 2] = orbX
      posXZ.current[idx * 2 + 1] = orbZ
    }

    const finalX = posXZ.current ? posXZ.current[idx * 2] : orbX
    const finalZ = posXZ.current ? posXZ.current[idx * 2 + 1] : orbZ

    let y = item.base[1] + Math.sin(t * item.drift + item.phase) * 0.22 + swayY.current

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

    const x = posXZ.current ? posXZ.current[idx * 2] : finalX
    const z = posXZ.current ? posXZ.current[idx * 2 + 1] : finalZ

    group.current.position.set(x, y, z)
    // Continuous tumble on own axes (not camera-locked)
    group.current.rotation.x += item.spinX * delta
    group.current.rotation.y += item.spinY * delta
    group.current.rotation.z += item.spinZ * delta
    group.current.scale.setScalar(item.scale * (0.5 + fade * 0.5))
  }, -1)

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

// ── HeroSphere — from above the frame → hover over pore → thread down ──────
const heroTarget = new THREE.Vector3()

function HeroSphere() {
  const mesh = useRef()
  const mat = useRef()

  useFrame((state, delta) => {
    if (!mesh.current || !mat.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const poreReady = smooth(BEATS.poreInStart, BEATS.poreInEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)

    if (p < BEATS.transitStart) {
      const hoverY = lerp(5.2, lerp(2.4, 1.45, poreReady), focus)
      heroTarget.set(
        Math.sin(t * 0.28) * 0.05 * (1 - focus),
        hoverY + Math.cos(t * 0.32) * 0.04 * (1 - focus * 0.7),
        0.06,
      )
    } else if (p < BEATS.poreOutEnd) {
      const ease = transit * transit * (3 - 2 * transit)
      heroTarget.set(Math.sin(t * 0.12) * 0.025, lerp(1.45, -2.6, ease), 0.04)
    } else {
      heroTarget.set(
        lerp(0, 1.4, brand) + Math.sin(t * 0.22) * 0.025,
        lerp(-2.6, 0.06, brand),
        lerp(0.04, 0.16, brand),
      )
    }

    mesh.current.position.lerp(heroTarget, 1 - Math.exp(-delta * 4.2))
    // Hero keeps spinning on its own axes the whole time
    mesh.current.rotation.x += delta * 0.55
    mesh.current.rotation.y += delta * 0.85
    mesh.current.rotation.z += delta * 0.28

    const size = lerp(0.34, 0.5, focus) * lerp(1, 0.78, transit * 0.4) * lerp(1, 0.2, brand)
    mesh.current.scale.setScalar(size)
    mat.current.emissiveIntensity = 0.16 + focus * 0.28 + Math.sin(t * 2) * 0.03
  })

  return (
    <mesh ref={mesh} position={[0, 5.2, 0.06]}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial
        ref={mat}
        color="#2f5c58"
        emissive="#143430"
        emissiveIntensity={0.16}
        metalness={0.58}
        roughness={0.32}
      />
    </mesh>
  )
}

// ── Nanopore (Three.js) — thin SiN-style membrane + packed lattice, tight pore
function Nanopore() {
  const group = useRef()
  const sheetMat = useRef()
  const edgeMat = useRef()
  const lattice = useRef()

  const PORE = PORE_RADIUS

  const latticeData = useMemo(() => {
    const positions = []
    const step = 0.2
    const extent = 4.4
    let i = 0
    for (let x = -extent; x <= extent; x += step) {
      for (let z = -extent; z <= extent; z += step) {
        const ox = (Math.floor((z + extent) / step) % 2) * (step * 0.5)
        const px = x + ox
        const pr = Math.hypot(px, z)
        if (pr < PORE + 0.06 || pr > 4.85) continue
        positions.push(px, 0.02, z, 0.048 + seededRandom(i) * 0.028, seededRandom(i + 2))
        i += 1
      }
    }
    return positions
  }, [])

  useFrame((state) => {
    if (!group.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const fadeIn = smooth(BEATS.poreInStart, BEATS.poreInEnd, p)
    const fadeOut = smooth(BEATS.poreOutStart, BEATS.poreOutEnd, p)
    const vis = fadeIn * (1 - fadeOut)

    group.current.visible = vis > 0.004
    group.current.position.y = 0
    group.current.rotation.y = Math.sin(t * 0.06) * 0.015

    if (sheetMat.current) sheetMat.current.opacity = vis * 0.82
    if (edgeMat.current) edgeMat.current.opacity = vis * 0.7
    if (lattice.current) {
      lattice.current.children.forEach((child, idx) => {
        if (!child.material) return
        const shade = latticeData[idx * 5 + 4] ?? 0.5
        child.material.opacity = vis * (0.45 + shade * 0.4)
      })
    }
  })

  const atoms = useMemo(() => {
    const list = []
    for (let i = 0; i < latticeData.length; i += 5) {
      list.push({
        x: latticeData[i],
        y: latticeData[i + 1],
        z: latticeData[i + 2],
        r: latticeData[i + 3],
        shade: latticeData[i + 4],
      })
    }
    return list
  }, [latticeData])

  return (
    <group ref={group}>
      {/* Membrane body — tighter central hole, no rim accent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PORE, 4.7, 128]} />
        <meshStandardMaterial
          ref={sheetMat}
          color="#2a5a56"
          emissive="#0c2422"
          emissiveIntensity={0.15}
          metalness={0.4}
          roughness={0.52}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer edge band — sheet silhouette only */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <ringGeometry args={[4.55, 4.85, 96]} />
        <meshStandardMaterial
          ref={edgeMat}
          color="#1a3836"
          emissive="#081818"
          emissiveIntensity={0.1}
          metalness={0.45}
          roughness={0.6}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Packed atomic lattice */}
      <group ref={lattice}>
        {atoms.map((n, i) => (
          <mesh key={i} position={[n.x, n.y, n.z]}>
            <sphereGeometry args={[n.r, 5, 5]} />
            <meshStandardMaterial
              color={n.shade > 0.55 ? '#3a726c' : '#1e4a46'}
              emissive="#0a2826"
              emissiveIntensity={0.06}
              metalness={0.35}
              roughness={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
      </group>
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
