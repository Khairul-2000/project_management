import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function RoleMultiSelect({ roles, value, onChange }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function toggle(role) {
    onChange(value.includes(role) ? value.filter((item) => item !== role) : [...value, role]);
  }

  return <div ref={rootRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
    <button type="button" onClick={() => setOpen((current) => !current)} style={{ width: "100%", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", background: colors.panel2, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "8px 10px", color: colors.text, fontSize: 13 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value.length ? `${value.length} role${value.length === 1 ? "" : "s"} selected` : "Select role(s)"}</span>
      <ChevronDown size={16} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
    </button>
    {open ? <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, right: 0, maxHeight: 230, overflowY: "auto", background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: colors.shadow, padding: 6 }}>
      {roles.map((role) => <label key={role} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 7px", borderRadius: 7, color: colors.text, fontSize: 12.5, cursor: "pointer" }}><input type="checkbox" checked={value.includes(role)} onChange={() => toggle(role)} style={{ accentColor: colors.accent }} />{role}</label>)}
    </div> : null}
  </div>;
}
