"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface OrthoSpine3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function OrthoSpine3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: OrthoSpine3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 4 vertebral body heights
  const vertebraeY = [0.45, 0.15, -0.15, -0.45];

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y += delta * 0.35;
      
      // Articulation sway
      groupRef.current.rotation.z = Math.sin(time * 1.5) * 0.05;

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
      {/* Central Spinal Canal Rod */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.25, 16]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.2}
          emissive="#38bdf8"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Vertebrae Stack */}
      {vertebraeY.map((y, idx) => (
        <group key={idx} position={[0, y, 0]}>
          {/* Main Vertebral Body */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.34, 0.16, 24]} />
            <meshPhysicalMaterial
              color="#f8fafc"
              roughness={0.15}
              metalness={0.1}
              clearcoat={0.9}
              clearcoatRoughness={0.1}
              emissive={isActive ? "#38bdf8" : isHovered ? "#7dd3fc" : "#0284c7"}
              emissiveIntensity={isActive ? 0.35 : isHovered ? 0.25 : 0.08}
            />
          </mesh>

          {/* Transverse Lateral Processes (left and right bone wings) */}
          <mesh position={[-0.34, 0, -0.05]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.26, 0.08, 0.12]} />
            <meshPhysicalMaterial
              color="#e2e8f0"
              roughness={0.2}
              clearcoat={0.8}
            />
          </mesh>
          <mesh position={[0.34, 0, -0.05]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.26, 0.08, 0.12]} />
            <meshPhysicalMaterial
              color="#e2e8f0"
              roughness={0.2}
              clearcoat={0.8}
            />
          </mesh>

          {/* Posterior Spinous Process */}
          <mesh position={[0, 0.02, -0.32]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.1, 0.08, 0.25]} />
            <meshPhysicalMaterial
              color="#cbd5e1"
              roughness={0.2}
              clearcoat={0.8}
            />
          </mesh>

          {/* Glowing Intervertebral Disc (between vertebrae) */}
          {idx < vertebraeY.length - 1 && (
            <mesh position={[0, -0.14, 0]}>
              <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} />
              <meshBasicMaterial
                color={isHovered || isActive ? "#00f0ff" : "#0ea5e9"}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Stability Alignment Torus */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[0.82, 0.015, 12, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHovered || isActive ? 0.8 : 0.35}
        />
      </mesh>
    </group>
  );
}
