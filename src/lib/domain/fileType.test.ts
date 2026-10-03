import { describe, expect, it } from "vitest";
import { checkUpload, detectFileType } from "./fileType";

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const pdf = ascii("%PDF-1.7\n...");
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...ascii("....word/document.xml....")]);
const otherZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...ascii("....index.xml....")]); // e.g. a .pages file
const MB = 1_048_576;

describe("detectFileType", () => {
  it("recognises PDF and DOCX by content", () => {
    expect(detectFileType(pdf)?.kind).toBe("PDF");
    expect(detectFileType(docx)?.kind).toBe("DOCX");
  });

  it("rejects other zips and arbitrary bytes", () => {
    expect(detectFileType(otherZip)).toBeNull();
    expect(detectFileType(ascii("hello"))).toBeNull();
  });
});

describe("checkUpload", () => {
  it("accepts a PDF under the limit", () => {
    expect(checkUpload({ name: "report.pdf", size: 2 * MB, bytes: pdf }, 10 * MB)).toMatchObject({ ok: true });
  });

  it("rejects a renamed file by content, naming what it is", () => {
    const result = checkUpload({ name: "case-study-final.pages", size: 14.2 * MB, bytes: otherZip }, 10 * MB);
    expect(result).toEqual({ ok: false, message: "case-study-final.pages is not a PDF or DOCX file (PAGES, 14.2 MB)." });
  });

  it("explains a file whose name claims PDF but whose contents aren't", () => {
    expect(checkUpload({ name: "essay.pdf", size: 5, bytes: ascii("hello") }, 10 * MB)).toEqual({
      ok: false,
      message: "essay.pdf isn't a valid PDF file: its contents don't match its name.",
    });
  });

  it("rejects a valid PDF over the size limit", () => {
    expect(checkUpload({ name: "big.pdf", size: 11 * MB, bytes: pdf }, 10 * MB)).toEqual({
      ok: false,
      message: "big.pdf is 11.0 MB. The limit is 10 MB.",
    });
  });

  it("rejects empty files", () => {
    expect(checkUpload({ name: "empty.pdf", size: 0, bytes: new Uint8Array() }, 10 * MB)).toMatchObject({ ok: false });
  });
});
