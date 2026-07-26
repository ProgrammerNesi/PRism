import { ChangedFile } from "../pipeline/diff";

export function parseUnifiedDiff(diff: string): ChangedFile[] {
  const changedFiles: ChangedFile[] = [];

  const sections = diff
    .split(/^diff --git /gm)
    .filter((section) => section.trim().length > 0);

  for (const section of sections) {
    const lines = section.split("\n");

    // First line looks like:
    // a/src/app.ts b/src/app.ts
    const header = lines[0].trim();

    const match = header.match(/a\/(.+?)\s+b\/(.+)/);

    if (!match) continue;

    const filename = match[2];

    let status: ChangedFile["status"] = "modified";

    if (lines.some((l) => l.startsWith("new file mode"))) {
      status = "added";
    }

    if (lines.some((l) => l.startsWith("deleted file mode"))) {
      status = "removed";
    }

    const patch = lines.slice(1).join("\n");

    changedFiles.push({
      filename,
      patch,
      status,
    });
  }

  return changedFiles;
}