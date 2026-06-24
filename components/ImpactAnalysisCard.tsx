import { ShieldCheck, ShieldAlert, Zap, AlertTriangle, Layers, GitMerge } from "lucide-react";

interface ImpactAnalysis {
  isSafeToMerge: boolean;
  riskLevel: string;
  impactSummary: string;
  breakingChanges: string;
  affectedAreas: string;
  analyzedHeadSha: string;
  updatedAt: Date;
}

const RISK_CONFIG = {
  LOW:      { label: "Low risk",      color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  MEDIUM:   { label: "Medium risk",   color: "#FBBF24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
  HIGH:     { label: "High risk",     color: "#FB923C", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
  CRITICAL: { label: "Critical risk", color: "#FB7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.2)" },
};

export default function ImpactAnalysisCard({ impact }: { impact: ImpactAnalysis }) {
  const risk = RISK_CONFIG[impact.riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.LOW;

  let breakingChanges: string[] = [];
  let affectedAreas: string[] = [];

  try { breakingChanges = JSON.parse(impact.breakingChanges); } catch {}
  try { affectedAreas = JSON.parse(impact.affectedAreas); } catch {}

  const MergeIcon = impact.isSafeToMerge ? ShieldCheck : ShieldAlert;
  const mergeColor = impact.isSafeToMerge ? "#34D399" : "#FB7185";
  const mergeBg = impact.isSafeToMerge ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)";
  const mergeBorder = impact.isSafeToMerge ? "rgba(52,211,153,0.2)" : "rgba(251,113,133,0.2)";
  const mergeLabel = impact.isSafeToMerge ? "Safe to merge" : "Not safe to merge";

  return (
    <div
      className="glass-panel rounded-2xl overflow-hidden"
      style={{ marginBottom: 24 }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          background: "rgba(255,255,255,0.015)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14} style={{ color: "var(--accent-blue)" }} strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Merge Risk Assessment
          </span>
        </div
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Safe to merge badge */}
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 600,
              padding: "3px 10px", borderRadius: 999,
              background: mergeBg, border: `1px solid ${mergeBorder}`,
              color: mergeColor,
            }}
          >
            <MergeIcon size={11} strokeWidth={2.5} />
            {mergeLabel}
          </span>

          {/* Risk level badge */}
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 600,
              padding: "3px 10px", borderRadius: 999,
              background: risk.bg, border: `1px solid ${risk.border}`,
              color: risk.color,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: risk.color, flexShrink: 0 }} />
            {risk.label}
          </span>
        </div>
      </div>

      {/* Impact summary */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-glass)" }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: 6 }}>
          What happens when this merges
        </p>
        <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7 }}>
          {impact.impactSummary}
        </p>
      </div>

      {/* Two-column: breaking changes + affected areas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: breakingChanges.length > 0 ? "1fr 1fr" : "1fr",
          borderBottom: affectedAreas.length > 0 ? "1px solid var(--border-glass)" : "none",
        }}
      >
        {/* Breaking changes */}
        {breakingChanges.length > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderRight: "1px solid var(--border-glass)",
            }}
          >
            <p
              style={{
                fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#FB7185", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <AlertTriangle size={10} strokeWidth={2.5} />
              Breaking changes
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {breakingChanges.map((change, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "#FB7185", flexShrink: 0, marginTop: 1 }}>·</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No breaking changes */}
        {breakingChanges.length === 0 && (
          <div style={{ padding: "16px 20px", borderRight: "1px solid var(--border-glass)" }}>
            <p
              style={{
                fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#34D399", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <ShieldCheck size={10} strokeWidth={2.5} />
              Breaking changes
            </p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>None detected</p>
          </div>
        )}

        {/* Affected areas */}
        {affectedAreas.length > 0 && (
          <div style={{ padding: "16px 20px" }}>
            <p
              style={{
                fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--text-tertiary)", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <Layers size={10} strokeWidth={2.5} />
              Affected areas
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {affectedAreas.map((area, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11, fontWeight: 500,
                    padding: "3px 10px", borderRadius: 999,
                    background: "rgba(61,127,255,0.08)",
                    border: "1px solid rgba(61,127,255,0.2)",
                    color: "#9DB8FF",
                  }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — metadata */}
      <div
        style={{
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 11,
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GitMerge size={10} />
          analyzed {impact.analyzedHeadSha.slice(0, 7)}
        </span>
        <span>·</span>
        <span>{new Date(impact.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}