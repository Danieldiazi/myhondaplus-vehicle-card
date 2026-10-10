import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config";
import type { MyHondaPlusCardConfig } from "../src/types";

const config = { type: "custom:myhondaplus-vehicle-card" };
describe("runtime configuration", () => {
  it("keeps defaults when optional fields are undefined and preserves explicit empty lists", () => {
    expect(
      normalizeConfig({ ...config, controls: undefined, stale_after: undefined }).stale_after,
    ).toBe(21600);
    expect(
      normalizeConfig({ ...config, statuses: [], controls: ["location", "refresh_cached"] }),
    ).toMatchObject({ statuses: [], controls: ["location", "refresh_cached"] });
  });
  it.each<Record<string, unknown>>([
    { controls: ["unsupported"] },
    { controls: "lock" },
    { metrics: ["range", "range"] },
    { statuses: [4] },
    { stale_after: -1 },
    { stale_after: NaN },
    { show_controls: "false" },
    { layout: "wide" },
    { entities: { lock: "sensor.synthetic_lock" } },
    { entities: { unsupported: "switch.synthetic" } },
    { entities: null },
    { entities: { constructor: "switch.synthetic" } },
  ])("rejects malformed configuration instead of failing during rendering: %j", (invalid) => {
    expect(() => normalizeConfig({ ...config, ...invalid } as MyHondaPlusCardConfig, "en")).toThrow(
      "Invalid configuration field:",
    );
  });
  it("uses localized errors without exposing an entity identifier", () => {
    expect(() =>
      normalizeConfig({ ...config, entities: { lock: "sensor.synthetic_private" } }, "es"),
    ).toThrow("Campo de configuración no válido: entities");
  });
});
