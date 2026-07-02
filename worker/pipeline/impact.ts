import { GoogleGenAI } from "@google/genai";
import { ChangedFile } from "./diff";
import { RelevantChunk } from "./retrieve";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export interface ImpactAnalysisResult {
    isSafeToMerge: boolean;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    impactSummary: string;
    breakingChanges: string[];
    affectedAreas: string[];
}

const SYSTEM_PROMPT = `You are a senior software architect assessing the real-world impact of merging a pull request into the main branch.

You are given:
1. The PR diff — the exact changes being proposed
2. Existing codebase context — relevant code from the base branch that may be affected

Your job is NOT to review code quality. Your job is to answer:
"What actually happens to this system when this PR is merged?"

Assess:

isSafeToMerge — true only if merging will not break existing functionality. False if:
- Function signatures changed in a way callers will break
- Exported values removed or renamed
- API contracts changed (routes removed, request/response shape changed)
- Database schema changed in a backward-incompatible way
- Required environment variables added without defaults
- Core logic changed in a way that may produce different runtime behavior

riskLevel:
- LOW: isolated changes, additive only, no shared code touched
- MEDIUM: touches shared utilities or interfaces, needs careful testing
- HIGH: breaking changes present, callsites may need updates
- CRITICAL: will break production if merged without coordinated changes elsewhere

impactSummary: 2-3 sentences describing concretely what the system will do differently after this merges. Write from the perspective of someone who runs this system, not someone reading the code.

breakingChanges: specific, concrete breaking changes only. Not risks — actual breaks. Empty array if none. Each item should be one clear sentence naming what breaks and why.

affectedAreas: functional areas of the system impacted. Infer from file paths and code context. Examples: "Authentication", "User API", "Database layer", "Frontend components", "Email service". Not file names — functional areas.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "isSafeToMerge": true,
  "riskLevel": "LOW",
  "impactSummary": "...",
  "breakingChanges": [],
  "affectedAreas": ["Authentication", "User API"]
}`;

function buildPrompt(
    changedFiles: ChangedFile[],
    contextChunks: RelevantChunk[]
): string {
    const fileList = changedFiles
        .map((f) => `- ${f.filename} (${f.status})`)
        .join("\n");

    const diffSection = changedFiles
        .filter((f) => f.patch)
        .map((f) => `### ${f.filename}\n\`\`\`\n${f.patch}\n\`\`\``)
        .join("\n\n");

    const contextSection = contextChunks
        .map(
            (c) =>
                `### ${c.filePath} (lines ${c.startLine}–${c.endLine})\n\`\`\`\n${c.content}\n\`\`\``
        )
        .join("\n\n");

    return `## Files Changed\n${fileList}\n\n## Diffs\n${diffSection}\n\n## Relevant Existing Code\n${contextSection}`;
}

export async function generateImpactAnalysis(
    changedFiles: ChangedFile[],
    contextChunks: RelevantChunk[]
): Promise<ImpactAnalysisResult> {
    const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: buildPrompt(changedFiles, contextChunks),

        config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_PROMPT,
        },
    });

    const rawContent = result.text ?? "";

    try {
        const parsed = JSON.parse(rawContent) as ImpactAnalysisResult;

        return {
            isSafeToMerge: typeof parsed.isSafeToMerge === "boolean"
                ? parsed.isSafeToMerge
                : true,
            riskLevel: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(parsed.riskLevel)
                ? parsed.riskLevel
                : "LOW",
            impactSummary: parsed.impactSummary ?? "Impact analysis unavailable.",
            breakingChanges: Array.isArray(parsed.breakingChanges)
                ? parsed.breakingChanges.filter((c) => typeof c === "string")
                : [],
            affectedAreas: Array.isArray(parsed.affectedAreas)
                ? parsed.affectedAreas.filter((a) => typeof a === "string")
                : [],
        };
    } catch {
        console.error("Failed to parse impact analysis response:", rawContent);
        return {
            isSafeToMerge: true,
            riskLevel: "LOW",
            impactSummary: "Impact analysis could not be generated for this PR.",
            breakingChanges: [],
            affectedAreas: [],
        };
    }
}