"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface CardioHeart3DProps {
  isHovered: boolean;
  isActive: boolean;
  reducedMotion?: boolean;
}

export default function CardioHeart3D({
  isHovered,
  isActive,
  reducedMotion = false,
}: CardioHeart3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Procedural heart shape geometry
  const heartGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const x = 0;
    const y = 0;
    shape.moveTo(x, y + 0.35);
    shape.bezierCurveTo(x, y + 0.8, x - 0.8, y + 0.8, x - 0.8, y + 0.35);
    shape.bezierCurveTo(x - 0.8, y - 0.15, x - 0.35, y - 0.5, x, y - 0.85);
    shape.bezierCurveTo(x + 0.35, y - 0.5, x + 0.8, y - 0.15, x + 0.8, y + 0.35);
    shape.bezierCurveTo(x + 0.8, y + 0.8, x, y + 0.8, x, y + 0.35);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      const time = state.clock.getElapsedTime();
      // Gentle floating rotation
      groupRef.current.rotation.y += delta * 0.45;
      
      // Cardiac pulse rhythm (systole & diastole)
      const heartbeat = Math.sin(time * 3.8);
      const pulseScale = heartbeat > 0.4 ? 1 + (heartbeat - 0.4) * 0.12 : 1;
      const targetBase = isHovered || isActive ? 1.15 : 1.0;
      const finalScale = targetBase * pulseScale;
      groupRef.current.scale.lerp(
        new THREE.Vector3(finalScale, finalScale, finalScale),
        delta * 8
      );
    } else {
      const targetBase = isHovered || isActive ? 1.15 : 1.0;
      groupRef.current.scale.set(targetBase, targetBase, targetBase);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Main Heart Body */}
      <mesh geometry={heartGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#e11d48"
          roughness={0.25}
          metalness={0.15}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          emissive={isActive ? "#fb7185" : isHovered ? "#f43f5e" : "#881337"}
          emissiveIntensity={isActive ? 0.6 : isHovered ? 0.45 : 0.25}
        />
      </mesh>

      {/* Aorta Arch */}
      <mesh position={[-0.12, 0.48, 0]} rotation={[0, 0, Math.PI * 0.2]}>
        <torusGeometry args={[0.22, 0.065, 16, 24, Math.PI * 0.85]} />
        <meshStandardMaterial
          color="#be123c"
          roughness={0.3}
          metalness={0.2}
          emissive="#f43f5e"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Branching Arteries */}
      <mesh position={[-0.05, 0.68, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 12]} />
        <meshStandardMaterial color="#f43f5e" emissive="#fb7185" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.2, 0.64, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.035, 0.035, 0.15, 12]} />
        <meshStandardMaterial color="#f43f5e" emissive="#fb7185" emissiveIntensity={0.4} />
      </mesh>

      {/* ECG Rhythm Orbital Ring */}
      <mesh rotation={[Math.PI / 2.5, 0.2, 0]}>
        <torusGeometry args={[0.95, 0.015, 12, 48]} />
        <meshBasicMaterial
          color={isHovered || isActive ? "#38bdf8" : "#0284c7"}
          transparent
          opacity={isHovered || isActive ? 0.85 : 0.45}
        />
      </mesh>
    </group>
  );
}
