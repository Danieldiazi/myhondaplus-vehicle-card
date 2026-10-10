import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CARD_TAG, DEFAULT_CONFIG, PAINT_PRESETS } from "./constants";
import { normalizeConfig } from "./config";
import { createDiagnostics, diagnosticsText } from "./diagnostics";
import { discoverIntegration } from "./integration-discovery";
import { localize, normalizeLocale, type TranslationKey } from "./localize";
import { resolveVehicleModel, vehicleModelLabel } from "./model-resolver";
import type {
  DeviceRegistryEntry,
  ControlKey,
  EntityMap,
  EntityRegistryEntry,
  HassEntity,
  HomeAssistant,
  MetricKey,
  MyHondaPlusCardConfig,
  StatusKey,
  VehicleModelKey,
  VehicleState,
} from "./types";
import { renderVehicleArt } from "./vehicle-art";
import { buildVehicleState, isEntityAvailable } from "./vehicle-state";

@customElement(CARD_TAG)
export class MyHondaPlusVehicleCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config: MyHondaPlusCardConfig = { ...DEFAULT_CONFIG };
  @state() private entities: Partial<EntityMap> = {};
  @state() private device?: DeviceRegistryEntry;
  @state() private busy?: keyof EntityMap;
  @state() private message?: { kind: "error" | "success"; text: string };
  @state() private customImageFailed = false;
  @state() private discoveryComplete = false;
  @state() private integrationDetected = false;
  @state() private vehicleCount = 0;
  @state() private compatibleEntityCount = 0;
  @state() private discoveryFailed = false;
  private discoveryTask?: Promise<void>;
  private discoveryGeneration = 0;
  private watchedConnection?: HomeAssistant["connection"];
  private subscriptionGeneration = 0;
  private unsubscribers: Array<() => void> = [];
  private ageTimer?: ReturnType<typeof setInterval>;
  private loadedDevice?: string;
  private configuredStatuses?: StatusKey[];

  public static async getConfigElement(): Promise<HTMLElement> {
    await import("./editor");
    return document.createElement("myhondaplus-vehicle-card-editor");
  }

  public static getStubConfig(): MyHondaPlusCardConfig {
    const config: MyHondaPlusCardConfig = { ...DEFAULT_CONFIG };
    delete config.statuses;
    return config;
  }

  public setConfig(config: MyHondaPlusCardConfig): void {
    if (!config) throw new Error(localize("required_config", "es"));
    const nextConfig = normalizeConfig(config, this.hass?.language);
    this.configuredStatuses = config.statuses ? [...config.statuses] : undefined;
    if (
      this.config.vehicle_image !== nextConfig.vehicle_image ||
      this.config.image_mode !== nextConfig.image_mode
    ) {
      this.customImageFailed = false;
    }
    this.config = nextConfig;
    this.entities = { ...(config.entities ?? {}) };
    this.invalidateDiscovery();
  }

  public getCardSize(): number {
    return this.config.layout === "compact" ? 3 : 6;
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this.ageTimer = setInterval(() => this.requestUpdate(), 60000);
    this.watchRegistry();
    void this.loadDeviceData();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.ageTimer);
    this.ageTimer = undefined;
    this.stopWatchingRegistry();
    this.invalidateDiscovery();
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("hass") || changed.has("config")) {
      this.watchRegistry();
      void this.loadDeviceData();
    }
  }

  private invalidateDiscovery(): void {
    this.discoveryGeneration++;
    this.loadedDevice = undefined;
    this.discoveryComplete = false;
    this.discoveryFailed = false;
  }

  private retryDiscovery(): void {
    this.invalidateDiscovery();
    void this.loadDeviceData();
  }

  private stopWatchingRegistry(): void {
    this.subscriptionGeneration++;
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    this.watchedConnection = undefined;
  }

  private watchRegistry(): void {
    const connection = this.hass?.connection;
    if (!this.isConnected || this.watchedConnection === connection) return;
    this.stopWatchingRegistry();
    this.invalidateDiscovery();
    this.watchedConnection = connection;
    if (!connection) return;
    const generation = this.subscriptionGeneration;
    for (const eventType of ["entity_registry_updated", "device_registry_updated"]) {
      void connection
        .subscribeEvents(() => {
          if (generation === this.subscriptionGeneration) this.retryDiscovery();
        }, eventType)
        .then((unsubscribe) => {
          if (!this.isConnected || generation !== this.subscriptionGeneration) unsubscribe();
          else this.unsubscribers.push(unsubscribe);
        })
        .catch(() => {
          // Manual rediscovery remains available if HA refuses event subscriptions.
        });
    }
  }

  private locale(): string {
    return this.config.locale && this.config.locale !== "auto"
      ? this.config.locale
      : normalizeLocale(this.hass?.language);
  }

  private t(key: TranslationKey, replacements: Record<string, string | number> = {}): string {
    return localize(key, this.locale(), replacements);
  }

  private async loadDeviceData(): Promise<void> {
    const hass = this.hass;
    const config = this.config;
    const requestedDevice = config.device ?? "";
    if (
      !this.isConnected ||
      !hass ||
      this.discoveryTask ||
      ((this.discoveryComplete || this.discoveryFailed) && this.loadedDevice === requestedDevice)
    )
      return;
    const generation = this.discoveryGeneration;
    this.loadedDevice = requestedDevice;
    this.discoveryTask = (async () => {
      try {
        const [registry, devices] = await Promise.all([
          hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
          hass.callWS<DeviceRegistryEntry[]>({ type: "config/device_registry/list" }),
        ]);
        if (!this.isConnected || generation !== this.discoveryGeneration) return;
        const discovery = discoverIntegration(
          devices,
          registry,
          hass.config?.components,
          config.device,
          config.entities,
        );
        this.integrationDetected = discovery.integrationDetected;
        this.vehicleCount = discovery.vehicles.length;
        this.device = discovery.selectedDevice;
        this.entities = discovery.entities;
        this.compatibleEntityCount = discovery.compatibleEntityCount;
        this.discoveryComplete = true;
        this.discoveryFailed = false;
      } catch {
        if (!this.isConnected || generation !== this.discoveryGeneration) return;
        this.discoveryFailed = true;
      }
    })();
    await this.discoveryTask;
    this.discoveryTask = undefined;
    if (this.isConnected && generation !== this.discoveryGeneration) void this.loadDeviceData();
  }

  private setupIssue(): TranslationKey | undefined {
    if (this.discoveryFailed) return "discovery_failed";
    if (!this.discoveryComplete) return "card_checking_integration";
    if (!this.integrationDetected) return "card_integration_not_detected";
    if (!this.config.device && this.vehicleCount === 0) return "card_no_vehicles_configured";
    if (!this.config.device) return "select_vehicle";
    if (!this.device) return "card_vehicle_not_found";
    if (this.compatibleEntityCount === 0) return "card_no_compatible_entities";
    return undefined;
  }

  private setupPanel(issue: TranslationKey): TemplateResult {
    const integrationMissing = issue === "card_integration_not_detected";
    return html`<div class="setup" role="status">
      <ha-icon
        icon=${integrationMissing ? "mdi:puzzle-alert" : "mdi:car-info"}
        aria-hidden="true"
      ></ha-icon>
      <strong>${this.t(issue)}</strong>
      ${
        integrationMissing
          ? html`<span>${this.t("editor_install_or_configure_integration")}</span>
              <a
                href="https://github.com/enricobattocchi/myhondaplus-homeassistant"
                target="_blank"
                rel="noopener noreferrer"
                >${this.t("editor_integration_instructions")}</a
              >`
          : nothing
      }
      ${
        issue !== "card_checking_integration"
          ? html`<button type="button" @click=${() => this.retryDiscovery()}>
              ${this.t("editor_redetect_entities")}
            </button>`
          : nothing
      }
    </div>`;
  }

  private entity(key: keyof EntityMap): HassEntity | undefined {
    const entityId = this.entities[key];
    return entityId ? this.hass?.states[entityId] : undefined;
  }

  private entityRecord(): Partial<Record<keyof EntityMap, HassEntity | undefined>> {
    return Object.fromEntries(
      (Object.keys(this.entities) as (keyof EntityMap)[]).map((key) => [key, this.entity(key)]),
    ) as Partial<Record<keyof EntityMap, HassEntity | undefined>>;
  }

  private vehicleState(): VehicleState {
    return buildVehicleState(
      this.entityRecord(),
      this.config.stale_after ?? DEFAULT_CONFIG.stale_after,
    );
  }

  private model(): VehicleModelKey {
    return this.config.vehicle_model && this.config.vehicle_model !== "auto"
      ? this.config.vehicle_model
      : resolveVehicleModel(this.device);
  }

  private paintColor(): string {
    const preset = this.config.color_preset ?? DEFAULT_CONFIG.color_preset;
    if (preset !== "custom" && PAINT_PRESETS[preset]) return PAINT_PRESETS[preset].value;
    const custom = this.config.vehicle_color ?? DEFAULT_CONFIG.vehicle_color;
    return /^#[0-9a-f]{6}$/i.test(custom) ? custom : DEFAULT_CONFIG.vehicle_color;
  }

  private ageText(state: VehicleState): string {
    if (state.ageSeconds === undefined) return this.t("no_update_date");
    if (state.ageSeconds < 60) return this.t("updated_now");
    if (state.ageSeconds < 3600)
      return this.t("updated_minutes", { count: Math.floor(state.ageSeconds / 60) });
    return this.t("updated_hours", { count: Math.floor(state.ageSeconds / 3600) });
  }

  private showMoreInfo(key: keyof EntityMap): void {
    const entityId = this.entities[key];
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      }),
    );
  }

  private async execute(key: keyof EntityMap): Promise<void> {
    const entityId = this.entities[key];
    if (!entityId || !this.hass || this.busy) return;

    if (key === "location") {
      this.showMoreInfo(key);
      return;
    }

    const state = this.vehicleState();
    if (!isEntityAvailable(this.entity(key)) || (key === "lock" && state.locked === undefined))
      return;
    const domain = entityId.split(".")[0] ?? "";
    let service =
      domain === "button" ? "press" : this.entity(key)?.state === "on" ? "turn_off" : "turn_on";
    if (domain === "lock") service = state.locked ? "unlock" : "lock";

    const confirmations: string[] = [];
    const remoteAction =
      key === "lock" || key === "climate" || key === "horn_lights" || key === "refresh";
    if (
      remoteAction &&
      (state.stale || state.ageSource !== "vehicle") &&
      this.config.warn_stale_actions !== false
    ) {
      confirmations.push(
        this.t(
          state.ageSource === "vehicle" ? "confirm_stale_action" : "confirm_unknown_age_action",
        ),
      );
    }
    if (domain === "lock" && service === "unlock" && this.config.confirm_unlock !== false) {
      confirmations.push(this.t("confirm_unlock"));
    }
    if (key === "climate" && this.config.confirm_climate === true) {
      confirmations.push(this.t("confirm_climate_action"));
    }
    if (key === "horn_lights" && this.config.confirm_horn_lights === true) {
      confirmations.push(this.t("confirm_horn_lights_action"));
    }
    if ((key === "refresh" || key === "refresh_cached") && this.config.confirm_refresh === true) {
      confirmations.push(
        this.t(key === "refresh" ? "confirm_refresh_action" : "confirm_refresh_cached_action"),
      );
    }
    if (confirmations.length > 0 && !window.confirm(confirmations.join("\n\n"))) return;

    this.busy = key;
    this.message = undefined;
    try {
      await this.hass.callService(domain, service, { entity_id: entityId });
    } catch (error) {
      this.message = { kind: "error", text: this.t("action_failed") };
      console.warn("My Honda+ Vehicle Card: service call failed", { domain, service, error });
    } finally {
      this.busy = undefined;
    }
  }

  private async copyDiagnostics(): Promise<void> {
    const text = diagnosticsText(
      createDiagnostics(this.hass, this.entities, this.model(), this.locale()),
    );
    try {
      await navigator.clipboard.writeText(text);
      this.message = { kind: "success", text: this.t("diagnostics_copied") };
    } catch {
      this.message = { kind: "error", text };
    }
  }

  private metric(key: MetricKey, state: VehicleState): TemplateResult | typeof nothing {
    if (!this.entities[key]) return nothing;
    const metadata = {
      range: { icon: "mdi:map-marker-distance", label: this.t("range"), value: state.range },
      battery: { icon: "mdi:battery", label: this.t("battery"), value: state.battery },
      odometer: { icon: "mdi:counter", label: this.t("odometer"), value: state.odometer },
      trip_distance: {
        icon: "mdi:map-marker-path",
        label: this.t("trip_distance"),
        value: state.tripDistance,
      },
      trip_consumption: {
        icon: "mdi:gas-station",
        label: this.t("trip_consumption"),
        value: state.tripConsumption,
      },
      trip_duration: {
        icon: "mdi:timer-outline",
        label: this.t("trip_duration"),
        value: state.tripDuration,
      },
    }[key];

    return html`<button
      class="metric"
      type="button"
      aria-label=${`${metadata.label}: ${metadata.value}`}
      @click=${() => this.showMoreInfo(key)}
    >
      <ha-icon icon=${metadata.icon} aria-hidden="true"></ha-icon>
      <div><small>${metadata.label}</small><strong>${metadata.value}</strong></div>
      <ha-icon class="detail-indicator" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
    </button>`;
  }

  private freshness(state: VehicleState): TemplateResult {
    const className = `freshness ${state.stale ? "stale" : ""}`;
    const title =
      state.ageSource !== "vehicle"
        ? this.t("no_update_date")
        : state.stale
          ? this.t("stale_data")
          : "";
    const text =
      state.ageSource === "home_assistant"
        ? this.t("ha_update_age", { age: this.ageText(state) })
        : this.ageText(state);
    return this.entities.updated
      ? html`<button
          class=${className}
          type="button"
          title=${title}
          @click=${() => this.showMoreInfo("updated")}
        >
          <span>${text}</span>
          <ha-icon class="detail-indicator" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
        </button>`
      : html`<div class=${className} title=${title}>${text}</div>`;
  }

  private status(
    key: keyof EntityMap,
    icon: string,
    label: string,
    active: boolean | undefined,
    activeText: string,
    inactiveText: string,
  ): TemplateResult {
    const text = active === undefined ? this.t("unavailable") : active ? activeText : inactiveText;
    return html`<button
      type="button"
      class="status ${active === true ? "warning" : ""} ${active === undefined ? "unavailable" : ""}"
      aria-label=${`${label}: ${text}`}
      @click=${() => this.showMoreInfo(key)}
    >
      <ha-icon class="status-icon" icon=${icon} aria-hidden="true"></ha-icon>
      <div><b>${label}</b><small>${text}</small></div>
      <i aria-hidden="true"></i>
      <ha-icon class="detail-indicator" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
    </button>`;
  }

  private locationStatus(): TemplateResult | typeof nothing {
    const entity = this.entity("location");
    const unavailable = !isEntityAvailable(entity);
    const value = unavailable
      ? this.t("unavailable")
      : entity!.state.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
    return html`<button
      type="button"
      class="status info-status ${unavailable ? "unavailable" : ""}"
      aria-label=${`${this.t("location")}: ${value}`}
      @click=${() => this.showMoreInfo("location")}
    >
      <ha-icon class="status-icon" icon="mdi:map-marker" aria-hidden="true"></ha-icon>
      <div><b>${this.t("location")}</b><small>${value}</small></div>
      <ha-icon class="detail-indicator" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
    </button>`;
  }

  private renderStatus(key: StatusKey, state: VehicleState): TemplateResult | typeof nothing {
    if (!this.entities[key]) return nothing;
    if (key === "location") return this.locationStatus();

    const metadata = {
      doors: {
        icon: "mdi:car-door",
        label: this.t("doors"),
        active: state.doorsOpen,
        activeText: this.t("open"),
        inactiveText: this.t("closed"),
      },
      windows: {
        icon: "mdi:window-closed-variant",
        label: this.t("windows"),
        active: state.windowsOpen,
        activeText: this.t("open"),
        inactiveText: this.t("closed"),
      },
      trunk: {
        icon: "mdi:car-back",
        label: this.t("trunk"),
        active: state.trunkOpen,
        activeText: this.t("open"),
        inactiveText: this.t("closed"),
      },
      hood: {
        icon: "mdi:car",
        label: this.t("hood"),
        active: state.hoodOpen,
        activeText: this.t("open"),
        inactiveText: this.t("closed"),
      },
      lights: {
        icon: "mdi:car-light-high",
        label: this.t("lights"),
        active: state.lightsOn,
        activeText: this.t("on"),
        inactiveText: this.t("off"),
      },
      charging: {
        icon: "mdi:battery-charging",
        label: this.t("charging"),
        active: state.charging,
        activeText: this.t("active"),
        inactiveText: this.t("inactive"),
      },
      climate: {
        icon: "mdi:snowflake",
        label: this.t("climate"),
        active: state.climateActive,
        activeText: this.t("active"),
        inactiveText: this.t("inactive"),
      },
    }[key];

    return this.status(
      key,
      metadata.icon,
      metadata.label,
      metadata.active,
      metadata.activeText,
      metadata.inactiveText,
    );
  }

  private control(icon: string, label: string, key: ControlKey): TemplateResult | typeof nothing {
    if (key === "location") return nothing;
    if (!this.entities[key]) return nothing;
    const loading = this.busy === key;
    const entity = this.entity(key);
    const unavailable =
      !isEntityAvailable(entity) || (key === "lock" && this.vehicleState().locked === undefined);
    return html`<button
      type="button"
      aria-label=${label}
      aria-busy=${loading ? "true" : "false"}
      ?disabled=${Boolean(this.busy) || unavailable}
      @click=${() => void this.execute(key)}
    >
      <span aria-hidden="true"> ${loading ? "…" : html`<ha-icon icon=${icon}></ha-icon>`} </span>
      <small>${label}</small>
    </button>`;
  }

  private vehicleVisual(): TemplateResult {
    if (
      this.config.image_mode === "custom" &&
      this.config.vehicle_image &&
      !this.customImageFailed
    ) {
      return html`<img
        class="vehicle-art custom-vehicle-art"
        src=${this.config.vehicle_image}
        alt=${this.t("vehicle")}
        loading="lazy"
        @error=${() => {
          this.customImageFailed = true;
        }}
      />`;
    }
    return renderVehicleArt(this.customImageFailed ? "generic" : this.model());
  }

  private visualStyle(): string {
    const scale = Math.min(140, Math.max(70, this.config.vehicle_scale ?? 100));
    const intensity =
      this.config.vehicle_shadow === false
        ? 0
        : Math.min(100, Math.max(0, this.config.shadow_intensity ?? 60));
    const alpha = Math.round((intensity / 100) * 255)
      .toString(16)
      .padStart(2, "0");
    return `--vehicle-scale:${scale / 100};--vehicle-shadow-opacity:${intensity / 100};--vehicle-shadow-color:${this.paintColor()}${alpha}`;
  }

  protected override render(): TemplateResult {
    const state = this.vehicleState();
    const setupIssue = this.setupIssue();
    const lockedText =
      state.locked === true
        ? this.t("locked")
        : state.locked === false
          ? this.t("unlocked")
          : this.t("unknown_state");
    const controls = this.config.controls ?? [...DEFAULT_CONFIG.controls];
    const metrics = this.config.metrics ?? [...DEFAULT_CONFIG.metrics];
    const statuses =
      this.configuredStatuses ??
      (this.config.layout === "compact"
        ? (["climate", "location"] satisfies StatusKey[])
        : [...DEFAULT_CONFIG.statuses]);
    const visibleStatuses = statuses.filter((key) => Boolean(this.entities[key]));
    const alignment = this.config.vehicle_alignment ?? DEFAULT_CONFIG.vehicle_alignment;

    return html`<ha-card class=${this.config.animate === false ? "reduce-motion" : ""}>
      <header>
        <div>
          <h2>${this.config.name}</h2>
          ${this.config.show_model !== false ? html`<p>${vehicleModelLabel(this.model())}</p>` : nothing}
        </div>
        ${
          this.entities.lock
            ? html`<button
                type="button"
                class="badge ${state.locked === false ? "alert" : ""}"
                aria-label=${lockedText}
                @click=${() => this.showMoreInfo("lock")}
              >
                <ha-icon
                  icon=${
                    state.locked === true
                      ? "mdi:lock"
                      : state.locked === false
                        ? "mdi:lock-open-variant"
                        : "mdi:lock-question"
                  }
                  aria-hidden="true"
                ></ha-icon>
                ${lockedText}
                <ha-icon
                  class="detail-indicator"
                  icon="mdi:chevron-right"
                  aria-hidden="true"
                ></ha-icon>
              </button>`
            : nothing
        }
      </header>

      <div class="announcer" aria-live="polite">
        ${this.busy ? this.t("action_in_progress") : (this.message?.text ?? "")}
      </div>
      ${this.message ? html`<div class="message ${this.message.kind}">${this.message.text}</div>` : nothing}
      ${
        this.customImageFailed
          ? html`<div class="message error" role="alert">${this.t("custom_image_failed")}</div>`
          : nothing
      }
      ${
        setupIssue
          ? this.setupPanel(setupIssue)
          : html`<section
              class="vehicle align-${alignment} ${state.charging === true ? "is-charging" : ""}"
              style=${this.visualStyle()}
            >
              ${this.vehicleVisual()} ${this.freshness(state)}
            </section>`
      }
      ${
        setupIssue
          ? nothing
          : this.config.device
            ? html`<section class="metrics">
                ${metrics.map((key) => this.metric(key, state))}
              </section>`
            : html`<div class="setup">${this.t("select_vehicle")}</div>`
      }
      ${
        !setupIssue && visibleStatuses.length > 0
          ? html`<section
              class="statuses ${this.config.layout === "compact" ? "compact-statuses" : ""}"
            >
              ${visibleStatuses.map((key) => this.renderStatus(key, state))}
            </section>`
          : nothing
      }
      ${
        !setupIssue && this.config.show_controls !== false
          ? html`<nav class="controls" aria-label=${this.t("vehicle_controls")}>
              ${controls.map((key) => {
                const metadata = {
                  lock: {
                    icon:
                      state.locked === true
                        ? "mdi:lock-open-variant"
                        : state.locked === false
                          ? "mdi:lock"
                          : "mdi:lock-question",
                    label: state.locked ? this.t("unlock") : this.t("lock"),
                  },
                  climate: { icon: "mdi:snowflake", label: this.t("climate") },
                  horn_lights: { icon: "mdi:bullhorn", label: this.t("horn_lights") },
                  refresh_cached: {
                    icon: "mdi:database-refresh",
                    label: this.t("refresh_cached"),
                  },
                  refresh: { icon: "mdi:car-connected", label: this.t("refresh_from_car") },
                  location: { icon: "mdi:map-marker", label: this.t("location") },
                }[key];
                return this.control(metadata.icon, metadata.label, key);
              })}
            </nav>`
          : nothing
      }
      ${
        this.config.debug
          ? html`<details class="diagnostics">
              <summary>${this.t("diagnostics")}</summary>
              <button type="button" @click=${() => void this.copyDiagnostics()}>
                ${this.t("copy_diagnostics")}
              </button>
              <button type="button" @click=${() => this.retryDiscovery()}>
                ${this.t("editor_redetect_entities")}
              </button>
              <pre>
${diagnosticsText(createDiagnostics(this.hass, this.entities, this.model(), this.locale()))}</pre>
            </details>`
          : nothing
      }
    </ha-card>`;
  }

  public static override styles = css`
    :host {
      display: block;
      font-family: var(--ha-font-family-body, inherit);
      font-size: var(--ha-font-size-m, 0.875rem);
      line-height: 1.4;
    }
    ha-card {
      padding: 20px;
      overflow: hidden;
      color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    h2 {
      margin: 0;
      font-size: var(--ha-font-size-xl, 1.25rem);
    }
    p {
      margin: 4px 0 0;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-m, 0.875rem);
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 7px 11px;
      border-radius: 999px;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      color: var(--primary-text-color);
      font: inherit;
      font-size: var(--ha-font-size-m, 0.875rem);
      cursor: pointer;
    }
    .badge ha-icon,
    .status-icon {
      flex: 0 0 auto;
      color: var(--secondary-text-color);
      --mdc-icon-size: 18px;
    }
    .alert,
    .message.error {
      color: var(--error-color);
    }
    .announcer {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .message {
      margin-top: 10px;
      padding: 9px 11px;
      border-radius: 10px;
      background: var(--secondary-background-color);
      font-size: var(--ha-font-size-m, 0.875rem);
    }
    .vehicle {
      position: relative;
      min-height: 235px;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      justify-items: center;
    }
    .vehicle svg,
    .vehicle img {
      width: 100%;
      height: 100%;
      max-height: 250px;
      object-fit: contain;
      transform: scale(var(--vehicle-scale, 1));
      filter: drop-shadow(0 16px 18px rgb(0 0 0 / calc(var(--vehicle-shadow-opacity, 0.6) * 0.2)));
      transform-origin: center;
    }
    .vehicle.align-left {
      justify-items: start;
    }
    .vehicle.align-left svg,
    .vehicle.align-left img {
      transform-origin: left center;
    }
    .vehicle.align-right {
      justify-items: end;
    }
    .vehicle.align-right svg,
    .vehicle.align-right img {
      transform-origin: right center;
    }
    .vehicle img.civic-lateral-art,
    .vehicle img.custom-vehicle-art {
      filter: drop-shadow(0 8px 6px var(--vehicle-shadow-color));
    }
    .vehicle img.honda-logo-art {
      width: clamp(120px, 34%, 150px);
      max-height: 150px;
      filter: drop-shadow(0 10px 12px var(--vehicle-shadow-color))
        drop-shadow(0 0 14px var(--vehicle-shadow-color));
    }
    .freshness {
      justify-self: center;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 0;
      border: 0;
      background: transparent;
      font-family: inherit;
      font-size: var(--ha-font-size-s, 0.75rem);
      color: var(--secondary-text-color);
      white-space: normal;
      text-align: center;
      max-width: 100%;
    }
    button.freshness {
      cursor: pointer;
    }
    button.freshness:hover {
      text-decoration: underline;
    }
    .freshness.stale {
      color: var(--warning-color, #f9a825);
      font-weight: 600;
    }
    .metrics,
    .controls {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9px;
    }
    .metric {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 9px;
      padding: 11px;
      border-radius: 14px;
      background: var(--secondary-background-color, var(--card-background-color));
      border: 1px solid var(--divider-color);
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        background-color 0.18s ease,
        border-color 0.18s ease;
    }
    .metric:hover {
      border-color: var(--primary-color);
    }
    .metric:focus-visible {
      outline: 3px solid var(--primary-color);
      outline-offset: 2px;
    }
    .metric ha-icon {
      flex: 0 0 auto;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
    }
    .metric small,
    .metric strong,
    .status small,
    .status b {
      display: block;
    }
    .metric small,
    .status small {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 0.75rem);
    }
    .metric strong {
      font-size: var(--ha-font-size-l, 1rem);
    }
    .metric .detail-indicator {
      margin-inline-start: auto;
    }
    .statuses {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 13px;
    }
    .compact-statuses {
      grid-template-columns: 1fr;
    }
    .status {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 9px;
      padding: 9px 10px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      font-size: var(--ha-font-size-m, 0.875rem);
      text-align: left;
      cursor: pointer;
    }
    .badge:hover,
    .status:hover {
      border-color: var(--primary-color);
    }
    .badge:focus-visible,
    .status:focus-visible,
    .freshness:focus-visible {
      outline: 3px solid var(--primary-color);
      outline-offset: 2px;
    }
    .info-status {
      grid-template-columns: auto 1fr auto;
    }
    .status i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--success-color, #43a047);
    }
    .status.warning i {
      background: var(--error-color);
    }
    .status.unavailable i {
      background: var(--disabled-text-color, var(--secondary-text-color));
    }
    .detail-indicator {
      flex: 0 0 auto;
      color: var(--secondary-text-color);
      --mdc-icon-size: 18px;
      opacity: 0.72;
      transition:
        transform 0.18s ease,
        opacity 0.18s ease;
    }
    .badge:hover .detail-indicator,
    .metric:hover .detail-indicator,
    .status:hover .detail-indicator,
    .freshness:hover .detail-indicator {
      transform: translateX(2px);
      opacity: 1;
    }
    .controls {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-top: 15px;
    }
    .controls button,
    .diagnostics button,
    .setup button {
      display: grid;
      place-items: center;
      gap: 4px;
      border: 1px solid var(--primary-color);
      border-color: color-mix(in srgb, var(--primary-color) 35%, var(--divider-color));
      border-radius: 14px;
      padding: 10px 5px;
      background: var(--secondary-background-color);
      background: color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color));
      color: var(--primary-text-color);
      font: inherit;
      font-size: var(--ha-font-size-m, 0.875rem);
      cursor: pointer;
      transition:
        transform 0.18s ease,
        background-color 0.18s ease,
        border-color 0.18s ease;
    }
    .controls button:hover:not(:disabled),
    .diagnostics button:hover:not(:disabled),
    .setup button:hover:not(:disabled) {
      transform: translateY(-2px);
      background: color-mix(in srgb, var(--primary-color) 20%, var(--card-background-color));
      border-color: var(--primary-color);
    }
    .controls button:focus-visible,
    .diagnostics button:focus-visible,
    .setup button:focus-visible {
      outline: 3px solid var(--primary-color);
      outline-offset: 2px;
    }
    .controls button:disabled,
    .diagnostics button:disabled {
      cursor: progress;
      opacity: 0.65;
    }
    .controls button ha-icon,
    .diagnostics button ha-icon {
      color: var(--primary-color);
      --mdc-icon-size: 21px;
    }
    .setup {
      display: grid;
      justify-items: center;
      gap: 8px;
      margin-top: 18px;
      padding: 18px;
      border: 1px dashed var(--divider-color);
      border-radius: 12px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .setup ha-icon {
      --mdc-icon-size: 32px;
    }
    .setup a {
      color: var(--primary-color);
    }
    .diagnostics {
      margin-top: 14px;
      font-size: var(--ha-font-size-s, 0.75rem);
    }
    .diagnostics pre {
      overflow: auto;
      max-height: 260px;
      padding: 10px;
      background: var(--secondary-background-color);
      border-radius: 10px;
      white-space: pre-wrap;
    }
    .reduce-motion *,
    .reduce-motion *::before,
    .reduce-motion *::after {
      animation: none !important;
      transition: none !important;
    }
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    @media (max-width: 520px) {
      ha-card {
        padding: 16px;
      }
      .vehicle {
        min-height: 190px;
      }
      .metrics,
      .statuses {
        grid-template-columns: 1fr;
      }
      .controls {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;
}
