import "../../src/index";
import "../../src/editor";
import type {
  DeviceRegistryEntry,
  EntityRegistryEntry,
  HassEntity,
  HomeAssistant,
  MyHondaPlusCardConfig,
  StatusKey,
  VehicleModelKey,
} from "../../src/types";

declare global {
  interface Window {
    __visualReady?: boolean;
    __visualTest: {
      hass: HomeAssistant;
      config: MyHondaPlusCardConfig;
      component: TestCard | TestEditor;
      registry: EntityRegistryEntry[];
      devices: DeviceRegistryEntry[];
      events: Record<string, () => void>;
      state: { wsCalls: number; failDiscovery: boolean; unsubscriptions: number };
    };
  }
}

const params = new URLSearchParams(window.location.search);
const model = (params.get("model") ?? "civic") as VehicleModelKey;
const layout = params.get("layout") === "compact" ? "compact" : "full";
const locale = params.get("locale") ?? "en";
const customImageFailure = params.get("customImageFailure") === "true";
const target = params.get("target") === "editor" ? "editor" : "card";
const discoveryScenario = params.get("discovery") ?? "ready";
const discoveryDelay = params.get("discoveryDelay") === "true";
const stale = params.get("stale") === "true";
const confirmations = params.get("confirmations") === "true";
const configuredStatuses = params.has("statuses")
  ? (params.get("statuses")?.split(",").filter(Boolean) as StatusKey[])
  : undefined;
document.documentElement.dataset.theme = params.get("theme") === "dark" ? "dark" : "light";

const device: DeviceRegistryEntry = {
  id: "synthetic-vehicle",
  name: "Synthetic Honda",
  model: model === "civic" ? "Honda Civic" : "Honda HR-V",
  manufacturer: "Honda",
};

const registryEntry = (entity_id: string, translation_key: string): EntityRegistryEntry => ({
  entity_id,
  device_id: device.id,
  platform: "myhondaplus",
  translation_key,
  disabled_by: null,
});

const completeRegistry: EntityRegistryEntry[] = [
  registryEntry("lock.synthetic_vehicle", "doors"),
  registryEntry("sensor.synthetic_range", "total_range"),
  registryEntry("sensor.synthetic_battery", "battery_level"),
  registryEntry("sensor.synthetic_odometer", "odometer"),
  registryEntry("sensor.synthetic_updated", "last_updated"),
  registryEntry("switch.synthetic_climate", "climate"),
  registryEntry("binary_sensor.synthetic_charging", "charging"),
  registryEntry("binary_sensor.synthetic_doors", "doors_open"),
  registryEntry("binary_sensor.synthetic_windows", "windows_open"),
  registryEntry("binary_sensor.synthetic_trunk", "trunk"),
  registryEntry("binary_sensor.synthetic_hood", "hood"),
  registryEntry("binary_sensor.synthetic_lights", "lights"),
  registryEntry("sensor.synthetic_trip_distance", "distance_this_month"),
  registryEntry("sensor.synthetic_trip_consumption", "avg_consumption_this_month"),
  registryEntry("button.synthetic_refresh", "refresh_data"),
  registryEntry("button.synthetic_refresh_cached", "refresh_cached"),
  registryEntry("button.synthetic_horn_lights", "horn_lights"),
  registryEntry("device_tracker.synthetic_location", "location"),
];
const registry: EntityRegistryEntry[] =
  discoveryScenario === "missingIntegration" || discoveryScenario === "noVehicles"
    ? []
    : discoveryScenario === "noCompatible"
      ? [registryEntry("sensor.synthetic_unknown", "unsupported_value")]
      : completeRegistry;
const devices =
  discoveryScenario === "missingIntegration" || discoveryScenario === "noVehicles" ? [] : [device];
const components = discoveryScenario === "missingIntegration" ? [] : ["myhondaplus"];

const now = new Date().toISOString();
const entityUpdated = stale ? new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() : now;
const entity = (entity_id: string, state: string, unit?: string): HassEntity => ({
  entity_id,
  state,
  attributes: unit ? { unit_of_measurement: unit } : {},
  last_updated: entityUpdated,
});

