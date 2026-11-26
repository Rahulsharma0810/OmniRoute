import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  providerSupportsFreeOnlyImport,
  selectModelsForImport,
} from "../../src/shared/utils/freeModels.ts";

const ids = (models: Array<{ id?: string }>) => models.map((m) => m.id);

// Shape of https://ai-gateway.vercel.sh/v1/models: `pricing.input` / `pricing.output` + `tags`.
const VAG_PAYLOAD = [
  { id: "stealth/pixel-canary", pricing: { input: "0", output: "0" } },
  { id: "vendor/paid", pricing: { input: "0.0000001", output: "0.0000004" } },
  { id: "vendor/half-free", pricing: { input: "0", output: "0.0000004" } },
  { id: "vendor/unpriced" },
  { id: "vendor/empty-pricing", pricing: {} },
  { id: "vendor/blank-pricing", pricing: { input: "", output: "" } },
  { id: "vendor/tagged-but-priced", pricing: { input: "0.1", output: "0.4" }, tags: ["free"] },
];

describe("free-only import for providers that publish live pricing", () => {
  it("offers the toggle for vercel-ai-gateway (id and alias)", () => {
    assert.equal(providerSupportsFreeOnlyImport("vercel-ai-gateway"), true);
    assert.equal(providerSupportsFreeOnlyImport("vag"), true);
  });

  it("still hides the toggle for a provider with no free catalog and no live pricing", () => {
    assert.equal(providerSupportsFreeOnlyImport("openai"), false);
  });

  it("imports only the zero-priced vercel-ai-gateway model", () => {
    const result = selectModelsForImport("vercel-ai-gateway", VAG_PAYLOAD, true);
    assert.deepEqual(ids(result.models), ["stealth/pixel-canary"]);
    assert.equal(result.freeFilterEmpty, false);
  });

  it("works through the vag alias too", () => {
    const result = selectModelsForImport("vag", VAG_PAYLOAD, true);
    assert.deepEqual(ids(result.models), ["stealth/pixel-canary"]);
  });

  it("never treats an unpriced model as free", () => {
    const result = selectModelsForImport(
      "vercel-ai-gateway",
      [{ id: "vendor/unpriced" }, { id: "vendor/empty-pricing", pricing: {} }],
      true
    );
    assert.deepEqual(result.models, []);
    assert.equal(result.freeFilterEmpty, true);
  });

  it("passes the whole list through when the option is off", () => {
    const result = selectModelsForImport("vercel-ai-gateway", VAG_PAYLOAD, false);
    assert.equal(result.models.length, VAG_PAYLOAD.length);
  });
});
