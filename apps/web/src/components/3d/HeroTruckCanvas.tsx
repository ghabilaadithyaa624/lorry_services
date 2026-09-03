// @ts-nocheck
'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei/core/OrbitControls'
import { Float } from '@react-three/drei/core/Float'
import { MeshReflectorMaterial } from '@react-three/drei/core/MeshReflectorMaterial'
import * as THREE from 'three'

function ProceduralTruck() {
  const truckRef = useRef<THREE.Group>(null)
  const wheelsRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (truckRef.current) {
      // Framerate-independent smooth mouse interaction
      const { x, y } = state.pointer
      const targetY = x * 0.28 + Math.PI / 5.2
      const targetX = -y * 0.1
      truckRef.current.rotation.y = THREE.MathUtils.lerp(truckRef.current.rotation.y, targetY, 1 - Math.exp(-delta * 4))
      truckRef.current.rotation.x = THREE.MathUtils.lerp(truckRef.current.rotation.x, targetX, 1 - Math.exp(-delta * 4))
    }
    if (wheelsRef.current) {
      wheelsRef.current.children.forEach((wheel) => {
        wheel.rotation.x += delta * 2.5
      })
    }
  })

  return (
    <group ref={truckRef} position={[0.2, -0.15, 0]} scale={0.88}>
      
      {/* ── 1. CABIN (Dark Graphite with LorryCarry Orange Accent Deflector) ── */}
      <group position={[2.2, 0.9, 0]}>
        {/* Main Dark Graphite Cabin Shell */}
        <mesh>
          <boxGeometry args={[1.5, 1.4, 1.3]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* LorryCarry Orange Roof Aerodynamic Deflector Shield */}
        <mesh position={[-0.3, 0.85, 0]} rotation={[0, 0, -Math.PI / 16]}>
          <boxGeometry args={[1.1, 0.3, 1.25]} />
          <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Orange Accent Trim Striping on Cab Doors */}
        <mesh position={[0.0, -0.1, 0.66]}>
          <boxGeometry args={[1.2, 0.08, 0.01]} />
          <meshStandardMaterial color="#ea580c" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.0, -0.1, -0.66]}>
          <boxGeometry args={[1.2, 0.08, 0.01]} />
          <meshStandardMaterial color="#ea580c" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Front Windshield (Glass) */}
        <mesh position={[0.41, 0.25, 0]}>
          <boxGeometry args={[0.72, 0.65, 1.22]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transmission={0.85}
            transparent
            opacity={0.85}
            roughness={0.1}
            ior={1.5}
          />
        </mesh>

        {/* Side Windows */}
        <mesh position={[0.0, 0.25, 0.66]}>
          <boxGeometry args={[0.7, 0.5, 0.02]} />
          <meshPhysicalMaterial color="#38bdf8" transmission={0.8} transparent opacity={0.85} roughness={0.1} />
        </mesh>
        <mesh position={[0.0, 0.25, -0.66]}>
          <boxGeometry args={[0.7, 0.5, 0.02]} />
          <meshPhysicalMaterial color="#38bdf8" transmission={0.8} transparent opacity={0.85} roughness={0.1} />
        </mesh>

        {/* Side Mirrors */}
        <mesh position={[0.45, 0.2, 0.78]}>
          <boxGeometry args={[0.1, 0.25, 0.12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.45, 0.2, -0.78]}>
          <boxGeometry args={[0.1, 0.25, 0.12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Chrome Exhaust Stack */}
        <mesh position={[-0.65, 0.9, -0.55]}>
          <cylinderGeometry args={[0.05, 0.05, 1.4, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Front Bumper & Dark Chrome Grille */}
        <mesh position={[0.77, -0.45, 0]}>
          <boxGeometry args={[0.08, 0.45, 1.28]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Horizontal Grille Chrome Slats */}
        <mesh position={[0.82, -0.38, 0]}>
          <boxGeometry args={[0.02, 0.04, 0.9]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0.82, -0.48, 0]}>
          <boxGeometry args={[0.02, 0.04, 0.9]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Headlights Emissive Glow */}
        <mesh position={[0.81, -0.42, 0.45]}>
          <boxGeometry args={[0.04, 0.14, 0.24]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.81, -0.42, -0.45]}>
          <boxGeometry args={[0.04, 0.14, 0.24]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={3} />
        </mesh>

        {/* Focused Forward Spotlights */}
        <spotLight
          position={[0.85, -0.42, 0.45]}
          target-position={[6, -0.42, 0.45]}
          color="#38bdf8"
          intensity={4}
          angle={0.45}
          penumbra={0.6}
          distance={12}
        />
        <spotLight
          position={[0.85, -0.42, -0.45]}
          target-position={[6, -0.42, -0.45]}
          color="#38bdf8"
          intensity={4}
          angle={0.45}
          penumbra={0.6}
          distance={12}
        />
      </group>

      {/* ── 2. CARGO BODY (Dark Charcoal with LorryCarry Orange Accent Line) ── */}
      <group position={[-0.8, 1.25, 0]}>
        {/* Main Cargo Container Shell */}
        <mesh>
          <boxGeometry args={[4.2, 1.9, 1.35]} />
          <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.35} />
        </mesh>

        {/* LorryCarry Primary Orange Side Highlight Striping */}
        <mesh position={[0, 0, 0.685]}>
          <boxGeometry args={[4.0, 0.3, 0.01]} />
          <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.685]}>
          <boxGeometry args={[4.0, 0.3, 0.01]} />
          <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Metallic Edge Frames */}
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[4.22, 0.05, 1.37]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Rear Door Frame */}
        <mesh position={[-2.11, 0, 0]}>
          <boxGeometry args={[0.02, 1.85, 1.3]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 3. CHASSIS & WHEEL WELLS ── */}
      <group position={[0.5, 0.3, 0]}>
        <mesh>
          <boxGeometry args={[5.2, 0.25, 0.9]} />
          <meshStandardMaterial color="#090d16" metalness={0.95} roughness={0.2} />
        </mesh>

        {/* Fuel Tanks */}
        <mesh position={[0, -0.05, 0.58]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 1.2, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.05, -0.58]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 1.2, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* ── 4. WHEELS (Dark Rubber Tires + Silver Rims + Orange Axle Caps) ── */}
      <group ref={wheelsRef}>
        {[
          [2.3, 0, 0.65],
          [2.3, 0, -0.65],
          [-0.2, 0, 0.65],
          [-0.2, 0, -0.65],
          [-1.5, 0, 0.65],
          [-1.5, 0, -0.65],
          [-2.4, 0, 0.65],
          [-2.4, 0, -0.65],
        ].map((pos, i) => (
          <group key={i} position={pos as [number, number, number]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.22, 20]} />
              <meshStandardMaterial color="#111827" roughness={0.85} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.23, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
              <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

export default function HeroTruckCanvas() {
  return (
    <div className="w-full h-[380px] sm:h-[460px] lg:h-[520px] relative rounded-[20px] overflow-hidden cursor-grab active:cursor-grabbing group bg-canvas">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none" />

      {/* 3D Canvas with DPR limit for GPU efficiency */}
      <Canvas
        camera={{ position: [5.2, 2.2, 4.8], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        className="relative z-10"
      >
        {/* ── CINEMATIC 3-POINT LIGHTING SYSTEM ── */}
        <ambientLight intensity={0.7} color="#ffffff" />

        {/* 1. Key Light: Warm Sun Directional Light */}
        <directionalLight position={[8, 10, 6]} intensity={2.2} color="#fff7ed" />

        {/* 2. Rim Light: Controlled Orange Backlight for Silhouette Definition */}
        <directionalLight position={[-8, 6, -6]} intensity={3.5} color="#f97316" />

        {/* 3. Fill Light: Cool Neutral Sky Blue Fill Light */}
        <pointLight position={[6, 4, 8]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[0, 6, 2]} intensity={0.8} color="#ffffff" />

        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.25}>
          <ProceduralTruck />
        </Float>

        {/* Reflective Ground Floor */}
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 30]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={512}
            mirror={0.3}
            mixBlur={0.8}
            mixStrength={1.2}
            roughness={0.45}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#070a11"
            metalness={0.8}
          />
        </mesh>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={Math.PI / 4}
          rotateSpeed={0.4}
        />
      </Canvas>

      {/* Overlay Telemetry Badge */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2.5 px-3.5 py-2 rounded-button bg-panel border border-white/10 text-xs text-surface-200 font-sans">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-surface-300">
          Interactive 3D Fleet Visualizer • Drag to Rotate
        </span>
      </div>
    </div>
  )
}
