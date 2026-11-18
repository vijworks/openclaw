// Openai plugin module implements thinking policy behavior.
import type { ProviderThinkingProfile } from "openclaw/plugin-sdk/plugin-entry";

const OPENAI_THINKING_BASE_LEVELS = [
  { id: "off" },
  { id: "minimal" },
  { id: "low" },
  { id: "medium" },
  { id: "high" },
] as const satisfies ProviderThinkingProfile["levels"];

const OPENAI_CODEX_XHIGH_MODEL_IDS = [
  "gpt-5.6",
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.3-codex-spark",
] as const;

const OPENAI_UNIFIED_XHIGH_MODEL_IDS = [
  ...OPENAI_CODEX_XHIGH_MODEL_IDS,
  "gpt-5.4-mini",
  "gpt-5.4-nano",
] as const;

// Families whose every member supports xhigh on the unified OpenAI provider. A family matches
// its bare id or any "-"/"."-delimited variant (gpt-6, gpt-6-astra, gpt-6.1-sol), never a
// longer number that merely shares the prefix (gpt-60).
const OPENAI_UNIFIED_XHIGH_MODEL_FAMILIES = ["gpt-6"] as const;

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase();
}

function matchesExactOrPrefix(id: string, values: readonly string[]): boolean {
  const normalizedId = normalizeModelId(id);
  return values.some((value) => {
    const normalizedValue = normalizeModelId(value);
    return normalizedId === normalizedValue || normalizedId.startsWith(normalizedValue);
  });
}

function matchesModelFamily(id: string, families: readonly string[]): boolean {
  const normalizedId = normalizeModelId(id);
  return families.some((family) => {
    const normalizedFamily = normalizeModelId(family);
    return (
      normalizedId === normalizedFamily ||
      normalizedId.startsWith(`${normalizedFamily}-`) ||
      normalizedId.startsWith(`${normalizedFamily}.`)
    );
  });
}

function buildOpenAIThinkingProfile(params: {
  modelId: string;
  xhighModelIds: readonly string[];
  xhighModelFamilies?: readonly string[];
}): ProviderThinkingProfile {
  const supportsMax = normalizeModelId(params.modelId).startsWith("gpt-5.6");
  const supportsXhigh =
    matchesExactOrPrefix(params.modelId, params.xhighModelIds) ||
    matchesModelFamily(params.modelId, params.xhighModelFamilies ?? []);
  return {
    levels: [
      ...OPENAI_THINKING_BASE_LEVELS,
      ...(supportsXhigh ? [{ id: "xhigh" as const }] : []),
      ...(supportsMax ? [{ id: "max" as const }] : []),
    ],
  };
}

export function resolveOpenAICodexThinkingProfile(modelId: string): ProviderThinkingProfile {
  return buildOpenAIThinkingProfile({ modelId, xhighModelIds: OPENAI_CODEX_XHIGH_MODEL_IDS });
}

export function resolveUnifiedOpenAIThinkingProfile(modelId: string): ProviderThinkingProfile {
  return buildOpenAIThinkingProfile({
    modelId,
    xhighModelIds: OPENAI_UNIFIED_XHIGH_MODEL_IDS,
    xhighModelFamilies: OPENAI_UNIFIED_XHIGH_MODEL_FAMILIES,
  });
}
