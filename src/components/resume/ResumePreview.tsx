import type { ResumeContent } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="border-b pb-1 text-[13px] font-bold uppercase tracking-wide">{title}</h3>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed">{children}</div>
    </section>
  );
}

export function ResumePreview({ content }: { content: ResumeContent }) {
  const contactLine = [content.location, content.contacts?.email, content.contacts?.phone]
    .filter(Boolean)
    .join(" | ");
  const links = [content.contacts?.linkedin, content.contacts?.portfolio]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className="mx-auto w-full max-w-[820px] rounded-xl border bg-card p-6 text-card-foreground shadow-soft sm:p-10">
      <header>
        <h2 className="text-2xl font-extrabold">{content.fullName || "Nome não identificado"}</h2>
        {content.professionalTitle ? (
          <p className="text-sm font-semibold text-muted-foreground">
            {content.professionalTitle}
          </p>
        ) : null}
        {contactLine ? <p className="mt-1 text-[13px]">{contactLine}</p> : null}
        {links ? <p className="text-[13px] break-words">{links}</p> : null}
      </header>

      {content.summary ? (
        <Section title="Resumo profissional">
          <p>{content.summary}</p>
        </Section>
      ) : null}

      {content.coreSkills?.length ? (
        <Section title="Competências principais">
          <p>{content.coreSkills.join(" • ")}</p>
        </Section>
      ) : null}

      {content.softSkills?.length ? (
        <Section title="Competências comportamentais">
          <p>{content.softSkills.join(" • ")}</p>
        </Section>
      ) : null}

      {content.experiences?.length ? (
        <Section title="Experiência profissional">
          {content.experiences.map((e, i) => (
            <div key={i} className="mb-3">
              <p className="font-semibold">{[e.role, e.company].filter(Boolean).join(" — ")}</p>
              <p className="text-muted-foreground">
                {[e.location, e.period].filter(Boolean).join(" | ")}
              </p>
              {e.context ? <p className="mt-1">{e.context}</p> : null}
              {e.bullets?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}

      {content.education?.length ? (
        <Section title="Formação acadêmica">
          {content.education.map((e, i) => (
            <p key={i}>{[e.degree, e.institution, e.period].filter(Boolean).join(" — ")}</p>
          ))}
        </Section>
      ) : null}

      {content.certifications?.length ? (
        <Section title="Cursos e certificações">
          {content.certifications.map((e, i) => (
            <p key={i}>{[e.name, e.issuer, e.year].filter(Boolean).join(" — ")}</p>
          ))}
        </Section>
      ) : null}

      {content.languages?.length ? (
        <Section title="Idiomas">
          {content.languages.map((l, i) => (
            <p key={i}>{[l.name, l.level].filter(Boolean).join(" — ")}</p>
          ))}
        </Section>
      ) : null}

      {content.tools?.length ? (
        <Section title="Ferramentas e tecnologias">
          <p>{content.tools.join(" • ")}</p>
        </Section>
      ) : null}

      {content.projects?.length ? (
        <Section title="Projetos relevantes">
          {content.projects.map((p, i) => (
            <div key={i}>
              <p className="font-semibold">{[p.name, p.period].filter(Boolean).join(" — ")}</p>
              {p.description ? <p>{p.description}</p> : null}
            </div>
          ))}
        </Section>
      ) : null}

      {content.additionalInfo?.length ? (
        <Section title="Informações adicionais">
          <ul className="list-disc space-y-1 pl-5">
            {content.additionalInfo.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
