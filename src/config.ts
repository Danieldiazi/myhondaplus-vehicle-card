import { DEFAULT_CONFIG } from "./constants";
import { ENTITY_RULES } from "./entity-resolver";
import { localize } from "./localize";
import type { MyHondaPlusCardConfig } from "./types";

const lists = {
  controls: ["lock", "climate", "horn_lights", "refresh_cached", "refresh", "location"],
  metrics: ["range", "battery", "odometer", "trip_distance", "trip_consumption", "trip_duration"],
  statuses: ["doors", "windows", "trunk", "hood", "lights", "charging", "climate", "location"],
};
const enums: Record<string, string[]> = {
  layout: ["full", "compact"],
  image_mode: ["rendered", "custom"],
  vehicle_alignment: ["left", "center", "right"],
  vehicle_model: ["auto", "civic", "hrv", "crv", "zrv", "jazz", "honda_e", "eny1", "generic"],
  locale: ["auto", "en", "es", "gl"],
};
const booleanFields = [
  "vehicle_shadow",
  "show_controls",
  "show_model",
  "animate",
  "confirm_unlock",
  "confirm_climate",
  "confirm_horn_lights",
  "confirm_refresh",
  "warn_stale_actions",
  "debug",
];
const stringFields = ["type", "device", "name", "vehicle_color", "color_preset", "vehicle_image"];

/** Validate YAML at the component boundary; TypeScript types do not validate user input. */
export function normalizeConfig(
  config: MyHondaPlusCardConfig,
  language?: string,
): MyHondaPlusCardConfig {
  const locale =
    config?.locale === "en" || config?.locale === "es" || config?.locale === "gl"
      ? config.locale
      : language;
  const invalid = (field: string): never => {
    throw new Error(localize("invalid_config", locale, { field }));
  };
  if (!config || typeof config !== "object" || Array.isArray(config)) invalid("config");
  const clean = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  );
  for (const field of stringFields) {
    if (field in clean && typeof clean[field] !== "string") invalid(field);
  }
  for (const field of booleanFields) {
    if (field in clean && typeof clean[field] !== "boolean") invalid(field);
  }
  for (const [field, options] of Object.entries(enums)) {
    if (field in clean && !options.includes(String(clean[field]))) invalid(field);
  }
  for (const field of ["vehicle_scale", "shadow_intensity", "stale_after"]) {
    if (
      field in clean &&
      (typeof clean[field] !== "number" ||
        !Number.isFinite(clean[field]) ||
        (field === "stale_after" && clean[field] < 0))
    )
      invalid(field);
  }
  for (const [field, options] of Object.entries(lists)) {
    const value = clean[field];
    if (
      value !== undefined &&
      (!Array.isArray(value) ||
        value.some((item: unknown) => typeof item !== "string" || !options.includes(item)) ||
        new Set(value).size !== value.length)
    )
      invalid(field);
  }
  if (clean.entities !== undefined) {
    if (!clean.entities || typeof clean.entities !== "object" || Array.isArray(clean.entities))
      invalid("entities");
    for (const [key, value] of Object.entries(clean.entities as Record<string, unknown>)) {
      if (!Object.hasOwn(ENTITY_RULES, key)) invalid("entities");
      const rule = ENTITY_RULES[key as keyof typeof ENTITY_RULES];
      if (
        !rule ||
        typeof value !== "string" ||
        (value !== "" &&
          (!/^[a-z_]+\.[a-z0-9_]+$/.test(value) ||
            !rule.domains.includes(value.split(".")[0] ?? "")))
      )
        invalid("entities");
    }
  }
  return { ...DEFAULT_CONFIG, ...clean } as MyHondaPlusCardConfig;
}
