import type { EntityMap, EntityRegistryEntry } from "./types";

interface Rule {
  domains: string[];
  hints: string[];
  excludes?: string[];
}

export const ENTITY_RULES: Record<keyof EntityMap, Rule> = {
  lock: { domains: ["lock"], hints: ["doors", "door_lock", "lock"] },
  range: { domains: ["sensor"], hints: ["total_range", "range_climate_off", "range"] },
  battery: { domains: ["sensor"], hints: ["battery_level", "ev_battery"] },
  odometer: { domains: ["sensor"], hints: ["odometer", "mileage"] },
  updated: { domains: ["sensor"], hints: ["last_updated", "timestamp", "updated"] },
  climate: {
    domains: ["switch"],
    hints: ["climate", "preconditioning"],
    excludes: ["defrost", "climate_temp", "climate_duration", "climate_schedule"],
  },
  charging: {
    domains: ["binary_sensor", "sensor", "switch"],
    hints: ["charging", "charge_status"],
    excludes: ["plug_status", "plugged_in"],
  },
  refresh: { domains: ["button"], hints: ["refresh_data", "refresh_from_car"] },
  refresh_cached: {
    domains: ["button"],
    hints: ["refresh_cached", "refresh"],
    excludes: ["refresh_data", "refresh_from_car"],
  },
  horn_lights: { domains: ["button"], hints: ["horn_lights", "horn_and_lights"] },
  location: { domains: ["device_tracker"], hints: ["location", "car_finder"] },
  doors: { domains: ["binary_sensor"], hints: ["doors", "door"] },
  windows: { domains: ["binary_sensor"], hints: ["windows", "window"] },
  trunk: { domains: ["binary_sensor"], hints: ["trunk", "tailgate", "boot"] },
  hood: { domains: ["binary_sensor"], hints: ["hood", "bonnet"] },
  lights: { domains: ["binary_sensor"], hints: ["lights", "headlights"] },
  trip_distance: {
    domains: ["sensor"],
    hints: ["distance_this_month", "trip_distance", "total_distance"],
  },
  trip_consumption: {
    domains: ["sensor"],
    hints: ["avg_consumption_this_month", "average_consumption", "avg_consumption"],
  },
  trip_duration: {
    domains: ["sensor"],
    hints: ["driving_time_this_month", "trip_duration", "driving_time"],
  },
};

const stableText = (entry: EntityRegistryEntry): string =>
  [entry.unique_id, entry.translation_key].filter(Boolean).join(" ").toLowerCase();

const fallbackText = (entry: EntityRegistryEntry): string =>
  [entry.entity_id, entry.original_name].filter(Boolean).join(" ").toLowerCase();

function scoreEntry(entry: EntityRegistryEntry, rule: Rule): number {
  const stable = stableText(entry);
  const fallback = fallbackText(entry);
  if ((rule.excludes ?? []).some((hint) => stable.includes(hint))) return 0;
  const scores = rule.hints.map((hint, index) => {
    if (entry.translation_key?.toLowerCase() === hint) return 10000 - index;
    const uniqueId = entry.unique_id?.toLowerCase();
    if (uniqueId === hint || uniqueId?.endsWith(`_${hint}`)) return 5000 - index;
    if ((rule.excludes ?? []).some((excluded) => fallback.includes(excluded))) return 0;
    // A known, different translation key must not become a generic match after renaming.
    if (entry.translation_key) return 0;
    return fallback.includes(hint) ? 100 - index : 0;
  });
  return Math.max(0, ...scores);
}

export function resolveEntities(
  entries: EntityRegistryEntry[],
  overrides: Partial<EntityMap> = {},
): Partial<EntityMap> {
  const result: Partial<EntityMap> = { ...overrides };

  for (const [key, rule] of Object.entries(ENTITY_RULES) as [keyof EntityMap, Rule][]) {
    if (result[key]) continue;

    const best = entries
      .filter((entry) => entry.platform === "myhondaplus")
      .filter((entry) => !entry.disabled_by)
      .filter((entry) => rule.domains.includes(entry.entity_id.split(".")[0] ?? ""))
      .map((entry) => ({ entry, score: scoreEntry(entry, rule) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.entry.entity_id.localeCompare(b.entry.entity_id))[0];

    if (best) result[key] = best.entry.entity_id;
  }

  return result;
}
