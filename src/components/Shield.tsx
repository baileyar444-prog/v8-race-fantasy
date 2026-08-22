"use client";

import { useId } from "react";

type ShieldProps = {
  baseColour?: string;
  patternColour?: string;
  pattern?: string;
  number?: number | string;
  size?: number;
};

type PatternShape = {
  points?: string;
  d?: string;
  opacity?: number;
};

function patternShapes(pattern: string): PatternShape[] {
  switch (pattern) {
    case "stripe":
      return [
        { points: "72,-10 105,6 30,110 -4,94" }
      ];

    case "half":
      return [
        { points: "50,0 92,14 84,78 50,100 50,0" }
      ];

    case "v":
      return [
        { points: "8,14 26,20 50,64 74,20 92,14 84,78 50,100 16,78" }
      ];

    case "chevron-wide":
      return [
        { points: "8,14 28,20 50,54 72,20 92,14 84,37 50,72 16,37" }
      ];

    case "chevron-double":
      return [
        { points: "8,14 23,19 50,45 77,19 92,14 86,29 50,62 14,29" },
        { points: "16,62 50,84 84,62 81,78 50,100 19,78" }
      ];

    case "chevron-triple":
      return [
        { points: "8,14 21,18 50,38 79,18 92,14 87,27 50,49 13,27" },
        { points: "13,39 50,60 87,39 84,51 50,72 16,51" },
        { points: "18,66 50,86 82,66 78,80 50,100 22,80" }
      ];

    case "chevron-left":
      return [
        { points: "8,14 28,20 54,100 32,88 14,78" }
      ];

    case "chevron-right":
      return [
        { points: "92,14 72,20 46,100 68,88 86,78" }
      ];

    case "chevron-centre":
      return [
        { points: "42,2 58,2 58,95 50,100 42,95" },
        { points: "8,14 22,18 50,52 78,18 92,14 86,30 50,70 14,30", opacity: 0.75 }
      ];

    case "chevron":
    default:
      return [
        { points: "8,14 25,19 50,50 75,19 92,14 86,32 50,70 14,32" }
      ];
  }
}

export function Shield({
  baseColour = "#ff7a1a",
  patternColour = "#111827",
  pattern = "chevron",
  number = "88",
  size = 48
}: ShieldProps) {
  const safeNumber = String(number || "88").slice(0, 3);
  const fontSize = safeNumber.length >= 3 ? 26 : safeNumber.length === 2 ? 32 : 38;
  const shapes = patternShapes(pattern);
  const uid = useId().replace(/:/g, "");
  const clipId = `shield-clip-${uid}`;
  const shadowId = `shield-shadow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      role="img"
      aria-label={`Garage badge ${safeNumber}`}
      className="shrink-0 drop-shadow-[0_0_18px_rgba(255,122,26,.35)]"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M50 2 L92 16 L84 82 L50 108 L16 82 L8 16 Z" />
        </clipPath>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <path
          d="M50 2 L92 16 L84 82 L50 108 L16 82 L8 16 Z"
          fill={baseColour}
          stroke="rgba(255,255,255,.32)"
          strokeWidth="2"
        />

        <g clipPath={`url(#${clipId})`}>
          {shapes.map((shape, index) =>
            shape.d ? (
              <path
                key={index}
                d={shape.d}
                fill={patternColour}
                opacity={shape.opacity ?? 1}
              />
            ) : (
              <polygon
                key={index}
                points={shape.points}
                fill={patternColour}
                opacity={shape.opacity ?? 1}
              />
            )
          )}

          <path
            d="M14 18 L50 6 L86 18"
            fill="none"
            stroke="rgba(255,255,255,.18)"
            strokeWidth="4"
          />
        </g>

        <path
          d="M50 2 L92 16 L84 82 L50 108 L16 82 L8 16 Z"
          fill="none"
          stroke="rgba(255,255,255,.22)"
          strokeWidth="2"
        />
      </g>

      <text
        x="50"
        y="61"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Arial Black, Impact, system-ui, sans-serif"
        fill="#ffffff"
        stroke="rgba(0,0,0,.55)"
        strokeWidth="4"
        paintOrder="stroke"
      >
        {safeNumber}
      </text>
    </svg>
  );
}
