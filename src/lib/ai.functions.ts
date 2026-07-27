import { createServerFn } from "@tanstack/react-start";
import { analyzeInput, generateInput, rewriteInput, urlInput } from "./ai-schemas";

export const analyzeMatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => analyzeInput.parse(input))
  .handler(async ({ data }) => {
    const { runAnalysis } = await import("./ai-core.server");
    return runAnalysis(data);
  });

export const generateTailoredResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => generateInput.parse(input))
  .handler(async ({ data }) => {
    const { runGenerate } = await import("./ai-core.server");
    return runGenerate(data);
  });

export const rewriteSnippet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rewriteInput.parse(input))
  .handler(async ({ data }) => {
    const { runRewrite } = await import("./ai-core.server");
    return runRewrite(data);
  });

export const fetchJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => urlInput.parse(input))
  .handler(async ({ data }) => {
    const { runFetchUrl } = await import("./ai-core.server");
    return runFetchUrl(data.url);
  });
