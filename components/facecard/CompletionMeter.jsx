"use client";

import { useId } from "react";
import clsx from "clsx";

/**
 * Facecard % completion meter (Figma AL-001).
 * Desktop node 10945:29695 · Mobile node 10945:39253
 *
 * Structure: dark glass disc + full gold rings + leftward neon progress arc.
 * Figma uses gold + mix-blend (plus-lighter / color-dodge) on purple to get
 * magenta neon; we recreate that look with pink strokes + SVG blur so we
 * avoid the rectangular mix-blend compositing artifact.
 */
const SIZE_CONFIG = {
  mobile: {
    box: 104,
    numberClass: "text-[18px] leading-none",
    percentClass: "text-[15px] leading-none",
    textOffsetX: 2.5,
  },
  desktop: {
    box: 238,
    numberClass: "text-[41.5px] leading-none",
    percentClass: "text-[34.5px] leading-none",
    textOffsetX: 6,
  },
};

// Figma desktop frame coordinates (10945:29695), shared viewBox for both sizes.
const VB = 238.804;
const CX = 119.402;
const CY = 119.402;
const CENTER_R = 84.96;
const OUTER_RING_OUTER = 103.328;
const OUTER_RING_INNER = 88.863;
const INNER_RING_OUTER = 84.956;
const INNER_RING_INNER = 81.563;
const PROGRESS_R = (119.4 + 105.06) / 2;
const PROGRESS_SW = 119.4 - 105.06;
const PROGRESS_SW_SHARP = 10.5;

export default function CompletionMeter({
  percent = 0,
  size = "desktop",
  className,
}) {
  const uid = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.desktop;

  const outerRingR = (OUTER_RING_OUTER + OUTER_RING_INNER) / 2;
  const outerRingSw = OUTER_RING_OUTER - OUTER_RING_INNER;
  const innerRingR = (INNER_RING_OUTER + INNER_RING_INNER) / 2;
  const innerRingSw = INNER_RING_OUTER - INNER_RING_INNER;

  const circ = 2 * Math.PI * PROGRESS_R;
  const dashOffset = circ * (1 - clamped / 100);
  const blurId = `cm_glow_${uid}`;
  const sheenId = `cm_sheen_${uid}`;

  return (
    <div
      className={clsx(
        "relative flex items-center justify-center overflow-visible",
        className,
      )}
      style={{ width: config.box, height: config.box }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped} percent complete`}
    >
      <svg
        width={config.box}
        height={config.box}
        viewBox={`0 0 ${VB} ${VB}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 overflow-visible"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <linearGradient
            id={sheenId}
            x1="0.28"
            y1="0.08"
            x2="0.78"
            y2="0.92"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
            <stop offset="0.42" stopColor="#250641" stopOpacity="0" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>
          <filter
            id={blurId}
            x="-50"
            y="-50"
            width="340"
            height="340"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ellipse 28 — dark glass disc */}
        <circle cx={CX} cy={CY} r={CENTER_R} fill="#250641" fillOpacity="0.55" />
        <circle cx={CX} cy={CY} r={CENTER_R} fill={`url(#${sheenId})`} />

        {/* Ellipse 30 — thick gold ring (always full) */}
        <circle
          cx={CX}
          cy={CY}
          r={outerRingR}
          stroke="#FFBC2B"
          strokeWidth={outerRingSw}
        />

        {/* Ellipse 35 — thin inner gold ring (always full) */}
        <circle
          cx={CX}
          cy={CY}
          r={innerRingR}
          stroke="#FFBC2B"
          strokeWidth={innerRingSw}
        />

        {/*
          Progress arcs (Ellipse 29 / 34 visual result).
          Flipped so fill grows counter-clockwise from 12 o'clock (left side).
        */}
        {clamped > 0 && (
          <g
            transform={`translate(${CX} ${CY}) scale(-1 1) translate(${-CX} ${-CY})`}
          >
            {/* Soft outer magenta bloom */}
            <circle
              cx={CX}
              cy={CY}
              r={PROGRESS_R}
              stroke="#FF2EB6"
              strokeWidth={PROGRESS_SW + 6}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={0.55}
              filter={`url(#${blurId})`}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
            {/* Neon tube body */}
            <circle
              cx={CX}
              cy={CY}
              r={PROGRESS_R}
              stroke="#FF5AC8"
              strokeWidth={PROGRESS_SW_SHARP}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              filter={`url(#${blurId})`}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
            {/* Hot core */}
            <circle
              cx={CX}
              cy={CY}
              r={PROGRESS_R}
              stroke="#FFF5FB"
              strokeWidth={Math.max(2.5, PROGRESS_SW_SHARP * 0.32)}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </g>
        )}
      </svg>

      <div
        className="relative z-10 flex items-end justify-center whitespace-nowrap text-white"
        style={{ transform: `translateX(${config.textOffsetX}px)` }}
      >
        <span
          className={clsx(
            "font-[family-name:var(--font-otomanopee)]",
            config.numberClass,
          )}
        >
          {clamped}
        </span>
        <span
          className={clsx(
            "font-[family-name:var(--font-outfit)] font-extralight",
            config.percentClass,
          )}
        >
          %
        </span>
      </div>
    </div>
  );
}
