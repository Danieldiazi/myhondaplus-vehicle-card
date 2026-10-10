import { describe, expect, it } from "vitest";
import { createDiagnostics, diagnosticsText } from "../src/diagnostics";
import type { HassEntity, HomeAssistant } from "../src/types";

const entity = (entity_id: string, state: string): HassEntity => ({
  entity_id,
  state,
  last_updated: "2026-10-10T08:00:00Z",
  attributes: {
    latitude: 1.2345,
    longitude: 6.789,
    vin: "SYNTHETIC-VIN",
    friendly_name: "Synthetic private label",
  },
});
describe("diagnostics", () => {
  it("separates configured, present and usable entities including unpressed buttons", () => {
    const hass: HomeAssistant = {
      callWS: async <T>() => [] as T,
      callService: async () => {},
      states: {
        "lock.synthetic": entity("lock.synthetic", "unavailable"),
        "sensor.synthetic": entity("sensor.synthetic", "unknown"),
        "button.synthetic": entity("button.synthetic", "unknown"),
      },
    };
    const result = createDiagnostics(
      hass,
      {
        lock: "lock.synthetic",
        range: "sensor.synthetic",
        refresh: "button.synthetic",
        location: "device_tracker.synthetic_missing",
      },
      "generic",
      "en",
    );
    expect(result.entities.find(({ key }) => key === "lock")).toMatchObject({
      configured: true,
      present: true,
      available: false,
    });
    expect(result.entities.find(({ key }) => key === "range")?.available).toBe(false);
    expect(result.entities.find(({ key }) => key === "refresh")?.available).toBe(true);
    expect(result.entities.find(({ key }) => key === "location")).toMatchObject({
      configured: true,
      present: false,
      available: false,
    });
    expect(result.entities.find(({ key }) => key === "battery")).toMatchObject({
      configured: false,
      present: false,
      available: false,
    });
    const text = diagnosticsText(result);
    for (const privateValue of [
      "synthetic",
      "SYNTHETIC-VIN",
      "1.2345",
      "6.789",
      "Synthetic private label",
      "last_updated",
      "unavailable",
    ])
      expect(text).not.toContain(privateValue);
    expect(text).toContain("button.[redacted]");
  });
});
