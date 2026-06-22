"use client";

import { useId } from "react";

export default function Logo({
  size = 28,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  const id = useId();
  const gradId = `prism-grad-${id}`;
  const beamId = `prism-beam-${id}`;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="4" y1="26" x2="28" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3D7FFF" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={beamId} x1="2" y1="16" x2="14" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EDEFF7" stopOpacity="0" />
            <stop offset="100%" stopColor="#EDEFF7" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <line x1="2" y1="16" x2="13" y2="16" stroke={`url(#${beamId})`} strokeWidth="1.5" strokeLinecap="round" />

        <path
          d="M16 5L27 24H5L16 5Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.16"
          stroke={`url(#${gradId})`}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        <line x1="19" y1="17" x2="30" y2="12" stroke="#3D7FFF" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        <line x1="19.5" y1="19" x2="30.5" y2="18" stroke="#6C8CFF" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        <line x1="19" y1="21" x2="30" y2="24" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
      </svg>

      {withWordmark && (
        <span className="text-[28px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-gradient">PRism</span>
        </span>
      )}
    </span>
  );
}