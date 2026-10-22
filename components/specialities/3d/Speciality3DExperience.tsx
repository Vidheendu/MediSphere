"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SPECIALITIES_3D_CONFIG } from "./types";
import SpecialityInspectorCard from "./SpecialityInspectorCard";
import Speciality2DView from "./Speciality2DView";
import Speciality3DLoadingFallback from "./Speciality3DLoadingFallback";

// Lazy-load 3D Canvas with ssr: false to prevent SSR hydration errors
const Speciality3DCanvas = dynamic(() => import("./Speciality3DCanvas"), {
  ssr: false,
  loading: () => <Speciality3DLoadingFallback />,
});

// Safe client-side WebGL detection helper
function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// React 19 external store subscriptions for pure, non-cascading client-side snapshots
const emptySubscribe = () => () => {};

function subscribeMediaQuery(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function subscribeResize(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export default function Speciality3DExperience() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const reducedMotionPref = useSyncExternalStore(
    subscribeMediaQuery,
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false
  );

  const isSmallScreen = useSyncExternalStore(
    subscribeResize,
    () => (typeof window !== "undefined" ? window.innerWidth < 768 : false),
    () => false
  );

  const hardwareWebGL = useSyncExternalStore(
    emptySubscribe,
    () => detectWebGL(),
    () => true
  );

  // User interactive state overrides
  const [userModeOverride, setUserModeOverride] = useState<"3d" | "2d" | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>("cardiology");
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webGLError, setWebGLError] = useState<boolean>(false);

  // Effective mode: if WebGL is unavailable or failed, force 2D.
  // Otherwise if user selected, respect choice.
  // Otherwise default to 2D on small mobile screens for ergonomics, 3D on desktop.
  const hasWebGL = hardwareWebGL && !webGLError;
  const effectiveViewMode: "3d" | "2d" = !hasWebGL
    ? "2d"
    : userModeOverride !== null
    ? userModeOverride
    : isSmallScreen
    ? "2d"
    : "3d";

  const handleSelect = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const handleHover = useCallback((slug: string | null) => {
    setHoveredSlug(slug);
    if (slug) {
      setActiveSlug(slug);
    }
  }, []);

  const handleWebGLError = useCallback(() => {
    console.warn("[Speciality3DExperience] Switching to 2D view due to WebGL error");
    setWebGLError(true);
  }, []);

  const activeSpeciality =
    SPECIALITIES_3D_CONFIG.find((s) => s.slug === activeSlug) ||
    SPECIALITIES_3D_CONFIG[0];

  return (
    <section
      id="specialities"
      className="relative overflow-hidden bg-[#070d18] text-slate-100 py-16 sm:py-20 lg:py-24 border-b border-cyan-950/40"
      aria-label="Medical specialities 3D discovery section"
    >
      {/* Background Ambient Cyber Glows */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 sm:mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3 shadow-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Interactive 3D Healthcare Discovery
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Medical Specialities
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore Bhopal&apos;s verified healthcare departments in an interactive 3D spatial
              environment. Rotate to explore, hover to inspect, and connect directly with verified
              doctors.
            </p>
          </div>

          {/* Mode Switcher & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle (3D vs 2D) */}
            <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1 shadow-md">
              <button
                type="button"
                onClick={() => setUserModeOverride("3d")}
                disabled={!hasWebGL}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  effectiveViewMode === "3d" && hasWebGL
                    ? "bg-cyan-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                aria-pressed={effectiveViewMode === "3d"}
                title={hasWebGL ? "Switch to 3D Spatial View" : "WebGL not available on this device"}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                  />
                </svg>
                <span>3D Spatial</span>
              </button>

              <button
                type="button"
                onClick={() => setUserModeOverride("2d")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  effectiveViewMode === "2d"
                    ? "bg-cyan-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-pressed={effectiveViewMode === "2d"}
                title="Switch to Accessible 2D Grid"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <span>2D Grid</span>
              </button>
            </div>

            {/* In 3D Mode: Auto-Rotate Toggle */}
            {effectiveViewMode === "3d" && hasWebGL && (
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  autoRotate && !reducedMotionPref
                    ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
                title={autoRotate ? "Pause orbital auto-rotation" : "Enable orbital auto-rotation"}
                aria-label={autoRotate ? "Pause rotation" : "Enable rotation"}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{autoRotate && !reducedMotionPref ? "Rotating" : "Paused"}</span>
              </button>
            )}

            {/* Reduced motion badge notice */}
            {reducedMotionPref && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-medium text-slate-400">
                Reduced Motion Active
              </span>
            )}
          </div>
        </div>

        {/* Screen Reader & Keyboard Navigation Skip Rail */}
        <nav
          aria-label="Accessible medical specialities directory"
          className="sr-only focus-within:not-sr-only focus-within:relative focus-within:z-30 focus-within:mb-6 focus-within:p-4 focus-within:bg-slate-900 focus-within:border focus-within:border-cyan-400 focus-within:rounded-xl"
        >
          <p className="text-xs font-bold text-cyan-300 mb-2">
            Accessible Keyboard Navigation for All 6 Specialities:
          </p>
          <ul className="flex flex-wrap gap-2">
            {SPECIALITIES_3D_CONFIG.map((spec) => (
              <li key={spec.slug}>
                <Link
                  href={`/specialities/${spec.slug}`}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-200 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {spec.name} ({spec.tagline})
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Display: 3D Hologram Scene or 2D Grid */}
        {isClient && effectiveViewMode === "3d" && hasWebGL ? (
          <div className="space-y-6">
            {/* 3D Canvas Viewport */}
            <div className="relative">
              <Speciality3DCanvas
                activeSlug={activeSlug}
                hoveredSlug={hoveredSlug}
                onHover={handleHover}
                onSelect={handleSelect}
                autoRotate={autoRotate}
                reducedMotion={reducedMotionPref}
                onWebGLError={handleWebGLError}
              />

              {/* 3D Viewport Controls Hint */}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span className="rounded-lg bg-slate-950/80 px-2.5 py-1 backdrop-blur-xs border border-slate-800">
                  🖱️ Drag to orbit • Scroll to zoom • Click a speciality node to inspect
                </span>
                <span className="hidden sm:inline-block rounded-lg bg-slate-950/80 px-2.5 py-1 backdrop-blur-xs border border-slate-800 font-mono text-cyan-400">
                  WebGL High Performance
                </span>
              </div>
            </div>

            {/* Active Speciality Inspector HUD Card */}
            <SpecialityInspectorCard
              speciality={activeSpeciality}
              allSpecialities={SPECIALITIES_3D_CONFIG}
              onSelect={handleSelect}
            />
          </div>
        ) : (
          /* Accessible 2D Grid Mode (Default for Mobile or low-spec devices or manual toggle) */
          <div className="space-y-6">
            {!hasWebGL && isClient && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200">
                <span className="font-semibold">Notice:</span> 3D hardware acceleration is
                unavailable on this device or browser session. MediSphere is displaying the standard
                high-contrast 2D view.
              </div>
            )}
            <Speciality2DView specialities={SPECIALITIES_3D_CONFIG} />
          </div>
        )}

        {/* Bottom Actions & Guarantee */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg
              className="h-4 w-4 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Verified medical practitioners across Bhopal — zero simulated data.</span>
          </div>

          <Link
            href="/specialities"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-cyan-500 transition-colors"
          >
            <span>Explore All Specialities in Bhopal</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
