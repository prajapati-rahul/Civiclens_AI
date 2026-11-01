import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Grid, Html, Lightformer, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { Line2 } from 'three-stdlib'
import * as THREE from 'three'
import type { AuditListItem } from '../types'
import { getDomainFromUrl, towerColor } from '../utils/helpers'

const AMBER = '#f59e0b'
const BG = '#14110f'
const SHELL = '#ece6df' // matte off-white, like the server racks in the reference
const LINE_Y = 0.03
const FLOOR_H = 0.36
const PITCH = 0.44 // floor height + glowing seam
const TARGET = new THREE.Vector3(0, -1, 0)

// Hand-placed tower slots around the hub (x, z), nearest first. Max 12 towers.
const SLOTS: [number, number][] = [
  [-5, -4], [5, -4], [-6, 2], [6, 2], [0, -7], [0, 7],
  [-5, 7], [5, 7], [-10, -2], [10, -2], [-9, -8], [9, -8],
]
const MAX_TOWERS = SLOTS.length

// Colours brighter than 1.0 with tone mapping off are what the bloom pass picks up
function glow(color: string, strength: number) {
  return new THREE.Color(color).multiplyScalar(strength)
}

// Position at fraction t (0–1) along a polyline.
function pointAt(points: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]))
  let d = t * lengths.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i]) return out.lerpVectors(points[i], points[i + 1], lengths[i] ? d / lengths[i] : 0)
    d -= lengths[i]
  }
  return out.copy(points[points.length - 1])
}

interface Props {
  audits: AuditListItem[]
  onSelect: (audit: AuditListItem) => void
  reducedMotion: boolean
}

export default function CivicCity3D({ audits, onSelect, reducedMotion }: Props) {
  const towers = audits.slice(0, MAX_TOWERS)
  // Fewer towers fill only the inner slots, so pull the camera in (read once at mount)
  // Narrower canvases need a farther camera so edge towers stay in frame
  const w = window.innerWidth
  const fit = w < 640 ? 1.45 : w < 1536 ? 1.2 : 1
  const zoom = (towers.length <= 6 ? 0.88 : 1.05) * fit
  const camPos = new THREE.Vector3(13, 11, 15).multiplyScalar(zoom)

  useEffect(() => () => { document.body.style.cursor = '' }, [])

  return (
    <Canvas dpr={[1, 1.75]} gl={{ antialias: false }} camera={{ position: camPos.toArray(), fov: 36 }}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 22, 46]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 12, 8]} intensity={0.8} color="#fff4e6" />
      {/* Procedural studio lighting: no HDR download, so it works offline.
          Kept dim enough that white surfaces stay under the bloom threshold. */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={0.8} color="#fff3e2" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={0.6} color={AMBER} position={[-12, 4, -6]} rotation-y={Math.PI / 3} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#ffffff" position={[12, 3, 8]} rotation-y={-Math.PI / 3} scale={[8, 3, 1]} />
      </Environment>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#17130f" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        infiniteGrid
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#2a2420"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#3d332c"
        fadeDistance={38}
        fadeStrength={1.6}
      />
      <ContactShadows position={[0, 0.003, 0]} scale={40} resolution={1024} blur={2.6} opacity={0.7} far={10} />

      <Hub reducedMotion={reducedMotion} />

      {towers.map((audit, i) => {
        const [x, z] = SLOTS[i]
        const color = towerColor(audit)
        // Alternate elbow direction so trunks fan out like cabling
        const points = i % 2
          ? [new THREE.Vector3(0, LINE_Y, 0), new THREE.Vector3(x, LINE_Y, 0), new THREE.Vector3(x, LINE_Y, z)]
          : [new THREE.Vector3(0, LINE_Y, 0), new THREE.Vector3(0, LINE_Y, z), new THREE.Vector3(x, LINE_Y, z)]
        return (
          <group key={audit.id}>
            <Connection points={points} color={color} reducedMotion={reducedMotion} />
            <Tower audit={audit} x={x} z={z} color={color} index={i} onSelect={onSelect} reducedMotion={reducedMotion} />
          </group>
        )
      })}

      <OrbitControls
        target={TARGET.toArray()} // aim below the ground so the city sits above the KPI bar
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={Math.PI / 6}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
      />
      {!reducedMotion && <CameraIntro distance={camPos.clone().sub(TARGET).length()} />}

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.2} intensity={0.7} radius={0.7} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </Canvas>
  )
}

