"use client";

export default function LotusLoader({ size = 54 }: { size?: number }) {
  return (
    <div className="hts-lotusLoader" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        width="100%"
        height="100%"
        aria-hidden="true"
        className="hts-lotusSvg"
      >
        <defs>
          {/* Petal mask: chỉ hiện trong vùng “cánh hoa” */}
          <mask id="petalMask">
            <rect width="64" height="64" fill="black" />
            {/* 4 cánh kiểu “ribbon/lotus” (tối ưu để nhìn rõ ở size nhỏ) */}
            <path
              d="M18 12c10 0 16 6 16 12 0 8-8 10-16 10-4 0-10-2-10-8 0-8 4-14 10-14z"
              fill="white"
            />
            <path
              d="M46 52c-10 0-16-6-16-12 0-8 8-10 16-10 4 0 10 2 10 8 0 8-4 14-10 14z"
              fill="white"
            />
            <path
              d="M52 18c0 10-6 16-12 16-8 0-10-8-10-16 0-4 2-10 8-10 8 0 14 4 14 10z"
              fill="white"
            />
            <path
              d="M12 46c0-10 6-16 12-16 8 0 10 8 10 16 0 4-2 10-8 10-8 0-14-4-14-10z"
              fill="white"
            />
          </mask>

          {/* nền trong vòng tròn */}
          <radialGradient id="bg" cx="35%" cy="25%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>

          {/* gradient hồng */}
          <linearGradient id="pinkGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,0,120,0.92)" />
            <stop offset="55%" stopColor="rgba(255,120,190,0.75)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </linearGradient>
        </defs>

        {/* Base circle */}
        <circle cx="32" cy="32" r="31" fill="url(#bg)" />

        {/* White petals (luôn thấy) */}
        <g mask="url(#petalMask)" className="hts-lotusWhite">
          <rect width="64" height="64" fill="rgba(255,255,255,0.90)" />
        </g>

        {/* Pink rise layer: rect “dâng lên” trong petalMask */}
        <g mask="url(#petalMask)">
          <rect
            x="0"
            y="64"
            width="64"
            height="64"
            fill="url(#pinkGrad)"
            className="hts-lotusRise"
          />
        </g>

        {/* Glow core */}
        <circle cx="32" cy="36" r="18" className="hts-lotusCore" />

        {/* Sweep rotate */}
        <g className="hts-lotusSweep">
          <path
            d="M32 2 A30 30 0 0 1 62 32"
            fill="none"
            stroke="rgba(255,0,120,0.16)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </g>

        {/* Outer ring */}
        <circle cx="32" cy="32" r="31" className="hts-lotusRing" />
      </svg>
    </div>
  );
}
