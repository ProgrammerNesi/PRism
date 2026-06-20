import Parser from "tree-sitter";
import fs from "fs";
import path from "path";

const JavaScript = require("tree-sitter-javascript") as any;
const { typescript: TypeScript, tsx: TSX } = require("tree-sitter-typescript") as {
  typescript: any;
  tsx: any;
};
const Python = require("tree-sitter-python") as any;

export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
}

const LANGUAGE_MAP: Record<string, { grammar: any; language: string }> = {
  ".js":  { grammar: JavaScript, language: "javascript" },
  ".jsx": { grammar: JavaScript, language: "javascript" },
  ".ts":  { grammar: TypeScript, language: "typescript" },
  ".tsx": { grammar: TSX,        language: "typescript" },
  ".py":  { grammar: Python,     language: "python"     },
};

// AST node types that represent complete, meaningful units of code.
// These become chunk boundaries — we extract each as its own chunk
// rather than splitting arbitrarily by line count.
const CHUNK_NODE_TYPES: Record<string, Set<string>> = {
  javascript: new Set([
    "function_declaration",
    "class_declaration",
    "export_statement",
    "lexical_declaration",
  ]),
  typescript: new Set([
    "function_declaration",
    "class_declaration",
    "interface_declaration",
    "type_alias_declaration",
    "export_statement",
    "lexical_declaration",
  ]),
  python: new Set([
    "function_definition",
    "class_definition",
    "decorated_definition",
  ]),
};

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build",
  ".next", "__pycache__", ".venv", "venv", "coverage",
]);

const MAX_FILE_LINES = 500;
const MIN_CHUNK_LINES = 3;

function extractChunksFromAST(
  rootNode: any,
  code: string,
  filePath: string,
  language: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const validTypes = CHUNK_NODE_TYPES[language] ?? new Set();

  function visit(node: any) {
    if (validTypes.has(node.type)) {
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const lineCount = endLine - startLine + 1;

      if (lineCount >= MIN_CHUNK_LINES) {
        const content = code.slice(node.startIndex, node.endIndex).trim();
        if (content) {
          chunks.push({ filePath, startLine, endLine, content, language });
        }
      }

      // For large nodes like a class with many methods,
      // also recurse to extract individual methods as sub-chunks.
      // This ensures a 300-line class doesn't become one giant chunk.
      if (endLine - startLine > 80) {
        for (const child of node.children) visit(child);
      }
      return;
    }

    for (const child of node.children) visit(child);
  }

  visit(rootNode);
  return chunks;
}

export function chunkRepository(repoPath: string): CodeChunk[] {
  const allChunks: CodeChunk[] = [];
  const parser = new Parser();

  function walk(dirPath: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      const langConfig = LANGUAGE_MAP[ext];
      if (!langConfig) continue;

      let code: string;
      try {
        code = fs.readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      const lines = code.split("\n");
      if (lines.length === 0 || lines.length > MAX_FILE_LINES) continue;

      const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, "/");

      let chunks: CodeChunk[];

      try {
        parser.setLanguage(langConfig.grammar);
        const tree = parser.parse(code); //codes ast is formed of a particular file
        chunks = extractChunksFromAST(
          tree.rootNode,
          code,
          relativePath,
          langConfig.language
        );  //chunks is formed by the ast

        // Fall back to whole-file chunk if tree-sitter
        // found no meaningful top-level declarations
        if (chunks.length === 0) {
          chunks = [{
            filePath: relativePath,
            startLine: 1,
            endLine: lines.length,
            content: code,
            language: langConfig.language,
          }];
        }
      } catch {
        chunks = [{
          filePath: relativePath,
          startLine: 1,
          endLine: lines.length,
          content: code,
          language: langConfig.language,
        }];
      }

      allChunks.push(...chunks);
    }
  }

  walk(repoPath);
  console.log(`Chunked into ${allChunks.length} chunks via tree-sitter`);
  return allChunks;
}