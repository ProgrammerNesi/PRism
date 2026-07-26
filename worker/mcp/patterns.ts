import { GoogleGenAI } from "@google/genai";
import { ChangedFile } from "../pipeline/diff";
import { RelevantChunk } from "../pipeline/retrieve";

// ...existing code...
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export interface PatternViolation {
  title: string;
  explanation: string;
  suggestion: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface PatternCheckResult {
  followsPatterns: boolean;
  summary: string;
  violations: PatternViolation[];
}

function buildPrompt(
  changedFiles: ChangedFile[],
  contextChunks: RelevantChunk[]
): string {
  const diffSection = changedFiles
    .filter((f) => f.patch)
    .map(
      (f) => `### Changed File: ${f.filename}

\`\`\`diff
${f.patch}
\`\`\``
    )
    .join("\n\n");

  const contextSection = contextChunks
    .map(
      (c) =>
        `### Existing Code (${c.filePath}:${c.startLine}-${c.endLine})

\`\`\`
${c.content}
\`\`\``
    )
    .join("\n\n");

  return `## Proposed Changes

${diffSection}

## Existing Codebase Context

${contextSection}`;
}

const SYSTEM_PROMPT = `
You are a senior software architect.

Your ONLY task is to determine whether the proposed changes follow the
existing conventions and implementation patterns of this repository.

You are NOT performing a bug review.

Focus ONLY on:

- Naming conventions
- Folder/module organization
- Existing abstractions
- Existing helper functions that should be reused
- Architectural consistency
- Existing React/component patterns
- Existing error-handling patterns
- Existing state-management patterns

Do NOT report:

- Possible bugs
- Performance issues
- Security issues
- Missing validation
- Code smells
- Style preferences unless they clearly contradict the retrieved context.

If the retrieved context already shows multiple acceptable styles,
do NOT invent a new convention.

Return ONLY valid JSON.

{
  "followsPatterns": true,
  "summary": "One or two sentence summary.",
  "violations": [
    {
      "title": "Pattern name",
      "explanation": "Why it differs from existing code.",
      "suggestion": "How to align it.",
      "severity": "LOW"
    }
  ]
}

Severity must be LOW, MEDIUM or HIGH.
`;

export async function checkAgainstPatterns(
  changedFiles: ChangedFile[],
  contextChunks: RelevantChunk[]
): Promise<PatternCheckResult> {
  const prompt = buildPrompt(changedFiles, contextChunks);

  const result = await genAI.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const rawContent = result.text ?? "";

  try {
    const parsed = JSON.parse(rawContent) as PatternCheckResult;

    return {
      followsPatterns:
        typeof parsed.followsPatterns === "boolean"
          ? parsed.followsPatterns
          : true,

      summary:
        parsed.summary ?? "Pattern analysis completed.",

      violations:
        (parsed.violations ?? []).filter(
          (v) =>
            v.title &&
            v.explanation &&
            v.suggestion &&
            ["LOW", "MEDIUM", "HIGH"].includes(v.severity)
        ),
    };
  } catch {
    console.error("Failed to parse Gemini response:", rawContent);

    return {
      followsPatterns: true,
      summary:
        "Pattern analysis completed but no structured response was generated.",
      violations: [],
    };
  }
}