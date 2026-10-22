"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface DermaShield3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function DermaShield3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: DermaShield3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const outerCellsRef = useRef<THREE.Group>(null);

  // 6 perimeter hexagonal cell positions
  const hexCells = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (i * Math.PI) / 3;
    return [Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0] as [number, number, number];
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y += delta * 0.45;
      if (ringRef.current) ringRef.current.rotation.z += delta * 0.7;
      if (outerCellsRef.current) outerCellsRef.current.rotation.z -= delta * 0.5;

      // Subtle barrier ripple
      const ripple = 1 + Math.sin(time * 2.5) * 0.04;
      const targetBase = isHovered || isActive ? 1.15 : 1.0;
      const finalScale = targetBase * ripple;

      groupRef.current.scale.lerp(
        new THREE.Vector3(finalScale, finalScale, finalScale),
        delta * 6
      );
    } else {
      const targetBase = isHovered || isActive ? 1.15 : 1.0;
      groupRef.current.scale.set(targetBase, targetBase, targetBase);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0]}>
      {/* Outer Epidermal Hex Shield Plate */}
      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.08, 6]} />
        <meshPhysicalMaterial
          color="#ec4899"
          roughness={0.2}
          metalness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          emissive={isActive ? "#f472b6" : isHovered ? "#fb7185" : "#9d174d"}
          emissiveIntensity={isActive ? 0.5 : isHovered ? 0.35 : 0.15}
        />
      </mesh>

      {/* Middle Cellular Matrix Layer */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, Math.PI / 6, 0]}>
        <cylinderGeometry args={[0.54, 0.54, 0.06, 6]} />
        <meshPhysicalMaterial
          color="#14b8a6"
          roughness={0.15}
          metalness={0.3}
          clearcoat={1.0}
          emissive={isActive ? "#2dd4bf" : isHovered ? "#5eead4" : "#0f766e"}
          emissiveIntensity={isActive ? 0.4 : isHovered ? 0.25 : 0.1}
        />
      </mesh>

      {/* Deep Dermal Foundation Plate */}
      <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 6]} />
        <meshPhysicalMaterial
          color="#be185d"
          roughness={0.3}
          metalness={0.2}
          clearcoat={0.7}
        />
      </mesh>

      {/* Orbiting Hex Micro-Cells (Epidermal Barrier Units) */}
      <group ref={outerCellsRef}>
        {hexCells.map((pos, idx) => (
          <mesh key={idx} position={pos} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 6]} />
            <meshBasicMaterial
              color={idx % 2 === 0 ? "#f472b6" : "#2dd4bf"}
            />
          </mesh>
        ))}
      </group>

      {/* Protective Moisture Barrier Halo */}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.92, 0.014, 12, 48]} />
        <meshBasicMaterial
          color={isHovered || isActive ? "#f472b6" : "#06b6d4"}
          transparent
          opacity={isHovered || isActive ? 0.85 : 0.4}
        />
      </mesh>
    </group>
  );
}
