import type { EntityMap, HassEntity, VehicleState } from "./types";

const ACTIVE_STATES = new Set(["on", "open", "unlocked", "active", "charging", "plugged", "true"]);
const UNAVAILABLE_STATES = new Set(["unknown", "unavailable", "none"]);

export function isEntityAvailable(entity?: HassEntity): boolean {
  if (!entity) return false;
  const state = entity.state.toLowerCase();
  return (
    !UNAVAILABLE_STATES.has(state) ||
    (state === "unknown" && entity.entity_id.startsWith("button."))
  );
}

export function isEntityActive(entity?: HassEntity): boolean | undefined {
  if (!entity || UNAVAILABLE_STATES.has(entity.state.toLowerCase())) return undefined;
  return ACTIVE_STATES.has(entity.state.toLowerCase());
}

export function entityDisplayValue(entity?: HassEntity): string {
  if (!entity || UNAVAILABLE_STATES.has(entity.state.toLowerCase())) return "—";
  const unit = entity.attributes.unit_of_measurement;
  return `${entity.state}${unit ? ` ${String(unit)}` : ""}`;
}

export function entityAgeSeconds(entity?: HassEntity, now = Date.now()): number | undefined {
  if (!entity || UNAVAILABLE_STATES.has(entity.state.toLowerCase())) return undefined;
  const updated = Date.parse(entity.last_updated);
  return Number.isFinite(updated) && updated <= now
    ? Math.floor((now - updated) / 1000)
    : undefined;
}

/**
 * Converts Home Assistant entities into a presentation-independent vehicle state.
 * Keeping this translation outside the Lit component makes status logic testable and
 * provides a stable boundary for future vehicle providers.
 */
export function buildVehicleState(
  entities: Partial<Record<keyof EntityMap, HassEntity | undefined>>,
  staleAfterSeconds: number,
  now = Date.now(),
): VehicleState {
  // The timestamp sensor's state is the vehicle timestamp. last_updated is an HA write time.
  const timestamp =
    entities.updated &&
    /^\d{4}-\d{2}-\d{2}T/.test(entities.updated.state) &&
    !UNAVAILABLE_STATES.has(entities.updated.state.toLowerCase())
      ? Date.parse(entities.updated.state)
      : NaN;
  const vehicleTimestampValid = Number.isFinite(timestamp) && timestamp <= now;
  const ageSeconds = vehicleTimestampValid
    ? Math.floor((now - timestamp) / 1000)
    : entities.updated
      ? undefined
      : (entityAgeSeconds(entities.range, now) ?? entityAgeSeconds(entities.odometer, now));
  const ageSource = vehicleTimestampValid
    ? "vehicle"
    : ageSeconds !== undefined
      ? "home_assistant"
      : undefined;

  return {
    locked:
      entities.lock?.state === "locked"
        ? true
        : entities.lock?.state === "unlocked"
          ? false
          : undefined,
    range: entityDisplayValue(entities.range),
    battery: entityDisplayValue(entities.battery),
    odometer: entityDisplayValue(entities.odometer),
    tripDistance: entityDisplayValue(entities.trip_distance),
    tripConsumption: entityDisplayValue(entities.trip_consumption),
    tripDuration: entityDisplayValue(entities.trip_duration),
    climateActive: isEntityActive(entities.climate),
    charging: isEntityActive(entities.charging),
    doorsOpen: isEntityActive(entities.doors),
    windowsOpen: isEntityActive(entities.windows),
    trunkOpen: isEntityActive(entities.trunk),
    hoodOpen: isEntityActive(entities.hood),
    lightsOn: isEntityActive(entities.lights),
    ageSeconds,
    ageSource,
    stale: ageSeconds !== undefined && ageSeconds > staleAfterSeconds,
  };
}
