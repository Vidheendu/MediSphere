"use client";

import React, { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import type { Speciality3DData } from "./types";
import CardioHeart3D from "./models/CardioHeart3D";
import NeuroBrain3D from "./models/NeuroBrain3D";
import OrthoSpine3D from "./models/OrthoSpine3D";
import DentalTooth3D from "./models/DentalTooth3D";
import EntCochlea3D from "./models/EntCochlea3D";
import DermaShield3D from "./models/DermaShield3D";

interface SpecialityNode3DProps {
  speciality: Speciality3DData;
  position: [number, number, number];
  isActive: boolean;
  isHovered: boolean;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  reducedMotion?: boolean;
}

export default function SpecialityNode3D({
  speciality,
  position,
  isActive,
  isHovered,
  onHover,
  onSelect,
  reducedMotion = false,
}: SpecialityNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [internalHover, setInternalHover] = useState(false);

  const hovered = isHovered || internalHover;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      // Pedestal glow ring rotation
      if (ringRef.current) {
        ringRef.current.rotation.z += delta * (hovered || isActive ? 1.2 : 0.4);
      }

      // Smooth scale transition when hovered or active
      const targetScale = hovered || isActive ? 1.12 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 6
      );
    } else {
      const targetScale = hovered || isActive ? 1.12 : 1.0;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  });

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    setInternalHover(true);
    onHover(speciality.slug);
  };

  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
    setInternalHover(false);
    onHover(null);
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(speciality.slug);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible Expanded Hitbox for effortless raycasting & clicks */}
      <mesh
        position={[0, 0.4, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        visible={false}
      >
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Holographic Pedestal Glass Disc */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.78, 0.08, 32]} />
        <meshPhysicalMaterial
          color="#0b172a"
          roughness={0.15}
          metalness={0.8}
          clearcoat={0.9}
          transmission={0.4}
          ior={1.4}
        />
      </mesh>

      {/* Glowing Energy Ring on Pedestal */}
      <mesh
        ref={ringRef}
        position={[0, -0.34, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.55, 0.68, 32]} />
        <meshBasicMaterial
          color={hovered || isActive ? speciality.glowColor : speciality.emissiveColor}
          side={THREE.DoubleSide}
          transparent
          opacity={hovered || isActive ? 0.95 : 0.5}
        />
      </mesh>

      {/* Radial Spot Accent beneath Model */}
      <pointLight
        position={[0, -0.1, 0]}
        color={speciality.glowColor}
        intensity={hovered || isActive ? 2.5 : 0.8}
        distance={2.5}
      />

      {/* Floating Procedural 3D Model */}
      <Float
        speed={reducedMotion ? 0 : 2}
        rotationIntensity={reducedMotion ? 0 : 0.3}
        floatIntensity={reducedMotion ? 0 : 0.4}
      >
        <group position={[0, 0.45, 0]}>
          {speciality.slug === "cardiology" && (
            <CardioHeart3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
          {speciality.slug === "neurology" && (
            <NeuroBrain3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
          {speciality.slug === "orthopedics" && (
            <OrthoSpine3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
          {speciality.slug === "dentistry" && (
            <DentalTooth3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
          {speciality.slug === "ent" && (
            <EntCochlea3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
          {speciality.slug === "dermatology" && (
            <DermaShield3D
              isHovered={hovered}
              isActive={isActive}
              reducedMotion={reducedMotion}
            />
          )}
        </group>
      </Float>

      {/* Floating 3D HTML Label */}
      <Html
        center
        position={[0, -0.85, 0]}
        distanceFactor={10}
        style={{ pointerEvents: "auto", userSelect: "none" }}
      >
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={handlePointerOver}
          onMouseLeave={handlePointerOut}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 border cursor-pointer whitespace-nowrap shadow-lg ${
            isActive
              ? "bg-slate-900/90 border-cyan-400 text-white shadow-cyan-500/30 scale-105"
              : hovered
              ? "bg-slate-900/80 border-slate-400 text-cyan-200 scale-105"
              : "bg-slate-950/75 border-slate-700/70 text-slate-300 hover:border-slate-500"
          }`}
          aria-label={`View ${speciality.name} details in 3D`}
        >
          <span
            className="w-2 h-2 rounded-full inline-block animate-pulse"
            style={{ backgroundColor: speciality.accentColor }}
          />
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {speciality.badgeNumber}
          </span>
          <span className="text-xs font-semibold tracking-wide">
            {speciality.name}
          </span>
        </button>
      </Html>
    </group>
  );
}