// Opening shot: glide in from far out to the resting distance
function CameraIntro({ distance }: { distance: number }) {
  const { camera } = useThree()
  const done = useRef(false)
  const offset = useMemo(() => new THREE.Vector3(), [])
  useFrame(state => {
    if (done.current) return
    const p = Math.min(1, state.clock.elapsedTime / 2.6)
    const eased = 1 - Math.pow(1 - p, 3)
    offset.copy(camera.position).sub(TARGET).setLength(THREE.MathUtils.lerp(distance * 1.8, distance, eased))
    camera.position.copy(TARGET).add(offset)
    if (p >= 1) done.current = true
  })
  return null
}

// A stack of matte floors with glowing seams between them
function Stack({ floors, width, shell, seam }: { floors: number; width: number; shell: THREE.Material; seam: THREE.Material }) {
  return (
    <>
      {Array.from({ length: floors }, (_, f) => (
        <group key={f} position={[0, 0.1 + f * PITCH, 0]}>
          <RoundedBox args={[width, FLOOR_H, width]} radius={0.06} smoothness={4} position={[0, FLOOR_H / 2, 0]} material={shell} />
          {/* Recessed slightly so it reads as a lit slit between floors; none above the roof */}
          {f < floors - 1 && (
            <mesh position={[0, FLOOR_H + (PITCH - FLOOR_H) / 2, 0]} material={seam}>
              <boxGeometry args={[width - 0.1, 0.03, width - 0.1]} />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}

function Hub({ reducedMotion }: { reducedMotion: boolean }) {
  const groundRing = useRef<THREE.Group>(null)
  const beacon = useMemo(() => new THREE.MeshBasicMaterial({ color: glow(AMBER, 6), toneMapped: false }), [])
  const seam = useMemo(() => new THREE.MeshBasicMaterial({ color: glow(AMBER, 3), toneMapped: false }), [])
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ color: SHELL, roughness: 0.5, metalness: 0.05 }), [])
  const ringPoints = useMemo(
    () => Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * 3.2, LINE_Y, Math.sin(a) * 3.2)
    }),
    []
  )
  useEffect(() => () => { beacon.dispose(); seam.dispose(); shell.dispose() }, [beacon, seam, shell])

  useFrame((state, delta) => {
    if (reducedMotion) return
    if (groundRing.current) groundRing.current.rotation.y += delta * 0.15
    // Slow "breathing" beacon
    beacon.color.copy(glow(AMBER, 3 + Math.sin(state.clock.elapsedTime * 2.2) * 2.5))
  })

  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[2.3, 2.45, 0.3, 72]} />
        <meshStandardMaterial color="#221d1a" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.305, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[2.16, 2.24, 96]} />
        <meshBasicMaterial color={glow(AMBER, 2.2)} toneMapped={false} />
      </mesh>
      <group ref={groundRing}>
        <Line points={ringPoints} color={AMBER} lineWidth={1} dashed dashSize={0.25} gapSize={0.35} transparent opacity={0.5} />
      </group>
      <group position={[0, 0.2, 0]}>
        <Stack floors={3} width={1.5} shell={shell} seam={seam} />
      </group>
      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#cfc6bd" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.15, 0]} material={beacon}>
        <sphereGeometry args={[0.09, 20, 20]} />
      </mesh>
    </group>
  )
}

