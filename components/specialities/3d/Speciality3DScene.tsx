"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SPECIALITIES_3D_CONFIG } from "./types";
import SpecialityNode3D from "./SpecialityNode3D";

interface Speciality3DSceneProps {
  activeSlug: string;
  hoveredSlug: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  autoRotate: boolean;
  reducedMotion?: boolean;
}

// Pre-computed deterministic ambient medical dust particles (static, pure)
const STATIC_PARTICLES = (() => {
  const count = 75;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random distribution using sine/cosine hash
    const seedX = Math.sin(i * 12.9898) * 43758.5453;
    const seedY = Math.sin(i * 78.233) * 43758.5453;
    const seedZ = Math.sin(i * 45.164) * 43758.5453;

    pos[i * 3] = ((seedX - Math.floor(seedX)) - 0.5) * 16;
    pos[i * 3 + 1] = (seedY - Math.floor(seedY)) * 5 - 0.5;
    pos[i * 3 + 2] = ((seedZ - Math.floor(seedZ)) - 0.5) * 16;
  }
  return pos;
})();

export default function Speciality3DScene({
  activeSlug,
  hoveredSlug,
  onHover,
  onSelect,
  autoRotate,
  reducedMotion = false,
}: Speciality3DSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const coreOrbRef = useRef<THREE.Group>(null);
  const coreRing1Ref = useRef<THREE.Mesh>(null);
  const coreRing2Ref = useRef<THREE.Mesh>(null);

  // Position 6 nodes around a circular perimeter (radius: 4.2)
  const nodePositions = useMemo(() => {
    const radius = 4.2;
    return SPECIALITIES_3D_CONFIG.map((_, i) => {
      // Offset so first node is comfortably visible in front-facing orientation
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [
        number,
        number,
        number
      ];
    });
  }, []);

  useFrame((state, delta) => {
    if (!reducedMotion) {
      if (coreOrbRef.current) {
        coreOrbRef.current.rotation.y += delta * 0.5;
      }
      if (coreRing1Ref.current) {
        coreRing1Ref.current.rotation.z += delta * 0.8;
      }
      if (coreRing2Ref.current) {
        coreRing2Ref.current.rotation.x -= delta * 0.6;
      }
    }
  });

  return (
    <>
      {/* Dynamic Lighting */}
      <ambientLight color="#0c1e36" intensity={1.8} />
      <directionalLight position={[6, 9, 7]} color="#f0f9ff" intensity={2.2} castShadow />
      <directionalLight position={[-6, 5, -6]} color="#0284c7" intensity={1.6} />
      <pointLight position={[0, -1, 0]} color="#06b6d4" intensity={1.2} distance={8} />

      {/* OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        autoRotate={autoRotate && !hoveredSlug && !reducedMotion}
        autoRotateSpeed={0.65}
        minDistance={5.5}
        maxDistance={13.5}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />

      {/* Holographic Medical Ground Grid */}
      <group position={[0, -0.65, 0]}>
        {/* Deep navy base cylinder */}
        <mesh receiveShadow position={[0, -0.1, 0]}>
          <cylinderGeometry args={[5.8, 6.0, 0.15, 64]} />
          <meshStandardMaterial
            color="#050a14"
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>

        {/* Outer Glowing Perimeter Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <ringGeometry args={[5.55, 5.65, 64]} />
          <meshBasicMaterial color="#0284c7" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>

        {/* Orbit Pathway Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[4.15, 4.25, 64]} />
          <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} transparent opacity={0.45} />
        </mesh>

        {/* Inner Hub Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.5, 1.58, 48]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Central Holographic Core Beacon */}
      <group ref={coreOrbRef} position={[0, 0.35, 0]}>
        {/* Core Pulsing Crystal */}
        <mesh>
          <octahedronGeometry args={[0.38, 0]} />
          <meshPhysicalMaterial
            color="#06b6d4"
            roughness={0.1}
            metalness={0.2}
            clearcoat={1.0}
            emissive="#38bdf8"
            emissiveIntensity={0.8}
            transmission={0.5}
            ior={1.5}
          />
        </mesh>

        {/* Gyro Ring 1 */}
        <mesh ref={coreRing1Ref} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.7, 0.014, 12, 48]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.75} />
        </mesh>

        {/* Gyro Ring 2 */}
        <mesh ref={coreRing2Ref} rotation={[-Math.PI / 3, 0.4, 0]}>
          <torusGeometry args={[0.82, 0.012, 12, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
        </mesh>

        {/* Core Spotlight Accent */}
        <pointLight color="#38bdf8" intensity={1.8} distance={3.5} />
      </group>

      {/* 6 Orbital Speciality Nodes */}
      {SPECIALITIES_3D_CONFIG.map((spec, index) => (
        <SpecialityNode3D
          key={spec.slug}
          speciality={spec}
          position={nodePositions[index]}
          isActive={activeSlug === spec.slug}
          isHovered={hoveredSlug === spec.slug}
          onHover={onHover}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Ambient Floating Medical Particle Constellation */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[STATIC_PARTICLES, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#38bdf8"
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    </>
  );
}
