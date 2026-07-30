import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

/**
 * Serious biotech scroll hero — Three.js / R3F.
 * Varied molecule structures, mixed materials, starfield, grain + shifting gradients in CSS.
 */

const heroTarget = new THREE.Vector3()
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

/** Desaturated, clinical palette — not toy candy colors */
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

const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max)
const smooth = (a, b, v) => {
  const n = clamp((v - a) / (b - a))
  return n * n * (3 - 2 * n)
}
const lerp = THREE.MathUtils.lerp

const BEATS = {
  focusStart: 0.06,
  focusEnd: 0.3,
  poreInStart: 0.26,
  poreInEnd: 0.38,
  transitStart: 0.38,
  transitEnd: 0.66,
  clearStart: 0.52,
  clearEnd: 0.7,
  poreOutStart: 0.66,
  poreOutEnd: 0.78,
  brandStart: 0.76,
  brandEnd: 0.9,
}

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function bondQuat(dir) {
  _dir.set(dir[0], dir[1], dir[2]).normalize()
  return _quat.setFromUnitVectors(_up, _dir).clone()
}

const progressApi = { current: 0, target: 0 }

/** Structure blueprints — different topologies */
const STRUCTURES = [
  // 0 solid mono
  { kind: 'mono', core: C.steel, coreR: 0.34, tips: [] },
  // 1 diatomic
  {
    kind: 'di',
    core: C.slate,
    coreR: 0.22,
    tips: [{ pos: [0.55, 0.05, 0], color: C.ice, r: 0.2 }],
  },
  // 2 bent tri
  {
    kind: 'tri',
    core: C.teal,
    coreR: 0.2,
    tips: [
      { pos: [0.48, 0.28, 0.1], color: C.bone, r: 0.16 },
      { pos: [-0.42, 0.22, -0.12], color: C.mutedBlue, r: 0.15 },
    ],
  },
  // 3 tetra-ish
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
  // 4 linear chain
  {
    kind: 'chain',
    core: C.graphite,
    coreR: 0.14,
    tips: [
      { pos: [0.5, 0, 0], color: C.slate, r: 0.14 },
      { pos: [-0.5, 0.02, 0.04], color: C.mutedBlue, r: 0.14 },
      { pos: [0.95, 0.08, -0.06], color: C.ice, r: 0.12 },
      { pos: [-0.95, -0.06, 0.05], color: C.teal, r: 0.12 },
    ],
  },
  // 5 asymmetric cluster
  {
    kind: 'cluster',
    core: C.mutedBlue,
    coreR: 0.2,
    tips: [
      { pos: [0.4, 0.32, 0.25], color: C.copper, r: 0.17 },
      { pos: [-0.35, 0.1, 0.4], color: C.bone, r: 0.12 },
      { pos: [0.15, -0.4, -0.15], color: C.teal, r: 0.15 },
      { pos: [-0.45, -0.2, -0.25], color: C.graphite, r: 0.13 },
      { pos: [0.3, 0.05, -0.45], color: C.moss, r: 0.11 },
    ],
  },
  // 6 ghost ring (will use translucent mat)
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
  { metalness: 0.55, roughness: 0.35, opacity: 1, emissiveIntensity: 0.08 }, // solid metal
  { metalness: 0.15, roughness: 0.55, opacity: 1, emissiveIntensity: 0.05 }, // matte
  { metalness: 0.3, roughness: 0.2, opacity: 0.55, emissiveIntensity: 0.12 }, // translucent
  { metalness: 0.7, roughness: 0.18, opacity: 0.92, emissiveIntensity: 0.15 }, // polished
  { metalness: 0.05, roughness: 0.7, opacity: 0.4, emissiveIntensity: 0.2 }, // ghost soft
]

export default function App() {
  const [ui, setUi] = useState({ brand: 0, hint: 1 })

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
      const hint = 1 - smooth(0.02, 0.1, progressApi.current)
      const key = Math.round(brand * 50) + Math.round(hint * 50) * 100
      if (key !== lastKey) {
        lastKey = key
        setUi({ brand, hint })
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
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.5, 11.5], fov: 36, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.92
          }}>
          <Atmosphere />
          <ambientLight intensity={0.35} color="#8a9aa0" />
          <directionalLight position={[6, 10, 4]} intensity={1.35} color="#e8eee8" />
          <directionalLight position={[-5, 2, -4]} intensity={0.45} color="#4a6a78" />
          <pointLight position={[2, 2, 5]} intensity={0.55} color="#6a9088" distance={30} />

          <CameraRig />
          <Starfield />
          <FieldMolecules />
          <HeroSphere />
          <Nanopore />
        </Canvas>

        <div className="scroll-hint" style={{ opacity: ui.hint }}>
          Scroll to follow the molecule
        </div>

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

