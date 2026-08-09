import { useTheme } from "../lib/theme";

/** Compact galloping horse for the loading screen (CSS SVG animation). */
export default function RunningHorseLoader({ size = 56 }) {
  const { colors, isDark } = useTheme();
  const fill = isDark ? colors.accentSoft : colors.accent;
  const ground = colors.border;

  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size * 1.6,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      <style>{`
        @keyframes horse-gallop-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes horse-leg-fl {
          0%, 100% { transform: rotate(-28deg); }
          50% { transform: rotate(32deg); }
        }
        @keyframes horse-leg-fr {
          0%, 100% { transform: rotate(30deg); }
          50% { transform: rotate(-26deg); }
        }
        @keyframes horse-leg-bl {
          0%, 100% { transform: rotate(34deg); }
          50% { transform: rotate(-22deg); }
        }
        @keyframes horse-leg-br {
          0%, 100% { transform: rotate(-30deg); }
          50% { transform: rotate(28deg); }
        }
        @keyframes horse-dust {
          0% { transform: translateX(0); opacity: 0.35; }
          100% { transform: translateX(-18px); opacity: 0; }
        }
        .horse-run { animation: horse-gallop-bob 0.38s ease-in-out infinite; transform-origin: center; }
        .horse-leg { transform-box: fill-box; transform-origin: top center; }
        .horse-leg-fl { animation: horse-leg-fl 0.38s ease-in-out infinite; }
        .horse-leg-fr { animation: horse-leg-fr 0.38s ease-in-out infinite; }
        .horse-leg-bl { animation: horse-leg-bl 0.38s ease-in-out infinite; }
        .horse-leg-br { animation: horse-leg-br 0.38s ease-in-out infinite; }
        .horse-dust {
          animation: horse-dust 0.55s linear infinite;
        }
      `}</style>
      <svg
        width={size * 1.55}
        height={size}
        viewBox="0 0 88 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <ellipse className="horse-dust" cx="22" cy="48" rx="5" ry="1.6" fill={ground} opacity="0.4" />
        <ellipse className="horse-dust" cx="30" cy="49" rx="3.5" ry="1.2" fill={ground} opacity="0.3" style={{ animationDelay: "0.18s" }} />
        <g className="horse-run" fill={fill}>
          {/* body */}
          <ellipse cx="42" cy="28" rx="18" ry="9" />
          {/* neck */}
          <path d="M55 24c6-2 10-8 11-14 1 6 3 10 1 14-3 5-8 6-12 5z" />
          {/* head */}
          <ellipse cx="68" cy="12" rx="7" ry="4.5" transform="rotate(-18 68 12)" />
          {/* ear */}
          <path d="M64 7l2.5-5 1.2 4.5z" />
          {/* mane */}
          <path d="M58 16c2-4 5-7 8-8-3 3-4 7-5 10-2 0-3-1-3-2z" opacity="0.55" />
          {/* tail */}
          <path d="M24 26c-6 1-10 6-11 11 5-3 9-4 12-3-1-3-1-6-1-8z" opacity="0.85" />
          {/* legs — hinged from top */}
          <rect className="horse-leg horse-leg-fl" x="48" y="34" width="3.2" height="14" rx="1.5" />
          <rect className="horse-leg horse-leg-fr" x="54" y="34" width="3.2" height="13" rx="1.5" />
          <rect className="horse-leg horse-leg-bl" x="30" y="34" width="3.2" height="14" rx="1.5" />
          <rect className="horse-leg horse-leg-br" x="36" y="34" width="3.2" height="13" rx="1.5" />
        </g>
        <line x1="12" y1="50" x2="78" y2="50" stroke={ground} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  );
}
