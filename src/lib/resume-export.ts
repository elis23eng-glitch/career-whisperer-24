import type { ResumeContent } from "./types";
import { sanitizeFileName } from "./storage";

export function buildFileName(content: ResumeContent, jobTitle: string) {
  const name = sanitizeFileName(content.fullName || "Curriculo");
  const job = sanitizeFileName(jobTitle || "Vaga");
  return `${name}_Curriculo_${job}`;
}

export function resumeToPlainText(c: ResumeContent): string {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);
  const section = (title: string) => {
    push("");
    push(title.toUpperCase());
    push("");
  };

  if (c.fullName) push(c.fullName);
  if (c.professionalTitle) push(c.professionalTitle);
  const contactLine = [c.location, c.contacts?.email, c.contacts?.phone].filter(Boolean).join(" | ");
  if (contactLine) push(contactLine);
  const links = [c.contacts?.linkedin, c.contacts?.portfolio].filter(Boolean).join(" | ");
  if (links) push(links);

  if (c.objective) {
    section("Objetivo");
    push(c.objective);
  }
  if (c.summary) {
    section("Resumo profissional");
    push(c.summary);
  }
  if (c.coreSkills?.length) {
    section("Competências principais");
    push(c.coreSkills.join("; "));
  }
  if (c.softSkills?.length) {
    section("Competências comportamentais");
    push(c.softSkills.join("; "));
  }
  if (c.experiences?.length) {
    section("Experiência profissional");
    c.experiences.forEach((e) => {
      push([e.role, e.company].filter(Boolean).join(" — "));
      push([e.location, e.period].filter(Boolean).join(" | "));
      if (e.context) push(e.context);
      e.bullets?.forEach((b) => push(`- ${b}`));
      push("");
    });
  }
  if (c.education?.length) {
    section("Formação acadêmica");
    c.education.forEach((e) => {
      push([e.degree, e.institution, e.period].filter(Boolean).join(" — "));
      if (e.details) push(e.details);
    });
  }
  if (c.certifications?.length) {
    section("Cursos e certificações");
    c.certifications.forEach((e) => push([e.name, e.issuer, e.year].filter(Boolean).join(" — ")));
  }
  if (c.languages?.length) {
    section("Idiomas");
    c.languages.forEach((l) => push([l.name, l.level].filter(Boolean).join(" — ")));
  }
  if (c.tools?.length) {
    section("Ferramentas e tecnologias");
    push(c.tools.join("; "));
  }
  if (c.projects?.length) {
    section("Projetos relevantes");
    c.projects.forEach((p) => {
      push([p.name, p.period].filter(Boolean).join(" — "));
      if (p.description) push(p.description);
    });
  }
  if (c.additionalInfo?.length) {
    section("Informações adicionais");
    c.additionalInfo.forEach((i) => push(`- ${i}`));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportTxt(content: ResumeContent, jobTitle: string) {
  download(
    new Blob([resumeToPlainText(content)], { type: "text/plain;charset=utf-8" }),
    `${buildFileName(content, jobTitle)}.txt`,
  );
}

export async function exportPdf(content: ResumeContent, jobTitle: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 18;
  const marginY = 18;
  const width = 210 - marginX * 2;
  let y = marginY;

  const ensureSpace = (needed = 6) => {
    if (y + needed > 297 - marginY) {
      doc.addPage();
      y = marginY;
    }
  };

  const text = (value: string, size: number, style: "normal" | "bold", gap = 1.5) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value, width) as string[];
    lines.forEach((line) => {
      ensureSpace(size * 0.5);
      doc.text(line, marginX, y);
      y += size * 0.42 + gap;
    });
  };

  const heading = (value: string) => {
    y += 2.5;
    ensureSpace(10);
    text(value.toUpperCase(), 12, "bold", 0.8);
    doc.setDrawColor(200);
    doc.line(marginX, y - 1.5, marginX + width, y - 1.5);
    y += 1.5;
  };

  if (content.fullName) text(content.fullName, 18, "bold", 1);
  if (content.professionalTitle) text(content.professionalTitle, 12, "normal", 1);
  const contactLine = [content.location, content.contacts?.email, content.contacts?.phone]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) text(contactLine, 10, "normal", 0.8);
  const links = [content.contacts?.linkedin, content.contacts?.portfolio]
    .filter(Boolean)
    .join(" | ");
  if (links) text(links, 10, "normal", 0.8);

  if (content.summary) {
    heading("Resumo profissional");
    text(content.summary, 10.5, "normal");
  }
  if (content.coreSkills?.length) {
    heading("Competências principais");
    text(content.coreSkills.join("; "), 10.5, "normal");
  }
  if (content.softSkills?.length) {
    heading("Competências comportamentais");
    text(content.softSkills.join("; "), 10.5, "normal");
  }
  if (content.experiences?.length) {
    heading("Experiência profissional");
    content.experiences.forEach((e) => {
      text([e.role, e.company].filter(Boolean).join(" — "), 11, "bold", 0.6);
      const meta = [e.location, e.period].filter(Boolean).join(" | ");
      if (meta) text(meta, 10, "normal", 0.6);
      if (e.context) text(e.context, 10.5, "normal", 0.6);
      e.bullets?.forEach((b) => text(`• ${b}`, 10.5, "normal", 0.6));
      y += 2;
    });
  }
  if (content.education?.length) {
    heading("Formação acadêmica");
    content.education.forEach((e) => {
      text([e.degree, e.institution, e.period].filter(Boolean).join(" — "), 10.5, "normal");
      if (e.details) text(e.details, 10.5, "normal");
    });
  }
  if (content.certifications?.length) {
    heading("Cursos e certificações");
    content.certifications.forEach((e) =>
      text([e.name, e.issuer, e.year].filter(Boolean).join(" — "), 10.5, "normal"),
    );
  }
  if (content.languages?.length) {
    heading("Idiomas");
    content.languages.forEach((l) =>
      text([l.name, l.level].filter(Boolean).join(" — "), 10.5, "normal"),
    );
  }
  if (content.tools?.length) {
    heading("Ferramentas e tecnologias");
    text(content.tools.join("; "), 10.5, "normal");
  }
  if (content.projects?.length) {
    heading("Projetos relevantes");
    content.projects.forEach((p) => {
      text([p.name, p.period].filter(Boolean).join(" — "), 11, "bold", 0.6);
      if (p.description) text(p.description, 10.5, "normal");
    });
  }
  if (content.additionalInfo?.length) {
    heading("Informações adicionais");
    content.additionalInfo.forEach((i) => text(`• ${i}`, 10.5, "normal"));
  }

  doc.save(`${buildFileName(content, jobTitle)}.pdf`);
}

