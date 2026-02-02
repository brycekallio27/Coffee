export default function AuthIllustration() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#050b14]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.35),transparent_44%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.25),transparent_50%),radial-gradient(circle_at_25%_85%,rgba(168,85,247,0.28),transparent_50%),radial-gradient(circle_at_85%_85%,rgba(16,185,129,0.18),transparent_45%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.95]"
        viewBox="0 0 1400 820"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mugGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(34,211,238,0.35)" />
            <stop offset="0.55" stopColor="rgba(99,102,241,0.30)" />
            <stop offset="1" stopColor="rgba(168,85,247,0.22)" />
          </linearGradient>

          <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(30,58,138,0.95)" />
            <stop offset="1" stopColor="rgba(15,23,42,0.95)" />
          </linearGradient>

          <linearGradient id="tieGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(56,189,248,0.95)" />
            <stop offset="1" stopColor="rgba(34,211,238,0.70)" />
          </linearGradient>

          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="950" cy="735" rx="520" ry="85" fill="rgba(255,255,255,0.06)" />
        <ellipse cx="950" cy="740" rx="420" ry="55" fill="rgba(34,211,238,0.06)" />

        <g filter="url(#softGlow)">
          <path
            d="M840 190
               C840 150 875 120 915 120
               L1125 120
               C1165 120 1200 150 1200 190
               L1200 600
               C1200 660 1155 705 1095 705
               L945 705
               C885 705 840 660 840 600
               Z"
            fill="url(#mugGrad)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M860 175
               C860 150 882 130 910 130
               L1130 130
               C1158 130 1180 150 1180 175
               L1180 205
               C1180 230 1158 250 1130 250
               L910 250
               C882 250 860 230 860 205
               Z"
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M1200 270
               C1290 270 1335 335 1335 410
               C1335 485 1290 550 1200 550"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M1200 305
               C1265 305 1300 350 1300 410
               C1300 470 1265 515 1200 515"
            fill="none"
            stroke="rgba(5,11,20,0.55)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <text
            x="1020"
            y="355"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, -apple-system"
            fontSize="64"
            fontWeight="800"
            fill="rgba(255,255,255,0.88)"
          >
            Coffee?
          </text>

          <path
            d="M980 705
               L980 585
               C980 560 1000 540 1025 540
               C1050 540 1070 560 1070 585
               L1070 705"
            fill="rgba(5,11,20,0.55)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />
          <circle cx="1060" cy="625" r="5" fill="rgba(56,189,248,0.9)" />
        </g>

        <g transform="translate(560,470)" filter="url(#softGlow)">
          <ellipse cx="140" cy="250" rx="110" ry="22" fill="rgba(0,0,0,0.35)" />

          <path
            d="M120 160 C85 205 80 235 95 260 C115 292 150 290 165 258 C178 230 165 195 150 175 Z"
            fill="rgba(15,23,42,0.9)"
          />
          <path
            d="M185 165 C210 210 225 240 210 265 C192 295 160 295 150 268 C140 240 150 205 165 180 Z"
            fill="rgba(15,23,42,0.85)"
          />

          <path d="M85 262 C70 275 80 292 105 292 C128 292 133 276 120 265 Z" fill="rgba(2,6,23,0.95)" />
          <path d="M195 268 C180 280 190 297 216 297 C238 297 244 281 230 271 Z" fill="rgba(2,6,23,0.95)" />

          <path
            d="M105 85
               C110 55 135 40 165 40
               C195 40 220 55 225 85
               L245 170
               C250 195 230 210 205 210
               L125 210
               C100 210 80 195 85 170
               Z"
            fill="url(#suitGrad)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="2"
          />

          <path
            d="M138 78
               C145 62 155 55 165 55
               C175 55 185 62 192 78
               L188 150
               L165 168
               L142 150
               Z"
            fill="rgba(255,255,255,0.85)"
            opacity="0.9"
          />

          <path d="M165 75 L183 110 L165 205 L147 110 Z" fill="url(#tieGrad)" />

          <path
            d="M100 100 C70 120 55 145 62 165 C70 187 95 184 110 165 C120 150 118 125 125 112 Z"
            fill="url(#suitGrad)"
          />
          <path
            d="M230 105 C260 120 285 150 276 175 C266 202 240 190 225 170 C212 152 214 130 205 114 Z"
            fill="url(#suitGrad)"
          />

          <circle cx="165" cy="28" r="32" fill="rgba(255,224,189,0.95)" />

          <path
            d="M133 30
               C130 5 146 -10 165 -10
               C184 -10 200 5 197 30
               C192 18 183 10 165 10
               C147 10 138 18 133 30 Z"
            fill="rgba(92,52,35,0.95)"
          />
          <path
            d="M133 30
               C140 20 150 15 165 15
               C180 15 190 20 197 30
               C195 45 186 50 175 50
               C172 42 169 38 165 38
               C161 38 158 42 155 50
               C144 50 135 45 133 30 Z"
            fill="rgba(92,52,35,0.95)"
            opacity="0.95"
          />

          <circle cx="154" cy="26" r="3" fill="rgba(15,23,42,0.8)" />
          <circle cx="176" cy="26" r="3" fill="rgba(15,23,42,0.8)" />
          <path
            d="M152 38 C158 46 172 46 178 38"
            fill="none"
            stroke="rgba(15,23,42,0.65)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        <rect x="0" y="0" width="1400" height="820" fill="rgba(5,11,20,0.20)" />
      </svg>
    </div>
  );
}
