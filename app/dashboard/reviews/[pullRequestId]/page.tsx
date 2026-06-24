import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ImpactAnalysisCard from "@/components/ImpactAnalysisCard";
import { JobStatus } from "@/hooks/useJobStatus";
import { ChevronRight, GitBranch, ExternalLink, FileCode, Compass } from "lucide-react";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ pullRequestId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { pullRequestId } = await params;

  const pr = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
    include: {
      repository: { select: { fullName: true } },
      impactAnalysis: true,
      reviews: {
        orderBy: { createdAt: "asc" },
        include: {
          comments: { orderBy: [{ severity: "asc" }, { filePath: "asc" }] },
        },
      },
    },
  });

  if (!pr) notFound();

  const githubPrUrl = `https://github.com/${pr.repository.fullName}/pull/${pr.githubPrNumber}`;

  return (
    <main style={{ maxWidth: 768, margin: "0 auto", padding: "40px 24px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24 }}>
        <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--text-secondary)]">
          Repositories
        </Link>
        <ChevronRight size={12} />
        <span style={{ fontFamily: "var(--font-mono)" }}>{pr.repository.fullName}</span>
        <ChevronRight size={12} />
        <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
          {pr.title}
        </span>
      </div>

      {/* PR header */}
      <div className="glass-panel rounded-2xl" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {pr.title}
          </h1>
          <StatusBadge pullRequestId={pr.id} initialStatus={pr.status as JobStatus} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          <a href={githubPrUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", textDecoration: "none" }} className="hover:text-[var(--text-primary)]">
            #{pr.githubPrNumber}
            <ExternalLink size={11} />
          </a>
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <span>{pr.authorLogin}</span>
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", borderRadius: 6, padding: "2px 8px" }}>
            <GitBranch size={10} style={{ color: "var(--text-tertiary)" }} />
            base {pr.baseCommitSha.slice(0, 7)}
          </span>
        </div>
      </div>

      {/* Impact Analysis — shown above reviews if available */}
      {pr.impactAnalysis ? (
        <ImpactAnalysisCard impact={pr.impactAnalysis} />
      ) : (
        pr.status !== "COMPLETED" && (
          <div className="glass-panel rounded-2xl" style={{ padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <Compass size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} strokeWidth={1.5} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Impact analysis pending</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                Merge safety and affected areas will appear here once the review completes.
              </p>
            </div>
          </div>
        )
      )}

      {/* Review runs */}
      {pr.reviews.length === 0 ? (
        <div className="glass-panel rounded-2xl" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Review in progress</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Results appear here once the pipeline completes.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pr.reviews.map((review, idx) => {
            const runNumber = idx + 1;
            const errorCount = review.comments.filter((c) => c.severity === "ERROR").length;
            const warnCount = review.comments.filter((c) => c.severity === "WARNING").length;
            const infoCount = review.comments.filter((c) => c.severity === "INFO").length;

            const byFile = review.comments.reduce<Record<string, typeof review.comments>>((acc, c) => {
              (acc[c.filePath] ??= []).push(c);
              return acc;
            }, {});

            return (
              <div key={review.id} className="glass-panel rounded-2xl" style={{ overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-glass)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(255,255,255,0.015)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      Run #{runNumber}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {new Date(review.createdAt).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                      head {review.headCommitSha.slice(0, 7)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {errorCount > 0 && <span style={{ color: "#FDA4AF" }}>{errorCount}E</span>}
                    {warnCount > 0 && <span style={{ color: "#FBD37A" }}>{warnCount}W</span>}
                    {infoCount > 0 && <span style={{ color: "#9DB8FF" }}>{infoCount}I</span>}
                    {errorCount === 0 && warnCount === 0 && infoCount === 0 && (
                      <span style={{ color: "var(--text-tertiary)" }}>No issues</span>
                    )}
                  </div>
                </div>

                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-glass)" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: 6 }}>Summary</p>
                  <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>{review.summary}</p>
                </div>

                {Object.keys(byFile).length === 0 ? (
                  <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--text-tertiary)" }}>
                    No inline comments — code looks clean.
                  </div>
                ) : (
                  <div>
                    {Object.entries(byFile).map(([filePath, comments]) => (
                      <div key={filePath} style={{ borderTop: "1px solid var(--border-glass)" }}>
                        <div style={{ padding: "8px 20px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid var(--border-glass)", display: "flex", alignItems: "center", gap: 8 }}>
                          <FileCode size={11} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{filePath}</span>
                        </div>
                        <div>
                          {comments.map((comment, ci) => {
                            const sev =
                              comment.severity === "ERROR"
                                ? { color: "#FDA4AF", bg: "rgba(251,113,133,0.08)" }
                                : comment.severity === "WARNING"
                                ? { color: "#FBD37A", bg: "rgba(251,191,36,0.08)" }
                                : { color: "#9DB8FF", bg: "rgba(61,127,255,0.08)" };

                            return (
                              <div key={comment.id} style={{ display: "flex", gap: 12, padding: "14px 20px", borderTop: ci === 0 ? "none" : "1px solid var(--border-glass)" }}>
                                <span style={{ flexShrink: 0, marginTop: 1, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 4, background: sev.bg, color: sev.color }}>
                                  {comment.severity}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginBottom: 3 }}>
                                    Line {comment.line}
                                  </p>
                                  <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                                    {comment.body}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}