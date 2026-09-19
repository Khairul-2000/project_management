import React from "react";

export function GitHubIcon({ size = 16, color = "currentColor", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export function GitLabIcon({ size = 16, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <path
        d="M22.65 14.39L20.6 8.08c-.14-.42-.58-.69-1.02-.63-.44.06-.79.4-.84.84l-1.05 7.15H6.31l-1.05-7.15c-.05-.44-.4-.78-.84-.84-.44-.06-.88.21-1.02.63L1.35 14.39a1.13 1.13 0 00.41 1.25l10.24 7.45 10.24-7.45a1.13 1.13 0 00.41-1.25z"
        fill="#FC6D26"
      />
      <path
        d="M12 23.09l5.7-17.55c.14-.42-.03-.89-.41-1.12a.96.96 0 00-1.18.15L12 8.78 7.89 4.57a.96.96 0 00-1.18-.15c-.38.23-.55.7-.41 1.12L12 23.09z"
        fill="#E24329"
      />
      <path
        d="M12 23.09L17.7 5.54l-3.29 4.21L12 23.09z"
        fill="#FCA326"
      />
      <path
        d="M12 23.09L6.3 5.54l3.29 4.21L12 23.09z"
        fill="#FCA326"
      />
    </svg>
  );
}

export function GitRepoBadges({ githubUrl, gitlabUrl, compact = false }) {
  if (!githubUrl && !gitlabUrl) return null;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {githubUrl ? (
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          title={`GitHub: ${githubUrl}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "inherit",
            transition: "all 0.15s ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
        >
          <GitHubIcon size={compact ? 12 : 14} />
        </a>
      ) : null}

      {gitlabUrl ? (
        <a
          href={gitlabUrl}
          target="_blank"
          rel="noreferrer"
          title={`GitLab: ${gitlabUrl}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            borderRadius: 6,
            background: "rgba(252, 109, 38, 0.12)",
            border: "1px solid rgba(252, 109, 38, 0.3)",
            color: "inherit",
            transition: "all 0.15s ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(252, 109, 38, 0.22)";
            e.currentTarget.style.borderColor = "rgba(252, 109, 38, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(252, 109, 38, 0.12)";
            e.currentTarget.style.borderColor = "rgba(252, 109, 38, 0.3)";
          }}
        >
          <GitLabIcon size={compact ? 12 : 14} />
        </a>
      ) : null}
    </div>
  );
}
