// Upload checks (F-ASM-05): accept only PDF and DOCX, judged by the file's
// content rather than its name, and enforce a size limit.

export type AcceptedType = { kind: "PDF" | "DOCX"; mimeType: string; extension: ".pdf" | ".docx" };

const PDF: AcceptedType = { kind: "PDF", mimeType: "application/pdf", extension: ".pdf" };
const DOCX: AcceptedType = {
  kind: "DOCX",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extension: ".docx",
};

export const ACCEPTED_DESCRIPTION = "PDF or DOCX";

function startsWith(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((b, i) => bytes[i] === b);
}

/** A DOCX is a zip whose entries include word/document.xml; entry names are stored uncompressed. */
function containsAscii(bytes: Uint8Array, text: string) {
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

export function detectFileType(bytes: Uint8Array): AcceptedType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF; // "%PDF-"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && containsAscii(bytes, "word/document.xml")) return DOCX; // "PK\3\4"
  return null;
}

export type FileCheck =
  | { ok: true; type: AcceptedType }
  | { ok: false; message: string };

export function checkUpload(file: { name: string; size: number; bytes: Uint8Array }, maxBytes: number): FileCheck {
  const sizeMb = (file.size / 1_048_576).toFixed(1);
  const maxMb = Math.round(maxBytes / 1_048_576);
  if (file.size === 0) return { ok: false, message: "The file is empty." };
  const type = detectFileType(file.bytes);
  if (!type) {
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "";
    if (ext === "PDF" || ext === "DOCX") {
      return { ok: false, message: `${file.name} isn't a valid ${ext} file: its contents don't match its name.` };
    }
    return { ok: false, message: `${file.name} is not a PDF or DOCX file (${ext || "no extension"}, ${sizeMb} MB).` };
  }
  if (file.size > maxBytes) return { ok: false, message: `${file.name} is ${sizeMb} MB. The limit is ${maxMb} MB.` };
  return { ok: true, type };
}
