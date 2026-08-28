import { createServerFn } from "@tanstack/react-start";
import { evaluateInput, nextQuestionInput, openingInput, reportInput } from "./schemas";

export const startInterview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => openingInput.parse(input))
  .handler(async ({ data }) => {
    const { runOpening } = await import("./interview-core.server");
    return runOpening(data);
  });

export const nextInterviewQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => nextQuestionInput.parse(input))
  .handler(async ({ data }) => {
    const { runNextQuestion } = await import("./interview-core.server");
    return runNextQuestion(data);
  });

export const evaluateInterviewAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => evaluateInput.parse(input))
  .handler(async ({ data }) => {
    const { runEvaluate } = await import("./interview-core.server");
    return runEvaluate(data);
  });

export const buildInterviewReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportInput.parse(input))
  .handler(async ({ data }) => {
    const { runReport } = await import("./interview-core.server");
    return runReport(data);
  });
