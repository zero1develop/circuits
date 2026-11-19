import { createWriteStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const PTAU_URL_BASE = "https://circom.info";
const PTAU_MAGIC = Buffer.from([0x70, 0x74, 0x61, 0x75, 0x01]);

function ptauName(constraints: number): string {
  const power = Math.max(8, Math.ceil(Math.log2(constraints)));
  if (power > 28) {
    throw new Error(`No supported PTAU file for ${constraints} constraints.`);
  }
  return `powersOfTau28_hez_final_${power.toString().padStart(2, "0")}.ptau`;
}

async function isValidPtau(path: string): Promise<boolean> {
  try {
    const file = await open(path, "r");
    try {
      const header = Buffer.alloc(PTAU_MAGIC.length);
      const { bytesRead } = await file.read(header, 0, header.length, 0);
      if (bytesRead !== PTAU_MAGIC.length || !header.equals(PTAU_MAGIC)) {
        return false;
      }
    } finally {
      await file.close();
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a valid phase-1 PTAU file for a circuit. Circomkit 0.3.4 writes an
 * HTTP error body as if it were a PTAU file, so setup must not delegate its
 * automatic downloader.
 */
export async function ensurePtau(
  constraints: number,
  destination: string,
): Promise<string> {
  const name = ptauName(constraints);
  if (await isValidPtau(destination)) {
    return destination;
  }

  const temporary = `${destination}.part`;
  await mkdir(dirname(destination), { recursive: true });
  await rm(temporary, { force: true });

  const response = await fetch(`${PTAU_URL_BASE}/${name}`);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${name}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  try {
    await pipeline(
      Readable.fromWeb(response.body as never),
      createWriteStream(temporary),
    );

    if (!(await isValidPtau(temporary))) {
      throw new Error(`${name} download failed integrity validation.`);
    }

    await rm(destination, { force: true });
    await rename(temporary, destination);
    return destination;
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export function ptauPathForConstraints(
  constraints: number,
  dirPtau: string,
): string {
  return `${dirPtau}/${ptauName(constraints)}`;
}
