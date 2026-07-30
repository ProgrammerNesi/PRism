import { resolveRepository } from "@/lib/auth/resolveRepository";
import { validateApiKey } from "@/lib/validateApiKey";
import { NextRequest, NextResponse } from "next/server";
import { parseUnifiedDiff } from "@/worker/mcp/parseUnifiedDiff";
import { retrieveRelevantContext } from "@/worker/pipeline/retrieve";
import { generateReview } from "@/worker/pipeline/review";
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

        const { repo, prDiff } = await req.json();
        if (!repo || !prDiff) {
            return NextResponse.json(
                { error: "Missing repo or prDiff" },
                { status: 400 }
            );
        }
        const changedFiles = parseUnifiedDiff(prDiff);
        console.log(JSON.stringify(changedFiles, null, 2));

        // TODO:
        // 1. Validate API key from DB
        // 2. Find repository
        // 3. Retrieve embeddings
        // 4. Run review pipeline
        // 5. Return review
        const repository = await resolveRepository(user.id, repo);
        if (!repository) {
            return NextResponse.json(
                {
                    error: "Repository not found or not authorized.",
                },
                {
                    status: 403,
                }
            );
        }

        console.log("Repository:", repository);
        console.log(repository.lastIndexedCommit);
        const contextChunks = await retrieveRelevantContext(
            changedFiles,
            repository.id,
            repository.lastIndexedCommit!
        );

        console.log("Retrieved Context:");
        console.log(contextChunks);
        const reviewResult = await generateReview(
            changedFiles,
            contextChunks
        );

        return NextResponse.json(reviewResult);
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}