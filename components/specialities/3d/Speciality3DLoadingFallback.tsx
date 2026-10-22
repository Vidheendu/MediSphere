"use client";

import React from "react";

export default function Speciality3DLoadingFallback() {
  return (
    <div className="relative flex w-full h-[480px] sm:h-[540px] lg:h-[620px] flex-col items-center justify-center rounded-2xl bg-[#070d18] border border-cyan-950/40 p-6 text-center shadow-2xl">
      {/* Outer Pulse Ring */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/20" />
        <div className="h-14 w-14 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="absolute h-4 w-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
      </div>

      <p className="mt-6 text-sm font-bold tracking-wider uppercase text-cyan-300">
        Initializing 3D Discovery Experience
      </p>
      <p className="mt-1 text-xs text-slate-400 max-w-sm">
        Calibrating interactive holographic specialities and WebGL hardware acceleration...
      </p>
    </div>
  );
}
