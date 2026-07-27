export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED = [
  { ext: ".pdf", mimes: ["application/pdf"] },
  {
    ext: ".docx",
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  { ext: ".txt", mimes: ["text/plain", ""] },
];

export function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const match = ALLOWED.find((a) => lower.endsWith(a.ext));
  if (!match) return "Formato não permitido. Envie PDF, DOCX ou TXT.";
  if (!match.mimes.includes(file.type) && file.type !== "") {
    return "O tipo do arquivo não corresponde à extensão. Envie PDF, DOCX ou TXT.";
  }
  if (file.size > MAX_FILE_BYTES) return "Arquivo muito grande. O limite é 10 MB.";
  if (file.size === 0) return "O arquivo está vazio.";
  return null;
}

/** Remove tags/scripts e normaliza espaços do texto extraído. */
export function sanitizeText(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt")) {
    return sanitizeText(await file.text());
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return sanitizeText(result.value);
  }
  if (lower.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out +=
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ") + "\n\n";
    }
    return sanitizeText(out);
  }
  throw new Error("Formato não suportado.");
}
