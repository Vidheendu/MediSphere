"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface NeuroBrain3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function NeuroBrain3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: NeuroBrain3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Neural node coordinates (12 cortex synaptic points)
  const synapticNodes: [number, number, number][] = [
    [-0.35, 0.25, 0.2],
    [0.35, 0.25, 0.2],
    [-0.38, -0.1, 0.22],
    [0.38, -0.1, 0.22],
    [-0.2, 0.42, -0.15],
    [0.2, 0.42, -0.15],
    [-0.32, -0.25, -0.18],
    [0.32, -0.25, -0.18],
    [0.0, 0.38, 0.3],
    [-0.42, 0.1, -0.1],
    [0.42, 0.1, -0.1],
    [0.0, -0.35, 0.1],
  ];

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      groupRef.current.rotation.y += delta * 0.4;
      if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.8;
      if (ring2Ref.current) ring2Ref.current.rotation.x -= delta * 0.6;

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
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Left Hemisphere */}
      <mesh position={[-0.18, 0, 0]} scale={[0.38, 0.48, 0.52]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial
          color="#4338ca"
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.8}
          emissive={isActive ? "#818cf8" : isHovered ? "#6366f1" : "#312e81"}
          emissiveIntensity={isActive ? 0.7 : isHovered ? 0.5 : 0.3}
          wireframe={false}
        />
      </mesh>

      {/* Right Hemisphere */}
      <mesh position={[0.18, 0, 0]} scale={[0.38, 0.48, 0.52]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial
          color="#4338ca"
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.8}
          emissive={isActive ? "#818cf8" : isHovered ? "#6366f1" : "#312e81"}
          emissiveIntensity={isActive ? 0.7 : isHovered ? 0.5 : 0.3}
          wireframe={false}
        />
      </mesh>

      {/* Brainstem / Spine Base */}
      <mesh position={[0, -0.42, -0.1]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.06, 0.35, 16]} />
        <meshStandardMaterial
          color="#6366f1"
          roughness={0.3}
          emissive="#818cf8"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Synaptic Nodes (Glowing points across cortex) */}
      {synapticNodes.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial
            color={idx % 2 === 0 ? "#38bdf8" : "#c084fc"}
          />
        </mesh>
      ))}

      {/* Synaptic Orbit Ring 1 */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0.3, 0]}>
        <torusGeometry args={[0.88, 0.014, 12, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHovered || isActive ? 0.8 : 0.4}
        />
      </mesh>

      {/* Synaptic Orbit Ring 2 */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 3, -0.4, 0]}>
        <torusGeometry args={[0.98, 0.012, 12, 48]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={isHovered || isActive ? 0.75 : 0.35}
        />
      </mesh>
    </group>
  );
}