function Atmosphere() {
  const fogRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.08
    const w1 = (Math.sin(t) + 1) * 0.5
    const w2 = (Math.sin(t * 0.7 + 1.2) + 1) * 0.5
    _fogNow.copy(_fogA).lerp(_fogB, w1).lerp(_fogC, w2 * 0.45)
    if (fogRef.current) fogRef.current.color.copy(_fogNow)
    // Drive CSS custom property for backdrop shift
    document.documentElement.style.setProperty('--fog-r', String(Math.round(_fogNow.r * 255)))
    document.documentElement.style.setProperty('--fog-g', String(Math.round(_fogNow.g * 255)))
    document.documentElement.style.setProperty('--fog-b', String(Math.round(_fogNow.b * 255)))
  })

  return <fog ref={fogRef} attach="fog" args={['#061820', 14, 36]} />
}

function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const p = progressApi.current
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)

    const camY = lerp(1.3, 2.8, transit) * (1 - brand * 0.8) + lerp(0.3, 0.12, brand)
    const camZ = lerp(11.5, 8.6, focus)
    const finalZ = lerp(lerp(camZ, 7.7, transit), 6.6, brand)

    cameraTarget.set(lerp(0.3, 0, focus) * (1 - brand), camY, finalZ)
    lookAtTarget.set(0, lerp(1.0, -0.35, transit) * (1 - brand * 0.65), 0)

    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 3.4))
    camera.lookAt(lookAtTarget)
    camera.fov = lerp(36, 30, focus)
    camera.updateProjectionMatrix()
  })

  return null
}

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

