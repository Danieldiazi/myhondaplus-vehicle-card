export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
  connection?: {
    subscribeEvents(callback: () => void, eventType: string): Promise<() => void>;
  };
  language?: string;
  config?: {
    version?: string;
    components?: string[];
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    unit_of_measurement?: string;
  };
  last_updated: string;
}

export interface EntityRegistryEntry {
  entity_id: string;
  device_id: string | null;
  platform?: string;
  unique_id?: string;
  translation_key?: string | null;
  original_name?: string | null;
  disabled_by?: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  name?: string;
  name_by_user?: string | null;
  model?: string | null;
  manufacturer?: string | null;
}

export type CardLayout = "full" | "compact";
export type ImageMode = "rendered" | "custom";
export type VehicleAlignment = "left" | "center" | "right";
export type VehicleModelKey =
  "civic" | "hrv" | "crv" | "zrv" | "jazz" | "honda_e" | "eny1" | "generic";
export type CardLocale = "auto" | "en" | "es" | "gl";

export interface MyHondaPlusCardConfig {
  type: string;
  device?: string;
  name?: string;
  vehicle_color?: string;
  color_preset?: string;
  image_mode?: ImageMode;
  vehicle_image?: string;
  vehicle_model?: VehicleModelKey | "auto";
  vehicle_scale?: number;
  vehicle_alignment?: VehicleAlignment;
  vehicle_shadow?: boolean;
  shadow_intensity?: number;
  layout?: CardLayout;
  stale_after?: number;
  show_controls?: boolean;
  show_model?: boolean;
  animate?: boolean;
  confirm_unlock?: boolean;
  confirm_climate?: boolean;
  confirm_horn_lights?: boolean;
  confirm_refresh?: boolean;
  warn_stale_actions?: boolean;
  locale?: CardLocale;
  debug?: boolean;
  controls?: ControlKey[];
  metrics?: MetricKey[];
  statuses?: StatusKey[];
  entities?: Partial<EntityMap>;
}

export type ControlKey =
  "lock" | "climate" | "horn_lights" | "refresh_cached" | "refresh" | "location";

export type MetricKey =
  "range" | "battery" | "odometer" | "trip_distance" | "trip_consumption" | "trip_duration";

export type StatusKey =
  "doors" | "windows" | "trunk" | "hood" | "lights" | "charging" | "climate" | "location";

export interface EntityMap {
  lock: string;
  range: string;
  battery: string;
  odometer: string;
  updated: string;
  climate: string;
  charging: string;
  refresh: string;
  refresh_cached: string;
  horn_lights: string;
  location: string;
  doors: string;
  windows: string;
  trunk: string;
  hood: string;
  lights: string;
  trip_distance: string;
  trip_consumption: string;
  trip_duration: string;
}

export interface VehicleState {
  locked?: boolean;
  range: string;
  battery: string;
  odometer: string;
  tripDistance: string;
  tripConsumption: string;
  tripDuration: string;
  climateActive?: boolean;
  charging?: boolean;
  doorsOpen?: boolean;
  windowsOpen?: boolean;
  trunkOpen?: boolean;
  hoodOpen?: boolean;
  lightsOn?: boolean;
  ageSeconds?: number;
  ageSource?: "vehicle" | "home_assistant";
  stale: boolean;
}

export interface DiagnosticEntity {
  key: keyof EntityMap;
  entityId?: string;
  configured: boolean;
  present: boolean;
  available: boolean;
}

export interface CardDiagnostics {
  cardVersion: string;
  homeAssistantVersion?: string;
  model: VehicleModelKey;
  locale: string;
  entities: DiagnosticEntity[];
}