function Connection({ points, color, reducedMotion }: { points: THREE.Vector3[]; color: string; reducedMotion: boolean }) {
  const line = useRef<Line2>(null)
  const packet = useRef<THREE.Mesh>(null)
  const offset = useMemo(() => Math.random(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const lineColor = useMemo(() => glow(color, 1.6), [color])
  const packetColor = useMemo(() => glow(color, 5), [color])

  useFrame((state, delta) => {
    if (reducedMotion) return
    if (line.current) line.current.material.dashOffset -= delta * 0.6
    if (packet.current) packet.current.position.copy(pointAt(points, (state.clock.elapsedTime * 0.1 + offset) % 1, tmp))
  })

  return (
    <>
      <Line ref={line} points={points} color={lineColor} toneMapped={false} lineWidth={1.4} dashed dashSize={0.08} gapSize={0.16} />
      {!reducedMotion && (
        <mesh ref={packet}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={packetColor} toneMapped={false} />
        </mesh>
      )}
    </>
  )
}

interface TowerProps {
  audit: AuditListItem
  x: number
  z: number
  color: string
  index: number
  onSelect: (audit: AuditListItem) => void
  reducedMotion: boolean
}

function Tower({ audit, x, z, color, index, onSelect, reducedMotion }: TowerProps) {
  const body = useRef<THREE.Group>(null)
  const grow = useRef(reducedMotion ? 1 : 0)
  const [hovered, setHovered] = useState(false)
  const busy = audit.status === 'pending' || audit.status === 'running'
  // One floor per ~11 score points; in-progress audits show a short stub
  const floors = audit.status === 'completed' ? Math.max(1, Math.round((audit.overall_score ?? 0) / 11)) : 2
  const top = 0.1 + floors * PITCH

  const shell = useMemo(() => new THREE.MeshStandardMaterial({ color: SHELL, roughness: 0.55, metalness: 0.05 }), [])
  const seam = useMemo(() => new THREE.MeshBasicMaterial({ color: glow(color, 2.6), toneMapped: false }), [color])
  const padOutline = useMemo(
    () => [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.Vector3(a * 0.98, 0.115, b * 0.98)),
    []
  )
  useEffect(() => () => { shell.dispose(); seam.dispose() }, [shell, seam])

  useFrame((state, delta) => {
    if (!body.current) return
    if (state.clock.elapsedTime > 0.6 + index * 0.12) grow.current = Math.min(1, grow.current + delta * 1.2)
    body.current.scale.y = Math.max(0.001, 1 - Math.pow(1 - grow.current, 3))
    body.current.position.y += ((hovered ? 0.25 : 0) - body.current.position.y) * Math.min(1, delta * 8)
    const strength = busy && !reducedMotion ? 2 + Math.sin(state.clock.elapsedTime * 5) * 1.6 : hovered ? 5 : 2.6
    seam.color.copy(glow(color, strength))
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 4) return // that was a drag to rotate, not a click
    onSelect(audit)
  }

  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[2.1, 0.1, 2.1]} radius={0.04} position={[0, 0.05, 0]}>
        <meshStandardMaterial color="#231e1b" roughness={0.8} />
      </RoundedBox>
      <Line points={padOutline} color={glow(color, 1.4)} toneMapped={false} lineWidth={1} />
      <group
        ref={body}
        onClick={handleClick}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
      >
        <Stack floors={floors} width={1.3} shell={shell} seam={seam} />
      </group>
      <Html position={[0, top + 0.55, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 font-mono text-[11px] text-white/90 backdrop-blur-sm transition-colors"
          style={{ background: 'rgba(20,17,15,0.72)', boxShadow: `inset 0 0 0 1px ${hovered ? color : 'rgba(255,255,255,0.1)'}` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          {getDomainFromUrl(audit.url).replace(/^www\./, '')}
          <span className="font-medium tabular-nums" style={{ color }}>
            {audit.status === 'completed' ? audit.overall_score ?? '—' : audit.status}
          </span>
        </div>
      </Html>
    </group>
  )
}