function FieldMolecules() {
  const group = useRef()
  const layout = useMemo(() => {
    const items = []
    for (let i = 0; i < 52; i += 1) {
      items.push({
        base: [
          (seededRandom(i + 2) - 0.5) * 16,
          0.5 + seededRandom(i + 19) * 5.2,
          (seededRandom(i + 37) - 0.5) * 12,
        ],
        scale: 0.45 + seededRandom(i + 51) * 0.85,
        drift: 0.22 + seededRandom(i + 67) * 0.55,
        phase: seededRandom(i + 83) * Math.PI * 2,
        structure: Math.floor(seededRandom(i + 99) * STRUCTURES.length),
        matPreset: Math.floor(seededRandom(i + 111) * MAT_PRESETS.length),
      })
    }
    return items
  }, [])

  useFrame((state) => {
    if (!group.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const clear = smooth(BEATS.clearStart, BEATS.clearEnd, p)
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const fade = (1 - focus * 0.3) * (1 - clear)

    group.current.visible = fade > 0.04
    group.current.children.forEach((child, i) => {
      const item = layout[i]
      if (!item) return
      child.position.set(
        item.base[0] + Math.cos(t * item.drift * 0.65 + item.phase) * 0.32,
        item.base[1] + Math.sin(t * item.drift + item.phase) * 0.24,
        item.base[2] + Math.sin(t * item.drift * 0.5 + item.phase) * 0.28,
      )
      child.rotation.x = t * 0.05 * item.drift
      child.rotation.y = t * 0.09 * item.drift + item.phase
      const hover = child.userData.hoverAmt || 0
      child.scale.setScalar(item.scale * (0.55 + fade * 0.45) * (1 + hover * 0.28))
    })
  })

  return (
    <group ref={group}>
      {layout.map((item, i) => (
        <HoverStructure key={i} item={item} />
      ))}
    </group>
  )
}

function HoverStructure({ item }) {
  const root = useRef()
  const hovered = useRef(false)
  const hoverAmt = useRef(0)

  useFrame((_, delta) => {
    if (!root.current) return
    hoverAmt.current = lerp(hoverAmt.current, hovered.current ? 1 : 0, 1 - Math.exp(-delta * 9))
    root.current.userData.hoverAmt = hoverAmt.current
    root.current.traverse((obj) => {
      if (obj.isMesh && obj.material?.emissiveIntensity != null) {
        const base = obj.userData.baseE ?? obj.material.emissiveIntensity
        obj.userData.baseE = base
        obj.material.emissiveIntensity = base + hoverAmt.current * 0.55
      }
    })
  })

  return (
    <group
      ref={root}
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

function HeroSphere() {
  const mesh = useRef()
  const mat = useRef()
  const hovered = useRef(false)
  const hoverAmt = useRef(0)

  useFrame((state, delta) => {
    if (!mesh.current || !mat.current) return
    const p = progressApi.current
    const t = state.clock.elapsedTime
    const focus = smooth(BEATS.focusStart, BEATS.focusEnd, p)
    const transit = smooth(BEATS.transitStart, BEATS.transitEnd, p)
    const brand = smooth(BEATS.brandStart, BEATS.brandEnd, p)
    hoverAmt.current = lerp(hoverAmt.current, hovered.current ? 1 : 0, 1 - Math.exp(-delta * 9))

    if (p < BEATS.transitStart) {
      heroTarget.set(
        lerp(2.1, 0, focus) + Math.sin(t * 0.35) * 0.05 * (1 - focus),
        lerp(1.65, 2.0, focus) + Math.cos(t * 0.42) * 0.04 * (1 - focus),
        lerp(0.9, 0.1, focus),
      )
    } else if (p < BEATS.poreOutEnd) {
      heroTarget.set(0, lerp(2.0, -2.2, transit), 0.08)
    } else {
      heroTarget.set(lerp(0, 1.55, brand), lerp(-2.2, 0.05, brand), lerp(0.08, 0.22, brand))
    }

    mesh.current.position.lerp(heroTarget, 1 - Math.exp(-delta * 5))
    const size =
      lerp(0.36, 0.58, focus) * lerp(1, 0.86, transit * 0.35) * lerp(1, 0.24, brand) * (1 + hoverAmt.current * 0.08)
    mesh.current.scale.setScalar(size)
    mat.current.emissiveIntensity = 0.18 + focus * 0.35 + hoverAmt.current * 0.4
  })

  return (
    <mesh
      ref={mesh}
      onPointerOver={(e) => {
        e.stopPropagation()
        hovered.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hovered.current = false
        document.body.style.cursor = 'auto'
      }}>
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

/** Distant star-like dust */
function Starfield() {
  const points = useRef()
  const data = useRef(null)
  if (!data.current) {
    const count = 900
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const o = i * 3
      positions[o] = (seededRandom(i + 1) - 0.5) * 40
      positions[o + 1] = seededRandom(i + 2) * 18 - 2
      positions[o + 2] = (seededRandom(i + 3) - 0.5) * 30 - 4
      seeds[i] = seededRandom(i + 4)
      const shade = 0.55 + seeds[i] * 0.45
      // cool white / steel / faint teal flecks
      const tone = seededRandom(i + 5)
      if (tone < 0.7) {
        colors[o] = shade * 0.85
        colors[o + 1] = shade * 0.9
        colors[o + 2] = shade
      } else {
        colors[o] = shade * 0.55
        colors[o + 1] = shade * 0.8
        colors[o + 2] = shade * 0.75
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
    // Stars soften after pore but remain faintly for depth
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

function Nanopore() {
  const group = useRef()
  const sheet = useRef()
  const rim = useRef()

  const nodes = useMemo(() => {
    const list = []
    for (let i = 0; i < 48; i += 1) {
      const a = (i / 48) * Math.PI * 2
      const r = 1.35 + seededRandom(i + 2) * 3.4
      list.push([Math.cos(a) * r, 0.015, Math.sin(a) * r, 0.025 + seededRandom(i) * 0.02])
    }
    return list
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return
    const p = progressApi.current
    const visible =
      smooth(BEATS.poreInStart, BEATS.poreInEnd, p) * (1 - smooth(BEATS.poreOutStart, BEATS.poreOutEnd, p))
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.008
    poreScale.set(pulse, 1, pulse)
    group.current.scale.lerp(poreScale, 1 - Math.exp(-delta * 3.5))
    group.current.visible = visible > 0.01
    if (sheet.current) sheet.current.opacity = visible * 0.72
    if (rim.current) rim.current.opacity = visible * 0.9
  })

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 5.5, 128]} />
        <meshStandardMaterial
          ref={sheet}
          color="#3a4e52"
          emissive="#152428"
          emissiveIntensity={0.25}
          metalness={0.45}
          roughness={0.55}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.02, 1.16, 96]} />
        <meshStandardMaterial
          ref={rim}
          color="#5a8a82"
          emissive="#2a5a54"
          emissiveIntensity={0.7}
          metalness={0.5}
          roughness={0.3}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {nodes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]}>
          <sphereGeometry args={[n[3], 6, 6]} />
          <meshStandardMaterial color="#4a5c60" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}
