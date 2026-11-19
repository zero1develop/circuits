import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MANIFEST_PATH = path.join(REPOSITORY_ROOT, "artifacts.sha256");
const SHA256_LINE = /^([a-fA-F0-9]{64})  (.+)$/;

interface ManifestEntry {
  expectedHash: string;
  relativePath: string;
  absolutePath: string;
}

async function sha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });

  return hash.digest("hex");
}

function parseManifest(contents: string): {
  entries: ManifestEntry[];
  errors: string[];
} {
  const entries: ManifestEntry[] = [];
  const errors: string[] = [];
  const seenPaths = new Set<string>();

  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trimEnd();
    if (line.length === 0 || line.startsWith("#")) continue;

    const match = SHA256_LINE.exec(line);
    if (!match) {
      errors.push(`line ${lineNumber}: invalid SHA-256 manifest entry`);
      continue;
    }

    const expectedHash = match[1].toLowerCase();
    const relativePath = match[2].replaceAll("\\", "/");
    const absolutePath = path.resolve(REPOSITORY_ROOT, relativePath);
    const relativeToRoot = path.relative(REPOSITORY_ROOT, absolutePath);

    if (
      path.isAbsolute(relativePath) ||
      relativeToRoot === ".." ||
      relativeToRoot.startsWith(`..${path.sep}`)
    ) {
      errors.push(`line ${lineNumber}: path escapes repository: ${relativePath}`);
      continue;
    }

    if (seenPaths.has(relativePath)) {
      errors.push(`line ${lineNumber}: duplicate path: ${relativePath}`);
      continue;
    }

    seenPaths.add(relativePath);
    entries.push({ expectedHash, relativePath, absolutePath });
  }

  if (entries.length === 0) {
    errors.push("manifest contains no artifact entries");
  }

  return { entries, errors };
}

async function main(): Promise<void> {
  let manifestContents: string;
  try {
    manifestContents = await readFile(MANIFEST_PATH, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to read ${path.basename(MANIFEST_PATH)}: ${message}`);
    process.exitCode = 1;
    return;
  }

  const { entries, errors } = parseManifest(manifestContents);
  const missing: string[] = [];
  const mismatched: Array<{
    path: string;
    expected: string;
    actual: string;
  }> = [];
  const unreadable: Array<{ path: string; error: string }> = [];

  for (const entry of entries) {
    try {
      const actualHash = await sha256(entry.absolutePath);
      if (actualHash !== entry.expectedHash) {
        mismatched.push({
          path: entry.relativePath,
          expected: entry.expectedHash,
          actual: actualHash,
        });
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        missing.push(entry.relativePath);
      } else {
        unreadable.push({
          path: entry.relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (errors.length > 0) {
    console.error("\nInvalid manifest entries:");
    for (const error of errors) console.error(`  - ${error}`);
  }

  if (missing.length > 0) {
    console.error("\nMissing files:");
    for (const file of missing) console.error(`  - ${file}`);
  }

  if (mismatched.length > 0) {
    console.error("\nHash mismatches:");
    for (const file of mismatched) {
      console.error(`  - ${file.path}`);
      console.error(`      expected: ${file.expected}`);
      console.error(`      actual:   ${file.actual}`);
    }
  }

  if (unreadable.length > 0) {
    console.error("\nUnreadable files:");
    for (const file of unreadable) {
      console.error(`  - ${file.path}: ${file.error}`);
    }
  }

  const failureCount =
    errors.length + missing.length + mismatched.length + unreadable.length;
  if (failureCount > 0) {
    console.error(
      `\nArtifact verification failed: ${failureCount} issue(s) across ${entries.length} manifest entries.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Artifact verification passed: ${entries.length} files match artifacts.sha256.`,
  );
}

void main();
