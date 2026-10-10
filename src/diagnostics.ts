import { isEntityAvailable } from "./vehicle-state";
import { VERSION } from "./constants";
import type { CardDiagnostics, EntityMap, HomeAssistant, VehicleModelKey } from "./types";

const ENTITY_KEYS = [
  "lock",
  "range",
  "battery",
  "odometer",
  "updated",
  "climate",
  "charging",
  "refresh",
  "refresh_cached",
  "horn_lights",
  "location",
  "doors",
  "windows",
  "trunk",
  "hood",
  "lights",
  "trip_distance",
  "trip_consumption",
  "trip_duration",
] as const satisfies readonly (keyof EntityMap)[];

/**
 * Produces a support payload without entity states, coordinates, VINs or device identifiers.
 * Entity ids are intentionally reduced to their domains so users can share diagnostics safely.
 */
export function createDiagnostics(
  hass: HomeAssistant | undefined,
  entities: Partial<EntityMap>,
  model: VehicleModelKey,
  locale: string,
): CardDiagnostics {
  return {
    cardVersion: VERSION,
    homeAssistantVersion: hass?.config?.version,
    model,
    locale,
    entities: ENTITY_KEYS.map((key) => {
      const entityId = entities[key];
      const domain = entityId?.split(".")[0];
      return {
        key,
        entityId: domain ? `${domain}.[redacted]` : undefined,
        configured: Boolean(entityId),
        present: Boolean(entityId && hass?.states[entityId]),
        available: isEntityAvailable(entityId ? hass?.states[entityId] : undefined),
      };
    }),
  };
}

export function diagnosticsText(diagnostics: CardDiagnostics): string {
  return JSON.stringify(diagnostics, null, 2);
}
