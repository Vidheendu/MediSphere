"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface DentalTooth3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function DentalTooth3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: DentalTooth3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      groupRef.current.rotation.y += delta * 0.45;
      if (haloRef.current) haloRef.current.rotation.z += delta * 0.6;

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
      {/* Crown Central Core */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.36, 0.32, 0.3, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.1}
          metalness={0.05}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          emissive={isActive ? "#2dd4bf" : isHovered ? "#5eead4" : "#0d9488"}
          emissiveIntensity={isActive ? 0.35 : isHovered ? 0.25 : 0.08}
        />
      </mesh>

      {/* 4 Molar Cusps (Top Chewing Surface) */}
      {[
        [-0.14, 0.28, -0.14],
        [0.14, 0.28, -0.14],
        [-0.14, 0.28, 0.14],
        [0.14, 0.28, 0.14],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshPhysicalMaterial
            color="#ffffff"
            roughness={0.08}
            clearcoat={1.0}
            emissive={isActive ? "#5eead4" : "#14b8a6"}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Tooth Neck / Cervical Line */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.31, 0.26, 0.12, 24]} />
        <meshPhysicalMaterial
          color="#f1f5f9"
          roughness={0.15}
          clearcoat={0.9}
        />
      </mesh>

      {/* Mesial Root (Left Root) */}
      <mesh position={[-0.12, -0.28, 0]} rotation={[0, 0, 0.12]}>
        <coneGeometry args={[0.12, 0.46, 16]} />
        <meshPhysicalMaterial
          color="#f8fafc"
          roughness={0.2}
          clearcoat={0.7}
        />
      </mesh>

      {/* Distal Root (Right Root) */}
      <mesh position={[0.12, -0.28, 0]} rotation={[0, 0, -0.12]}>
        <coneGeometry args={[0.12, 0.46, 16]} />
        <meshPhysicalMaterial
          color="#f8fafc"
          roughness={0.2}
          clearcoat={0.7}
        />
      </mesh>

      {/* Glowing Preventive Halo Ring */}
      <mesh ref={haloRef} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.015, 12, 48]} />
        <meshBasicMaterial
          color={isHovered || isActive ? "#2dd4bf" : "#0d9488"}
          transparent
          opacity={isHovered || isActive ? 0.85 : 0.4}
        />
      </mesh>
    </group>
  );
}
