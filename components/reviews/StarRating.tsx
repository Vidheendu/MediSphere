"use client";

import React, { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  max?: number;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function StarRating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  size = "md",
  className = "",
  showText = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const activeValue = hoverValue !== null ? hoverValue : value;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent, starIdx: number) => {
    if (readOnly || !onChange) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(starIdx);
    } else if (e.key === "ArrowRight" && starIdx < max) {
      e.preventDefault();
      onChange(starIdx + 1);
    } else if (e.key === "ArrowLeft" && starIdx > 1) {
      e.preventDefault();
      onChange(starIdx - 1);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className="flex items-center gap-1"
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `Rating: ${value} out of ${max} stars` : "Rating selection"}
        onMouseLeave={() => !readOnly && setHoverValue(null)}
      >
        {Array.from({ length: max }, (_, i) => {
          const starNumber = i + 1;
          const isFilled = starNumber <= activeValue;

          if (readOnly) {
            return (
              <svg
                key={starNumber}
                className={`${sizeClasses} ${
                  isFilled ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-100"
                } transition-colors`}
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            );
          }

          return (
            <button
              key={starNumber}
              type="button"
              role="radio"
              aria-checked={value === starNumber}
              aria-label={`${starNumber} star${starNumber > 1 ? "s" : ""} - ${RATING_LABELS[starNumber] || ""}`}
              onClick={() => onChange && onChange(starNumber)}
              onMouseEnter={() => setHoverValue(starNumber)}
              onKeyDown={(e) => handleKeyDown(e, starNumber)}
              className="p-0.5 rounded-sm hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 transition-transform cursor-pointer"
            >
              <svg
                className={`${sizeClasses} ${
                  isFilled ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-100"
                } transition-colors`}
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>

      {showText && activeValue > 0 && (
        <span className="text-xs font-semibold text-slate-700 ml-1">
          {RATING_LABELS[activeValue]}
        </span>
      )}
    </div>
  );
}
