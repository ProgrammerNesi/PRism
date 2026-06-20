import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { JobStatus } from "@/hooks/useJobStatus";

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
                  reviews: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                      id: true,
                      createdAt: true,
                    },
                  },
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
    <main className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {user.avatarUrl && (
            <Image
              src={user.avatarUrl}
              alt={user.avatarUrl}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <a
          href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Connect Repository
        </a>
      </div>

      {repositories.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center text-gray-400">
          <p className="text-lg font-medium mb-1">No repositories connected</p>
          <p className="text-sm">
            Click "Connect Repository" to install the GitHub App on your repos
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {repositories.map((repo) => (
            <div key={repo.id} className="border rounded-xl overflow-hidden">
              {/* Repository header */}
              <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {repo.fullName}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {repo.pullRequests.length} PR
                  {repo.pullRequests.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* PR list */}
              {repo.pullRequests.length === 0 ? (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">
                  No pull requests yet
                </div>
              ) : (
                <div className="divide-y">
                  {repo.pullRequests.map((pr) => {
                    return (
                      <Link
                        key={pr.id}
                        href={`/dashboard/reviews/${pr.id}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {pr.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            #{pr.githubPrNumber} · {pr.authorLogin}
                            {pr._count.reviews > 0 && (
                              <span className="ml-2">
                                · {pr._count.reviews} review run
                                {pr._count.reviews !== 1 ? "s" : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {/* {latestReview?.riskScore != null && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${latestReview.riskScore <= 25
                                ? "bg-green-100 text-green-700"
                                : latestReview.riskScore <= 50
                                  ? "bg-yellow-100 text-yellow-700"
                                  : latestReview.riskScore <= 75
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                            >
                              {latestReview.riskScore}/100
                            </span>
                          )} */}
                          <StatusBadge
                            pullRequestId={pr.id}
                            initialStatus={pr.status as JobStatus}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}