// Openai tests cover provider policy api plugin behavior.
import { describe, expect, it } from "vitest";
import { resolveThinkingProfile } from "./provider-policy-api.js";
import { resolveOpenAICodexThinkingProfile } from "./thinking-policy.js";

const levelIds = (modelId: string) =>
  resolveThinkingProfile({ provider: "openai", modelId })?.levels.map((level) => level.id);

describe("OpenAI provider policy artifact", () => {
  it("keeps OpenAI thinking policy for openai refs", () => {
    const codexProfile = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.3-codex-spark",
    });
    const openaiProfile = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.3",
    });
    const openaiMiniProfile = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.4-mini",
    });

    expect(codexProfile?.levels.map((level) => level.id)).toContain("xhigh");
    expect(openaiProfile?.levels.map((level) => level.id)).not.toContain("xhigh");
    expect(openaiMiniProfile?.levels.map((level) => level.id)).toContain("xhigh");
  });

  it("exposes max for the GPT-5.6 series", () => {
    const solLevels = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.6-sol",
    })?.levels.map((level) => level.id);
    const terraLevels = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.6-terra",
    })?.levels.map((level) => level.id);
    const lunaLevels = resolveThinkingProfile({
      provider: "openai",
      modelId: "gpt-5.6-luna",
    })?.levels.map((level) => level.id);

    expect(solLevels).toContain("max");
    expect(terraLevels).toContain("xhigh");
    expect(terraLevels).toContain("max");
    expect(lunaLevels).toContain("xhigh");
    expect(lunaLevels).toContain("max");
  });

  it("exposes xhigh for the GPT-6 family on openai refs", () => {
    for (const modelId of [
      "gpt-6",
      "gpt-6-astra",
      "GPT-6-Astra",
      "gpt-6.1-sol",
      "gpt-6-astra-mini",
    ]) {
      expect(levelIds(modelId), modelId).toEqual([
        "off",
        "minimal",
        "low",
        "medium",
        "high",
        "xhigh",
      ]);
    }
  });

  it("keeps GPT-5.x thinking levels unchanged", () => {
    const base = ["off", "minimal", "low", "medium", "high"];
    expect(levelIds("gpt-5.3")).toEqual(base);
    expect(levelIds("gpt-5.2")).toEqual(base);
    for (const modelId of ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.5", "gpt-5.5-pro"]) {
      expect(levelIds(modelId), modelId).toEqual([...base, "xhigh"]);
    }
    expect(levelIds("gpt-5.3-codex-spark")).toEqual([...base, "xhigh"]);
    expect(levelIds("gpt-5.6-sol")).toEqual([...base, "xhigh", "max"]);
  });

  it("does not grant xhigh to unlisted models or prefix look-alikes", () => {
    for (const modelId of ["gpt-60", "gpt-6x", "gpt-4.1", "o3-mini", "unknown-model", "gpt-5"]) {
      expect(levelIds(modelId), modelId).not.toContain("xhigh");
    }
  });

  it("leaves the Codex thinking policy unchanged for GPT-6", () => {
    expect(
      resolveOpenAICodexThinkingProfile("gpt-6-astra").levels.map((level) => level.id),
    ).toEqual(["off", "minimal", "low", "medium", "high"]);
  });
});
