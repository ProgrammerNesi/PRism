import { GoogleGenAI } from "@google/genai";
import { ChangedFile } from "./diff";
import { RelevantChunk } from "./retrieve";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export interface ReviewComment {
  filePath: string;
  line: number;
  body: string;
  severity: "INFO" | "WARNING" | "ERROR";
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
}

function buildPrompt(
  changedFiles: ChangedFile[],
  contextChunks: RelevantChunk[]
): string {
  const diffSection = changedFiles
    .filter((f) => f.patch)
    .map((f) => `### Changed: ${f.filename}\n\`\`\`\n${f.patch}\n\`\`\``)
    .join("\n\n");

  const contextSection = contextChunks
    .map(
      (c) =>
        `### Existing code — ${c.filePath} (lines ${c.startLine}–${c.endLine})\n\`\`\`\n${c.content}\n\`\`\``
    )
    .join("\n\n");

  return `## What the PR changes\n${diffSection}\n\n## Existing codebase patterns for context\n${contextSection}`;
}

const SYSTEM_PROMPT = `You are a senior software engineer reviewing a pull request.

You are given two things:
1. The PR diff — what is being proposed
2. Existing code from the base branch — how the codebase currently works

Your job is to evaluate whether the proposed changes are consistent with existing patterns,
free of bugs, and properly integrated with the codebase.

Focus on:
- Bugs and logic errors in the new code
- Security vulnerabilities
- Inconsistency with patterns shown in the existing code context
- Missing error handling that exists elsewhere in the codebase
- Breaking changes to interfaces used by other files

Do NOT flag:
- Style preferences not violated by existing code
- Minor issues with no real-world impact

Only comment on line numbers that exist in the diff.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "summary": "2-3 sentence assessment",
  "comments": [
    {
      "filePath": "path/to/file.ts",
      "line": 42,
      "body": "Specific actionable feedback",
      "severity": "INFO"
    }
  ]
}

severity must be INFO, WARNING, or ERROR.`;

export async function generateReview(
  changedFiles: ChangedFile[],
  contextChunks: RelevantChunk[]
): Promise<ReviewResult> {
  const prompt = buildPrompt(changedFiles, contextChunks);

  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const rawContent = result.text ?? "";

  try {
    const parsed = JSON.parse(rawContent) as ReviewResult;

    return {
      summary: parsed.summary ?? "Review completed.",
      comments: (parsed.comments ?? []).filter(
        (c) =>
          c.filePath &&
          typeof c.line === "number" &&
          c.body &&
          ["INFO", "WARNING", "ERROR"].includes(c.severity)
      ),
    };
  } catch {
    console.error("Failed to parse Gemini response:", rawContent);

    return {
      summary: "Review completed. Unable to generate structured feedback.",
      comments: [],
    };
  }
}