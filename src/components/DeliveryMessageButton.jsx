import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { useTheme } from "../lib/theme";

/**
 * Animated Pill Button with a continuous rotating border beam.
 * Matches the reference capsule button with project-themed emerald/cyan colors and typography.
 */
export default function DeliveryMessageButton({
  onClick,
  phase = null,
  size = "md", // "md" | "sm"
  label = "Delivery Message",
  style = {},
}) {
  const { isDark, colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isAiUsed = Boolean(phase?.deliveryMessage?.aiUsed);

  // Project colors: Crextio signature vibrant emerald / mint green
  const beamAccent = isDark ? "#00F5A0" : "#10B981";
  const glowColor = isDark ? "rgba(0, 229, 153, 0.45)" : "rgba(16, 185, 129, 0.35)";

  const isSmall = size === "sm";

  return (
    <>
      <style>{`
        @keyframes deliveryBorderBeamRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        title="Open Phase Delivery Message Generator"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          padding: isSmall ? "1.5px" : "2px",
          overflow: "hidden",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textDecoration: "none",
          boxShadow: isHovered
            ? `0 0 32px -2px ${glowColor}, 0 10px 22px -4px rgba(0, 0, 0, ${isDark ? 0.6 : 0.2})`
            : `0 0 20px -3px ${glowColor}, 0 6px 16px -4px rgba(0, 0, 0, ${isDark ? 0.5 : 0.15})`,
          transform: isPressed
            ? "translateY(0) scale(0.98)"
            : isHovered
              ? "translateY(-1px) scale(1.02)"
              : "translateY(0) scale(1)",
          transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease",
          userSelect: "none",
          ...style,
        }}
      >
        {/* ROTATING BORDER BEAM SPINNER */}
        <div
          style={{
            position: "absolute",
            inset: "-250%",
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 210deg,
              rgba(0, 229, 153, 0.35) 270deg,
              rgba(255, 255, 255, 0.95) 330deg,
              #FFFFFF 345deg,
              transparent 360deg
            )`,
            animation: "deliveryBorderBeamRotate 3s linear infinite",
            pointerEvents: "none",
          }}
        />

        {/* INNER PILL CONTAINER */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            alignItems: "center",
            gap: isSmall ? 6 : 9,
            borderRadius: 9999,
            padding: isSmall ? "6px 14px" : "10px 22px",
            background: isDark
              ? "linear-gradient(180deg, #10B981 0%, #059669 55%, #047857 100%)"
              : "linear-gradient(180deg, #10B981 0%, #059669 55%, #047857 100%)",
            color: "#FFFFFF",
            fontSize: isSmall ? 12 : 13.5,
            fontWeight: 750,
            fontFamily: "Manrope, Plus Jakarta Sans, system-ui, sans-serif",
            letterSpacing: "-0.2px",
            whiteSpace: "nowrap",
            boxShadow: `
              inset 0 1px 1px rgba(255, 255, 255, 0.4),
              inset 0 -1px 2px rgba(0, 0, 0, 0.25)
            `,
          }}
        >
          {/* Sparkles Icon */}
          <Sparkles
            size={isSmall ? 13 : 16}
            style={{
              color: "#FFFFFF",
              filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))",
              flexShrink: 0,
            }}
          />

          {/* Button Text */}
          <span>{label}</span>

          {/* AI Status Pill */}
          {isAiUsed ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: isSmall ? 9.5 : 10.5,
                background: "rgba(255, 255, 255, 0.22)",
                color: "#FFFFFF",
                padding: "1px 7px",
                borderRadius: 99,
                fontWeight: 800,
                letterSpacing: "0.2px",
                backdropFilter: "blur(4px)",
              }}
            >
              <Check size={isSmall ? 10 : 11} strokeWidth={3} />
              AI Ready
            </span>
          ) : null}
        </div>
      </button>
    </>
  );
}
