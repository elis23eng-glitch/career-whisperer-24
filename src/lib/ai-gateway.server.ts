import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
    includeUsage: true,
    supportsStructuredOutputs: true,
  });
}

export function requireApiKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Serviço de IA indisponível no momento.");
  return key;
}