const states = Object.fromEntries(
  [
    entity("lock.synthetic_vehicle", "locked"),
    entity("sensor.synthetic_range", "420", "km"),
    entity("sensor.synthetic_battery", "72", "%"),
    entity("sensor.synthetic_odometer", "17505", "km"),
    entity("sensor.synthetic_updated", entityUpdated),
    entity("switch.synthetic_climate", "on"),
    entity("binary_sensor.synthetic_charging", "off"),
    entity("binary_sensor.synthetic_doors", "off"),
    entity("binary_sensor.synthetic_windows", "off"),
    entity("binary_sensor.synthetic_trunk", "off"),
    entity("binary_sensor.synthetic_hood", "off"),
    entity("binary_sensor.synthetic_lights", "off"),
    entity("sensor.synthetic_trip_distance", "371", "km"),
    entity("sensor.synthetic_trip_consumption", "5.4", "L/100km"),
    entity("button.synthetic_refresh", "unknown"),
    entity("button.synthetic_refresh_cached", "unknown"),
    entity("button.synthetic_horn_lights", "unknown"),
    entity("device_tracker.synthetic_location", "home"),
  ].map((item) => [item.entity_id, item]),
);

const events: Record<string, () => void> = {};
const testState = {
  wsCalls: 0,
  failDiscovery: params.get("failDiscovery") === "true",
  unsubscriptions: 0,
};
const hass: HomeAssistant = {
  connection: {
    subscribeEvents: async (callback, type) => {
      events[type] = callback;
      return () => {
        delete events[type];
        testState.unsubscriptions++;
      };
    },
  },
  states,
  language: locale,
  config: { version: "2026.8.0", components },
  callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
    testState.wsCalls++;
    if (discoveryDelay) await new Promise((resolve) => window.setTimeout(resolve, 250));
    if (testState.failDiscovery) throw new Error("Synthetic discovery failure");
    if (message.type === "config/entity_registry/list") return registry as T;
    if (message.type === "config/device_registry/list") return devices as T;
    throw new Error(`Unexpected websocket request: ${String(message.type)}`);
  },
  callService: async (domain, service, data) => {
    document.body.dataset.calledEntity = String(data?.entity_id);
    document.body.dataset.calledService = `${domain}.${service}`;
  },
};

type TestCard = HTMLElement & {
  hass: HomeAssistant;
  setConfig(config: MyHondaPlusCardConfig): void;
  updateComplete: Promise<boolean>;
};

type TestEditor = HTMLElement & {
  hass: HomeAssistant;
  setConfig(config: MyHondaPlusCardConfig): void;
  updateComplete: Promise<boolean>;
};

const config: MyHondaPlusCardConfig = {
  type: "custom:myhondaplus-vehicle-card",
  device:
    discoveryScenario === "noVehicles" || discoveryScenario === "missingIntegration"
      ? undefined
      : device.id,
  name: "Synthetic Honda",
  vehicle_model: model,
  layout,
  locale: locale === "es" || locale === "gl" ? locale : "en",
  image_mode: customImageFailure ? "custom" : "rendered",
  vehicle_image: customImageFailure ? "/missing-vehicle-image.png" : undefined,
  debug: true,
  statuses: configuredStatuses,
  stale_after: stale ? 300 : undefined,
  confirm_climate: confirmations,
  confirm_horn_lights: confirmations,
  confirm_refresh: confirmations,
  controls: confirmations ? ["horn_lights", "refresh_cached", "refresh"] : undefined,
};

const component =
  target === "editor"
    ? (document.createElement("myhondaplus-vehicle-card-editor") as TestEditor)
    : (document.createElement("myhondaplus-vehicle-card") as TestCard);
window.__visualTest = { hass, config, component, registry, devices, events, state: testState };
component.setConfig(config);
component.hass = hass;
document.querySelector("#root")?.append(component);

await component.updateComplete;
await new Promise((resolve) => window.setTimeout(resolve, 50));
await component.updateComplete;
window.__visualReady = true;
