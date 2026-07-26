"use client";

import { useCallback, useEffect, useState } from "react";
import { Key, Plus, Copy, Check, X, Trash2, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

interface ApiKeyItem {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        setKeys(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create key");
        return;
      }
      const data = await res.json();
      setNewKey(data.key);
      setName("");
      setShowForm(false);
      fetchKeys();
    } catch {
      setError("Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDismissNewKey = () => {
    setNewKey(null);
    setCopied(false);
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      {/* Breadcrumb + header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              color: "var(--text-tertiary)",
              textDecoration: "none",
            }}
            className="hover:text-[var(--text-secondary)]"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            Dashboard
          </Link>
          <span style={{ color: "var(--border-glass)", fontSize: 13 }}>/</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            API Keys
          </h1>
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
          className="btn-primary inline-flex items-center gap-2 rounded-xl text-white cursor-pointer"
          style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, border: "none" }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Create API Key
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div
          className="glass-panel rounded-2xl"
          style={{
            padding: 20,
            marginBottom: 24,
            borderColor: "rgba(52,211,153,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--success)",
                  marginBottom: 4,
                  fontFamily: "var(--font-display)",
                }}
              >
                <KeyRound size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} strokeWidth={2} />
                API Key created
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                Copy this key now — you won&apos;t be able to see it again.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-glass)",
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                <code
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    wordBreak: "break-all",
                    userSelect: "all",
                  }}
                >
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey)}
                  className="cursor-pointer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-glass)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  {copied ? <Check size={13} style={{ color: "var(--success)" }} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <button
              onClick={handleDismissNewKey}
              className="cursor-pointer"
              style={{
                display: "inline-flex",
                padding: 6,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                flexShrink: 0,
              }}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div
          className="glass-panel rounded-2xl animate-fade-up"
          style={{ padding: 20, marginBottom: 24 }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 12,
              fontFamily: "var(--font-display)",
            }}
          >
            New API Key
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="e.g. CI/CD Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowForm(false);
              }}
              autoFocus
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border-glass)",
                background: "rgba(0,0,0,0.25)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                outline: "none",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-blue)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-glass)";
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowForm(false);
                  setName("");
                  setError(null);
                }}
                className="cursor-pointer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-glass)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="btn-primary inline-flex items-center gap-2 rounded-xl text-white cursor-pointer"
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  opacity: creating || !name.trim() ? 0.5 : 1,
                }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 10,
            background: "rgba(251,113,133,0.1)",
            border: "1px solid rgba(251,113,133,0.2)",
            fontSize: 13,
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <div className="glass-panel rounded-2xl" style={{ padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 6, width: `${60 + i * 10}%` }} />
            ))}
          </div>
        </div>
      ) : keys.length === 0 && !showForm ? (
        <div className="glass-panel rounded-2xl" style={{ padding: "64px 24px", textAlign: "center" }}>
          <Key size={28} style={{ margin: "0 auto 12px", color: "var(--text-tertiary)", display: "block" }} strokeWidth={1.5} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
            No API keys
          </p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
            Create an API key to use PRism programmatically.
          </p>
          <button
            onClick={() => {
              setShowForm(true);
              setError(null);
            }}
            className="btn-primary inline-flex items-center gap-2 rounded-xl text-white cursor-pointer"
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, border: "none" }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create API Key
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {keys.map((key, i) => (
            <div
              key={key.id}
              className="glass-panel rounded-2xl animate-fade-up"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <KeyRound size={15} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} strokeWidth={1.75} />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {key.name}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt
                      ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : " · Never used"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(key.id)}
                disabled={revoking === key.id}
                className="cursor-pointer"
                title="Revoke key"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-glass)",
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                  opacity: revoking === key.id ? 0.5 : 1,
                  transition: "color 0.15s, background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,113,133,0.3)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(251,113,133,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-glass)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Trash2 size={13} strokeWidth={2} />
                {revoking === key.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
