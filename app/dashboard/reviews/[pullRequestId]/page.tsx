import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { JobStatus } from "@/hooks/useJobStatus";

export default async function ReviewPage({
    params,
}: {
    params: { pullRequestId: string };
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/");
    const { pullRequestId } = await params;
    const pr = await prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        include: {
            repository: {
                select: { fullName: true, owner: true, name: true },
            },
            reviews: {
                orderBy: { createdAt: "desc" },
                include: {
                    comments: {
                        orderBy: [{ severity: "asc" }, { filePath: "asc" }],
                    },
                },
            },
        },
    });

    if (!pr) notFound();

    const githubPrUrl = `https://github.com/${pr.repository.fullName}/pull/${pr.githubPrNumber}`;

    return (
        <main className="max-w-4xl mx-auto p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                <Link href="/dashboard" className="hover:text-gray-700">
                    Dashboard
                </Link>
                <span>/</span>
                <span className="text-gray-600">{pr.repository.fullName}</span>
                <span>/</span>
                <span className="text-gray-900 font-medium truncate">{pr.title}</span>
            </div>

            {/* PR header */}
            <div className="border rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold mb-1">{pr.title}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-500">

                            <a
                                href={githubPrUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                            >
                                #{pr.githubPrNumber} on {pr.repository.fullName}
                            </a>
                            <span>·</span>
                            <span>by {pr.authorLogin}</span>
                            <span>·</span>
                            <span className="font-mono text-xs">
                                base {pr.baseCommitSha.slice(0, 7)}
                            </span>
                        </div>
                    </div>
                    <StatusBadge
                        pullRequestId={pr.id}
                        initialStatus={pr.status as JobStatus}
                    />
                </div>
            </div>

            {/* Review history */}
            {pr.reviews.length === 0 ? (
                <div className="border border-dashed rounded-xl p-12 text-center text-gray-400">
                    <p className="font-medium">Review in progress</p>
                    <p className="text-sm mt-1">
                        Results will appear here once the pipeline completes
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pr.reviews.map((review) => {
                        const errorCount = review.comments.filter(
                            (c) => c.severity === "ERROR"
                        ).length;
                        const warnCount = review.comments.filter(
                            (c) => c.severity === "WARNING"
                        ).length;
                        const infoCount = review.comments.filter(
                            (c) => c.severity === "INFO"
                        ).length;

                        // Group comments by file
                        const byFile = review.comments.reduce<
                            Record<string, typeof review.comments>
                        >((acc, comment) => {
                            if (!acc[comment.filePath]) {
                                acc[comment.filePath] = [];
                            }

                            acc[comment.filePath].push(comment);
                            return acc;
                        }, {});

                        return (
                            <div key={review.id} className="border rounded-xl overflow-hidden">
                                {/* Run header */}
                                <div className="bg-gray-50 border-b px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-sm">
                                            Future
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(review.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {errorCount > 0 && (
                                            <span className="text-red-600 font-medium">
                                                {errorCount} error{errorCount !== 1 ? "s" : ""}
                                            </span>
                                        )}

                                        {warnCount > 0 && (
                                            <span className="text-amber-600 font-medium">
                                                {warnCount} warning{warnCount !== 1 ? "s" : ""}
                                            </span>
                                        )}

                                        {infoCount > 0 && (
                                            <span className="text-blue-600 font-medium">
                                                {infoCount} info
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="px-5 py-4 border-b bg-white">
                                    <p className="text-sm font-medium text-gray-500 mb-1">
                                        Summary
                                    </p>
                                    <p className="text-sm text-gray-800">{review.summary}</p>
                                </div>

                                {/* Comments grouped by file */}
                                {Object.keys(byFile).length === 0 ? (
                                    <div className="px-5 py-4 text-sm text-gray-400">
                                        No inline comments — code looks clean
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {Object.entries(byFile).map(([filePath, comments]) => (
                                            <div key={filePath}>
                                                <div className="px-5 py-2 bg-gray-50 border-b">
                                                    <span className="text-xs font-mono text-gray-600">
                                                        {filePath}
                                                    </span>
                                                </div>
                                                <div className="divide-y">
                                                    {comments.map((comment) => (
                                                        <div key={comment.id} className="px-5 py-3 flex gap-3">
                                                            <span
                                                                className={`mt-0.5 shrink-0 text-xs font-bold uppercase px-1.5 py-0.5 rounded ${comment.severity === "ERROR"
                                                                    ? "bg-red-100 text-red-700"
                                                                    : comment.severity === "WARNING"
                                                                        ? "bg-amber-100 text-amber-700"
                                                                        : "bg-blue-100 text-blue-700"
                                                                    }`}
                                                            >
                                                                {comment.severity}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-gray-400 mb-0.5">
                                                                    Line {comment.line}
                                                                </p>
                                                                <p className="text-sm text-gray-800">
                                                                    {comment.body}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
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

            {/* Impact Analysis placeholder */}
            <div className="mt-6 border border-dashed rounded-xl p-6 text-center text-gray-400">
                <p className="font-medium text-sm">Impact Analysis</p>
                <p className="text-xs mt-1">Coming soon — merge safety and blast radius</p>
            </div>
        </main>
    );
}