"use client";

import React, { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import Speciality3DScene from "./Speciality3DScene";

interface Speciality3DCanvasProps {
  activeSlug: string;
  hoveredSlug: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
  autoRotate: boolean;
  reducedMotion?: boolean;
  onWebGLError?: () => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  onError?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[Speciality3DCanvas] WebGL render error caught:", error.message);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function Speciality3DCanvas({
  activeSlug,
  hoveredSlug,
  onHover,
  onSelect,
  autoRotate,
  reducedMotion = false,
  onWebGLError,
}: Speciality3DCanvasProps) {
  return (
    <div className="relative w-full h-[480px] sm:h-[540px] lg:h-[620px] rounded-2xl overflow-hidden bg-[#070d18] border border-cyan-950/40 shadow-2xl">
      <WebGLErrorBoundary
        onError={onWebGLError}
        fallback={
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-slate-300">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-cyan-400">WebGL Acceleration Notice</p>
              <p className="mt-1 text-xs text-slate-400">
                Interactive 3D acceleration is not available in your current browser session.
                Switching to the standard 2D view.
              </p>
            </div>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 4.2, 9.6], fov: 46 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          className="touch-none"
        >
          <color attach="background" args={["#070d18"]} />
          <fog attach="fog" args={["#070d18", 10, 22]} />
          <Speciality3DScene
            activeSlug={activeSlug}
            hoveredSlug={hoveredSlug}
            onHover={onHover}
            onSelect={onSelect}
            autoRotate={autoRotate}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