export async function exportDocx(content: ResumeContent, jobTitle: string) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  const body: InstanceType<typeof Paragraph>[] = [];
  const p = (text: string, opts: { bold?: boolean; size?: number; bullet?: boolean } = {}) =>
    new Paragraph({
      spacing: { after: 80 },
      ...(opts.bullet ? { bullet: { level: 0 } } : {}),
      children: [new TextRun({ text, bold: opts.bold, size: (opts.size ?? 11) * 2 })],
    });
  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 220, after: 100 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 26 })],
    });

  if (content.fullName)
    body.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [new TextRun({ text: content.fullName, bold: true, size: 32 })],
      }),
    );
  if (content.professionalTitle) body.push(p(content.professionalTitle, { size: 11.5 }));
  const contactLine = [content.location, content.contacts?.email, content.contacts?.phone]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) body.push(p(contactLine, { size: 10.5 }));
  const links = [content.contacts?.linkedin, content.contacts?.portfolio]
    .filter(Boolean)
    .join(" | ");
  if (links) body.push(p(links, { size: 10.5 }));

  if (content.summary) {
    body.push(heading("Resumo profissional"), p(content.summary));
  }
  if (content.coreSkills?.length) {
    body.push(heading("Competências principais"), p(content.coreSkills.join("; ")));
  }
  if (content.softSkills?.length) {
    body.push(heading("Competências comportamentais"), p(content.softSkills.join("; ")));
  }
  if (content.experiences?.length) {
    body.push(heading("Experiência profissional"));
    content.experiences.forEach((e) => {
      body.push(p([e.role, e.company].filter(Boolean).join(" — "), { bold: true }));
      const meta = [e.location, e.period].filter(Boolean).join(" | ");
      if (meta) body.push(p(meta, { size: 10.5 }));
      if (e.context) body.push(p(e.context));
      e.bullets?.forEach((b) => body.push(p(b, { bullet: true })));
    });
  }
  if (content.education?.length) {
    body.push(heading("Formação acadêmica"));
    content.education.forEach((e) => {
      body.push(p([e.degree, e.institution, e.period].filter(Boolean).join(" — ")));
      if (e.details) body.push(p(e.details));
    });
  }
  if (content.certifications?.length) {
    body.push(heading("Cursos e certificações"));
    content.certifications.forEach((e) =>
      body.push(p([e.name, e.issuer, e.year].filter(Boolean).join(" — "))),
    );
  }
  if (content.languages?.length) {
    body.push(heading("Idiomas"));
    content.languages.forEach((l) => body.push(p([l.name, l.level].filter(Boolean).join(" — "))));
  }
  if (content.tools?.length) {
    body.push(heading("Ferramentas e tecnologias"), p(content.tools.join("; ")));
  }
  if (content.projects?.length) {
    body.push(heading("Projetos relevantes"));
    content.projects.forEach((pr) => {
      body.push(p([pr.name, pr.period].filter(Boolean).join(" — "), { bold: true }));
      if (pr.description) body.push(p(pr.description));
    });
  }
  if (content.additionalInfo?.length) {
    body.push(heading("Informações adicionais"));
    content.additionalInfo.forEach((i) => body.push(p(i, { bullet: true })));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1020, right: 1020, bottom: 1020, left: 1020 },
          },
        },
        children: body,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, `${buildFileName(content, jobTitle)}.docx`);
}

export function downloadJson(data: unknown, fileName: string) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), fileName);
}
