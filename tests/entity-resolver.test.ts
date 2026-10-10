import { describe, expect, it } from "vitest";
import { resolveEntities } from "../src/entity-resolver";
import type { EntityRegistryEntry } from "../src/types";

const entry = (entity_id: string, translation_key?: string): EntityRegistryEntry => ({
  entity_id,
  device_id: "vehicle",
  platform: "myhondaplus",
  translation_key,
  disabled_by: null,
});

describe("resolveEntities", () => {
  it("matches entities by domain and translation key", () => {
    const result = resolveEntities([
      entry("sensor.civic_battery", "battery_level"),
      entry("lock.civic", "doors"),
      entry("button.civic_refresh", "refresh_from_car"),
    ]);
    expect(result.battery).toBe("sensor.civic_battery");
    expect(result.lock).toBe("lock.civic");
    expect(result.refresh).toBe("button.civic_refresh");
  });

  it("does not confuse a sensor with a lock", () => {
    const result = resolveEntities([entry("sensor.door_lock_status", "door_lock")]);
    expect(result.lock).toBeUndefined();
  });

  it.each(["doors", "windows"] as const)(
    "detects renamed %s by the integration's open-status key",
    (status) => {
      const detected = entry("binary_sensor.synthetic_renamed", `${status}_open`);
      expect(resolveEntities([detected])[status]).toBe(detected.entity_id);
    },
  );

  it.each(["doors", "windows"] as const)(
    "detects renamed %s by unique id without a translation key",
    (status) => {
      const detected = {
        ...entry("binary_sensor.synthetic_renamed"),
        unique_id: `synthetic_${status}_open`,
      };
      expect(resolveEntities([detected])[status]).toBe(detected.entity_id);
    },
  );

  it.each(["doors", "windows"] as const)(
    "prefers the current %s key over legacy aliases in any registry order",
    (status) => {
      const current = entry("binary_sensor.synthetic_z", `${status}_open`);
      const legacy = entry("binary_sensor.synthetic_a", status);
      for (const entries of [
        [current, legacy],
        [legacy, current],
      ]) {
        expect(resolveEntities(entries)[status]).toBe(current.entity_id);
      }
    },
  );

  it.each(["doors", "windows"] as const)(
    "keeps %s legacy aliases and name fallbacks compatible",
    (status) => {
      const singular = status === "doors" ? "door" : "window";
      for (const alias of [status, singular]) {
        const legacy = entry("binary_sensor.synthetic_renamed", alias);
        expect(resolveEntities([legacy])[status]).toBe(legacy.entity_id);
      }
      const fallbackId = entry(`binary_sensor.synthetic_${status}_open`);
      const fallbackName = {
        ...entry("binary_sensor.synthetic_renamed"),
        original_name: `${status}_open`,
      };
      expect(resolveEntities([fallbackId])[status]).toBe(fallbackId.entity_id);
      expect(resolveEntities([fallbackName])[status]).toBe(fallbackName.entity_id);
    },
  );

  it.each(["doors", "windows"] as const)(
    "rejects incompatible, disabled and foreign %s candidates",
    (status) => {
      const key = `${status}_open`;
      const incompatible = {
        ...entry(`binary_sensor.synthetic_${key}`, `${status}_locked`),
        unique_id: `synthetic_${status}_locked`,
        original_name: key,
      };
      const disabled = { ...entry("binary_sensor.synthetic_disabled", key), disabled_by: "user" };
      const foreign = {
        ...entry("binary_sensor.synthetic_foreign", key),
        platform: "other_integration",
      };
      expect(
        resolveEntities([
          incompatible,
          disabled,
          foreign,
          entry("sensor.synthetic_status", key),
          entry("lock.synthetic_status", key),
        ])[status],
      ).toBeUndefined();
    },
  );

  it("preserves explicit overrides", () => {
    const result = resolveEntities([entry("sensor.detected_range", "range")], {
      range: "sensor.manual_range",
    });
    expect(result.range).toBe("sensor.manual_range");
  });

  it("ignores similarly named entities from other integrations", () => {
    const foreign = entry("sensor.phone_battery", "battery_level");
    foreign.platform = "mobile_app";
    expect(resolveEntities([foreign]).battery).toBeUndefined();
  });

  it("does not treat a generic 12 V battery name as traction battery data", () => {
    expect(resolveEntities([entry("sensor.civic_battery", "battery")]).battery).toBeUndefined();
  });

  it("detects trip metrics and separates both refresh buttons", () => {
    const result = resolveEntities([
      entry("sensor.civic_month_distance", "distance_this_month"),
      entry("sensor.civic_consumption", "avg_consumption_this_month"),
      entry("button.civic_refresh", "refresh"),
      entry("button.civic_refresh_from_car", "refresh_from_car"),
      entry("button.civic_horn", "horn_lights"),
    ]);

    expect(result.trip_distance).toBe("sensor.civic_month_distance");
    expect(result.trip_consumption).toBe("sensor.civic_consumption");
    expect(result.refresh_cached).toBe("button.civic_refresh");
    expect(result.refresh).toBe("button.civic_refresh_from_car");
    expect(result.horn_lights).toBe("button.civic_horn");
  });
  it.each(["refresh_data", "refresh_from_car"])("keeps %s separate from cached refresh", (key) => {
    const remote = entry("button.synthetic_renamed_remote", key);
    const cached = entry("button.synthetic_renamed_cached", "refresh_cached");
    for (const entries of [
      [remote, cached],
      [cached, remote],
    ]) {
      expect(resolveEntities(entries)).toMatchObject({
        refresh: remote.entity_id,
        refresh_cached: cached.entity_id,
      });
    }
    expect(resolveEntities([remote]).refresh_cached).toBeUndefined();
  });

  it("uses stable unique identifiers before renamed entity ids or display names", () => {
    const remote = { ...entry("button.synthetic_traducido"), unique_id: "synthetic_refresh_data" };
    const cached = { ...entry("button.synthetic_guardado"), unique_id: "synthetic_refresh_cached" };
    expect(resolveEntities([remote, cached])).toMatchObject({
      refresh: remote.entity_id,
      refresh_cached: cached.entity_id,
    });
    expect(resolveEntities([entry("button.synthetic_refresh_data")]).refresh).toBe(
      "button.synthetic_refresh_data",
    );
  });

  it("selects climate independently of order, excluding defrost and related settings", () => {
    const climate = entry("switch.synthetic_renamed", "climate");
    const related = [
      entry("switch.synthetic_climate_defrost", "climate_defrost_setting"),
      entry("switch.synthetic_climate_duration", "climate_duration_setting"),
    ];
    for (const entries of [
      [...related, climate],
      [climate, ...related],
    ]) {
      expect(resolveEntities(entries).climate).toBe(climate.entity_id);
    }
    expect(resolveEntities(related).climate).toBeUndefined();
    expect(resolveEntities([entry("switch.synthetic_climate_defrost")]).climate).toBeUndefined();
    expect(resolveEntities([entry("switch.synthetic_preconditioning")]).climate).toBe(
      "switch.synthetic_preconditioning",
    );
  });

  it("does not let a display name override a stable incompatible capability", () => {
    const plug = {
      ...entry("sensor.synthetic_charging", "plug_status"),
      original_name: "Charging",
    };
    expect(resolveEntities([plug]).charging).toBeUndefined();
    expect(resolveEntities([entry("sensor.synthetic_carga", "charge_status")]).charging).toBe(
      "sensor.synthetic_carga",
    );
    expect(resolveEntities([entry("sensor.synthetic_charging")]).charging).toBe(
      "sensor.synthetic_charging",
    );
  });

  it("ignores disabled entities and breaks equal matches deterministically", () => {
    const disabled = { ...entry("switch.synthetic_disabled", "climate"), disabled_by: "user" };
    const a = entry("switch.synthetic_a", "climate");
    const b = entry("switch.synthetic_b", "climate");
    expect(resolveEntities([disabled]).climate).toBeUndefined();
    expect(resolveEntities([b, a]).climate).toBe(a.entity_id);
    expect(resolveEntities([a, b]).climate).toBe(a.entity_id);
  });
});
