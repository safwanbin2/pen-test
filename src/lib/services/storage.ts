// File store for submissions. Local disk under UPLOAD_DIR (D16); everything
// goes through these two functions so object storage can replace it later.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Uploaded files are runtime data, not part of the build: tell the bundler not to trace these paths.
const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? "storage/uploads");

function resolveKey(key: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function saveFile(key: string, bytes: Uint8Array) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export async function loadFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch {
    return null;
  }
}

export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_MB ?? 10) * 1_048_576;
