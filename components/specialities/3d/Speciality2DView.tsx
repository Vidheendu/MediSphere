"use client";

import React from "react";
import Link from "next/link";
import SpecialityIcon from "@/components/specialities/SpecialityIcon";
import type { Speciality3DData } from "./types";

interface Speciality2DViewProps {
  specialities: Speciality3DData[];
  title?: string;
  subtitle?: string;
}

export default function Speciality2DView({
  specialities,
  title = "Medical Specialities Directory",
  subtitle = "Direct 2D accessible navigation for verified healthcare categories in Bhopal.",
}: Speciality2DViewProps) {
  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <span className="text-xs font-mono text-cyan-400/80 font-semibold">
          6 Verified Categories
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {specialities.map((item) => (
          <Link
            key={item.slug}
            href={`/specialities/${item.slug}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/75 p-6 backdrop-blur-md transition-all duration-200 hover:border-cyan-500/50 hover:bg-slate-900/95 hover:shadow-xl hover:shadow-cyan-950/20 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <div>
              {/* Header: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-105"
                  style={{ backgroundColor: item.accentColor }}
                >
                  <SpecialityIcon
                    slug={item.slug}
                    name={item.name}
                    className="h-6 w-6"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
                  {item.badgeNumber}
                </span>
              </div>

              {/* Title & Tagline */}
              <h4 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                {item.name}
              </h4>
              <p className="mt-1 text-xs font-semibold text-cyan-400/90">
                {item.tagline}
              </p>

              {/* Description */}
              <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                {item.description}
              </p>

              {/* Focus chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.focusAreas.map((area) => (
                  <span
                    key={area}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Direct CTA footer */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
              <span>View {item.name} Doctors</span>
              <svg
                className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
