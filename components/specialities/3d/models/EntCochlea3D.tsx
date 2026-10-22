"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface EntCochlea3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function EntCochlea3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: EntCochlea3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wave1Ref = useRef<THREE.Mesh>(null);
  const wave2Ref = useRef<THREE.Mesh>(null);
  const wave3Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y += delta * 0.4;

      // Acoustic wave ripple oscillation
      if (wave1Ref.current) wave1Ref.current.scale.setScalar(1 + Math.sin(time * 3) * 0.06);
      if (wave2Ref.current) wave2Ref.current.scale.setScalar(1 + Math.sin(time * 3 + 1) * 0.06);
      if (wave3Ref.current) wave3Ref.current.scale.setScalar(1 + Math.sin(time * 3 + 2) * 0.06);

      const targetScale = isHovered || isActive ? 1.15 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 6
      );
    } else {
      const targetScale = isHovered || isActive ? 1.15 : 1.0;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0]}>
      {/* Outer Cochlea Coil */}
      <mesh position={[0, 0.1, 0]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.38, 0.1, 16, 32, Math.PI * 1.5]} />
        <meshPhysicalMaterial
          color="#f59e0b"
          roughness={0.2}
          metalness={0.4}
          clearcoat={0.8}
          emissive={isActive ? "#fbbf24" : isHovered ? "#fde68a" : "#b45309"}
          emissiveIntensity={isActive ? 0.45 : isHovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Middle Cochlea Spiral Coil */}
      <mesh position={[0.06, -0.04, 0.04]} rotation={[0.4, 0, 0.8]}>
        <torusGeometry args={[0.26, 0.08, 16, 28, Math.PI * 1.6]} />
        <meshPhysicalMaterial
          color="#d97706"
          roughness={0.2}
          metalness={0.4}
          clearcoat={0.8}
          emissive={isActive ? "#fbbf24" : "#92400e"}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Inner Acoustic Apex Nucleus */}
      <mesh position={[0.09, -0.12, 0.08]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshPhysicalMaterial
          color="#fbbf24"
          roughness={0.15}
          metalness={0.5}
          emissive="#fde68a"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Ear Canal / Tympanic Entry Tube */}
      <mesh position={[-0.22, 0.22, -0.05]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.09, 0.07, 0.28, 16]} />
        <meshPhysicalMaterial
          color="#f59e0b"
          roughness={0.25}
          metalness={0.3}
        />
      </mesh>

      {/* Concentric Sonic Wave Rings (Vocal / Auditory Resonance) */}
      <mesh ref={wave1Ref} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.65, 0.012, 12, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHovered || isActive ? 0.85 : 0.4}
        />
      </mesh>

      <mesh ref={wave2Ref} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.82, 0.012, 12, 48]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={isHovered || isActive ? 0.75 : 0.3}
        />
      </mesh>

      <mesh ref={wave3Ref} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.98, 0.01, 12, 48]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={isHovered || isActive ? 0.65 : 0.2}
        />
      </mesh>
    </group>
  );
}
