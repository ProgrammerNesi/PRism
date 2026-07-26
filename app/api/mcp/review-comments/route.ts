import { resolveRepository } from "@/lib/auth/resolveRepository";
import { validateApiKey } from "@/lib/validateApiKey";
import { NextRequest, NextResponse } from "next/server";
import { getReviewComments } from "@/worker/mcp/reveiwComments";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await validateApiKey(token);

        if (!user) {
            return NextResponse.json(
                { error: "Invalid API Key" },
                { status: 401 }
            );
        }

        const { repo, headCommitSha } = await req.json();

        if (!repo || !headCommitSha) {
            return NextResponse.json(
                {
                    error: "repo and headCommitSha are required",
                },
                { status: 400 }
            );
        }

        const repository = await resolveRepository(user.id, repo);

        if (!repository) {
            return NextResponse.json(
                {
                    error: "Repository not found or not authorized.",
                },
                { status: 403 }
            );
        }

        const review = await getReviewComments(
            repository.id,
            headCommitSha
        );

        return NextResponse.json(review);
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}