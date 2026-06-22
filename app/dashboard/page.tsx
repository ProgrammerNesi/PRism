import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { JobStatus } from "@/hooks/useJobStatus";
import { GitPullRequest, Plus, Inbox } from "lucide-react";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      installations: {
        include: {
          repositories: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            include: {
              pullRequests: {
                orderBy: { updatedAt: "desc" },
                take: 10,
                include: {
                  _count: { select: { reviews: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) redirect("/");

  const repositories = user.installations.flatMap((i) => i.repositories);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        {/* Left side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {(user.avatarUrl || user.image) && (
            <img
              src={user.avatarUrl || user.image!}
              alt={user.name ?? "User"}
              style={{
                width: 44,
                height: 44,
                borderRadius: "9999px",
                objectFit: "cover",
              }}
            />
          )}

          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {user.name ?? "Developer"}
            </h1>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {repositories.length} connected repositories
            </p>
          </div>
        </div>

        {/* Right side */}
        <a
          href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`}
          className="btn-primary inline-flex items-center gap-2 rounded-xl text-white"
          style={{
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Connect repository
        </a>
      </div>

      {repositories.length === 0 ? (
        <div className="glass-panel rounded-2xl" style={{ padding: "64px 24px", textAlign: "center" }}>
          <Inbox size={28} style={{ margin: "0 auto 12px", color: "var(--text-tertiary)", display: "block" }} strokeWidth={1.5} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>No repositories connected</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Connect a repository to start reviewing pull requests automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {repositories.map((repo, i) => (
            <div
              key={repo.id}
              className="glass-panel rounded-2xl animate-fade-up"
              style={{ overflow: "hidden", animationDelay: `${i * 0.04}s` }}
            >
              {/* Repo header */}
              <div
                style={{
                  borderBottom: "1px solid var(--border-glass)",
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {repo.fullName}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {repo.pullRequests.length} PR{repo.pullRequests.length !== 1 ? "s" : ""}
                </span>
              </div>

              {repo.pullRequests.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
                  No pull requests yet
                </div>
              ) : (
                <div>
                  {repo.pullRequests.map((pr, j) => (
                    <Link
                      key={pr.id}
                      href={`/dashboard/reviews/${pr.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: "16px 20px",
                        borderTop: j === 0 ? "none" : "1px solid var(--border-glass)",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      className="hover:bg-white/[0.02]"
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                        <GitPullRequest
                          size={15}
                          style={{ marginTop: 2, flexShrink: 0, color: "var(--text-tertiary)", strokeWidth: 1.75 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pr.title}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                            #{pr.githubPrNumber} · {pr.authorLogin}
                            {pr._count.reviews > 0 && (
                              <span style={{ marginLeft: 8 }}>
                                · {pr._count.reviews} run{pr._count.reviews !== 1 ? "s" : ""}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <StatusBadge pullRequestId={pr.id} initialStatus={pr.status as JobStatus} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}