import { validateApiKey } from "@/lib/validateApiKey";
import { NextRequest, NextResponse } from "next/server";

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

        // TODO:
        // 1. Validate API key from DB
        // 2. Find repository
        // 3. Retrieve embeddings
        // 4. Run review pipeline
        // 5. Return review

        return NextResponse.json({
            status: "success",
            message: "PRism backend reached successfully.",
            data: {
                repo,
                diffLength: prDiff.length,
            },
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}