import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_CONFIG, EDITOR_TAG, PAINT_PRESETS } from "./constants";
import { normalizeConfig } from "./config";
import { resolveEntities } from "./entity-resolver";
import { discoverIntegration } from "./integration-discovery";
import { localize, normalizeLocale, type TranslationKey } from "./localize";
import type {
  DeviceRegistryEntry,
  EntityMap,
  EntityRegistryEntry,
  HomeAssistant,
  MyHondaPlusCardConfig,
  StatusKey,
} from "./types";

@customElement(EDITOR_TAG)
export class MyHondaPlusVehicleCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private config: MyHondaPlusCardConfig = { ...DEFAULT_CONFIG };
  @state() private devices: DeviceRegistryEntry[] = [];
  @state() private registryEntries: EntityRegistryEntry[] = [];
  @state() private loading = false;
  @state() private integrationDetected = false;
  @state() private discoveryError = false;
  private automaticDiscoveryStarted = false;
  private statusesExplicit = false;

  public setConfig(config: MyHondaPlusCardConfig): void {
    this.statusesExplicit = config.statuses !== undefined;
    this.config = normalizeConfig(config, this.hass?.language);
  }

  private locale(): string {
    return this.config.locale && this.config.locale !== "auto"
      ? this.config.locale
      : normalizeLocale(this.hass?.language);
  }

  private t(key: TranslationKey, replacements: Record<string, string | number> = {}): string {
    return localize(key, this.locale(), replacements);
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass && !this.automaticDiscoveryStarted) {
      this.automaticDiscoveryStarted = true;
      void this.loadDevices();
    }
  }

  private async loadDevices(manual = false): Promise<void> {
    if (!this.hass || this.loading) return;
    this.loading = true;
    this.discoveryError = false;
    try {
      const [devices, entities] = await Promise.all([
        this.hass.callWS<DeviceRegistryEntry[]>({ type: "config/device_registry/list" }),
        this.hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
      ]);
      const discovery = discoverIntegration(devices, entities, this.hass.config?.components);
      this.integrationDetected = discovery.integrationDetected;
      this.devices = discovery.vehicles.sort((a, b) =>
        this.deviceName(a).localeCompare(this.deviceName(b)),
      );
      this.registryEntries = entities;
      if (manual) this.emitConfig(this.config);
    } catch (error) {
      console.warn("My Honda+ Vehicle Card: device discovery failed", error);
      this.devices = [];
      this.discoveryError = true;
    } finally {
      this.loading = false;
    }
  }

  private deviceName(device: DeviceRegistryEntry): string {
    return device.name_by_user ?? device.name ?? device.model ?? device.id;
  }

  private selectedValues(field: "controls" | "metrics" | "statuses"): string[] {
    if (field === "statuses" && !this.statusesExplicit && this.config.layout === "compact")
      return ["climate", "location"];
    return [...(this.config[field] ?? DEFAULT_CONFIG[field])];
  }

  private emitConfig(next: MyHondaPlusCardConfig): void {
    const config = { ...next };
    if (!this.statusesExplicit) delete config.statuses;
    this.config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateField(event: Event): void {
    const target = event.currentTarget as HTMLInputElement | HTMLSelectElement;
    let value: string | boolean | number = target.value;
    if (target instanceof HTMLInputElement && target.type === "checkbox") value = target.checked;
    if (["stale_after", "vehicle_scale", "shadow_intensity"].includes(target.name))
      value = Number(target.value);

    const config = { ...this.config, [target.name]: value };
    if (target.name === "color_preset" && value !== "custom") {
      config.vehicle_color = PAINT_PRESETS[String(value)]?.value ?? config.vehicle_color;
    }
    this.emitConfig(config);
  }

  private toggleListValue(event: Event, field: "controls" | "metrics" | "statuses"): void {
    const current = new Set(this.selectedValues(field));
    if (field === "statuses") this.statusesExplicit = true;
    const target = event.currentTarget as HTMLInputElement;
    if (target.checked) current.add(target.value);
    else current.delete(target.value);
    const config = { ...this.config, [field]: [...current] } as MyHondaPlusCardConfig;
    this.emitConfig(config);
  }

  private moveListValue(
    field: "controls" | "metrics" | "statuses",
    value: string,
    direction: -1 | 1,
  ): void {
    const current = this.selectedValues(field);
    if (field === "statuses") this.statusesExplicit = true;
    const index = current.indexOf(value);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    const item = current[index];
    const adjacentItem = current[target];
    if (item === undefined || adjacentItem === undefined) return;
    current[index] = adjacentItem;
    current[target] = item;
    const config = { ...this.config, [field]: current } as MyHondaPlusCardConfig;
    this.emitConfig(config);
  }

  private checklist(
    title: string,
    field: "controls" | "metrics" | "statuses",
    options: Array<[string, string]>,
    orderable = false,
  ): TemplateResult {
    const selectedValues = this.selectedValues(field);
    const selected = new Set(selectedValues);
    const optionMap = new Map(options.map((option) => [option[0], option]));
    const orderedOptions = orderable
      ? [
          ...selectedValues
            .map((value) => optionMap.get(value))
            .filter((option): option is [string, string] => Boolean(option)),
          ...options.filter(([value]) => !selected.has(value)),
        ]
      : options;
    const detected = this.detectedEntities();
    return html`<fieldset>
      <legend>${title}</legend>
      <div class="checks ${orderable ? "ordered-checks" : ""}">
        ${orderedOptions.map(([value, label]) => {
          const available = !this.config.device || Boolean(detected[value as keyof EntityMap]);
          const selectedIndex = selectedValues.indexOf(value);
          return html`<div class="check-row">
            <label class="check">
              <input
                type="checkbox"
                .value=${value}
                .checked=${selected.has(value)}
                ?disabled=${!available && !selected.has(value)}
                @change=${(event: Event) => this.toggleListValue(event, field)}
              />
              <span>${label}${available ? "" : ` — ${this.t("editor_not_available")}`}</span>
            </label>
            ${
              orderable && selectedIndex >= 0
                ? html`<span class="order-buttons">
                    <button
                      type="button"
                      aria-label=${this.t("editor_move_up", { item: label })}
                      title=${this.t("editor_move_up", { item: label })}
                      ?disabled=${selectedIndex === 0}
                      @click=${() => this.moveListValue(field, value, -1)}
                    >
                      <ha-icon icon="mdi:chevron-up" aria-hidden="true"></ha-icon>
                    </button>
                    <button
                      type="button"
                      aria-label=${this.t("editor_move_down", { item: label })}
                      title=${this.t("editor_move_down", { item: label })}
                      ?disabled=${selectedIndex === selectedValues.length - 1}
                      @click=${() => this.moveListValue(field, value, 1)}
                    >
                      <ha-icon icon="mdi:chevron-down" aria-hidden="true"></ha-icon>
                    </button>
                  </span>`
                : nothing
            }
          </div>`;
        })}
      </div>
    </fieldset>`;
  }

  private detectedEntities(): Partial<EntityMap> {
    if (!this.config.device) return {};
    return resolveEntities(
      this.registryEntries.filter((entry) => entry.device_id === this.config.device),
      this.config.entities,
    );
  }

  private capabilitySummary(): TemplateResult {
    if (!this.config.device) return html`${nothing}`;
    const detected = this.detectedEntities();
    const groups: Array<[TranslationKey, Array<[keyof EntityMap, TranslationKey]>]> = [
      [
        "editor_metrics",
        [
          ["range", "range"],
          ["battery", "battery"],
          ["odometer", "odometer"],
          ["trip_distance", "trip_distance"],
          ["trip_consumption", "trip_consumption"],
          ["trip_duration", "trip_duration"],
        ],
      ],
      [
        "editor_states",
        [
          ["doors", "doors"],
          ["windows", "windows"],
          ["trunk", "trunk"],
          ["hood", "hood"],
          ["lights", "lights"],
          ["charging", "charging"],
          ["location", "location"],
        ],
      ],
      [
        "editor_controls",
        [
          ["lock", "editor_locking"],
          ["climate", "climate"],
          ["horn_lights", "horn_lights"],
          ["refresh_cached", "refresh_cached"],
          ["refresh", "refresh_from_car"],
        ],
      ],
    ];
    const availableCount = groups
      .flatMap(([, entries]) => entries)
      .filter(([key]) => detected[key]).length;
    return html`<div class="capabilities">
      <strong>${this.t("editor_capabilities")}</strong>
      ${
        availableCount === 0
          ? html`<p class="hint warning">${this.t("editor_no_compatible_entities")}</p>`
          : groups.map(([title, entries]) => {
              const available = entries.filter(([key]) => detected[key]);
              return available.length === 0
                ? nothing
                : html`<div class="capability-group">
                    <span>${this.t(title)}</span>
                    <div class="chips">
                      ${available.map(
                        ([, label]) => html`<span class="chip">${this.t(label)}</span>`,
                      )}
                    </div>
                  </div>`;
            })
      }
    </div>`;
  }

  private integrationStatus(): TemplateResult {
    if (this.loading) {
      return html`<div class="integration-status">${this.t("editor_checking_integration")}</div>`;
    }
    if (this.discoveryError) {
      return html`<div class="integration-status warning">${this.t("discovery_failed")}</div>`;
    }
    if (!this.integrationDetected) {
      return html`<div class="integration-status warning">
        <strong>${this.t("editor_integration_not_detected")}</strong>
        <span>${this.t("editor_install_or_configure_integration")}</span>
        <a
          href="https://github.com/enricobattocchi/myhondaplus-homeassistant"
          target="_blank"
          rel="noopener noreferrer"
          >${this.t("editor_integration_instructions")}</a
        >
      </div>`;
    }
    if (this.devices.length === 0) {
      return html`<div class="integration-status warning">
        <strong>${this.t("editor_integration_detected")}</strong>
        <span>${this.t("editor_no_vehicles_configured")}</span>
      </div>`;
    }
    return html`<div class="integration-status success">
      <strong>${this.t("editor_integration_detected")}</strong>
      <span>${this.t("editor_vehicles_found", { count: this.devices.length })}</span>
    </div>`;
  }

  protected override render(): TemplateResult {
    return html`<div class="grid">
      <section>
        <h3>${this.t("editor_vehicle")}</h3>
        ${this.integrationStatus()}
        <button type="button" ?disabled=${this.loading} @click=${() => this.loadDevices(true)}>
          ${this.t("editor_redetect_entities")}
        </button>
        <label
          >${this.t("connected_vehicle")}
          <select name="device" @change=${this.updateField}>
            <option value="">${this.t("editor_select_vehicle")}</option>
            ${this.devices.map(
              (device) =>
                html`<option value=${device.id} ?selected=${this.config.device === device.id}>
                  ${this.deviceName(device)}
                </option>`,
            )}
          </select>
          <span class="hint"
            >${
              this.loading
                ? this.t("editor_searching_vehicles")
                : this.t("editor_vehicles_found", { count: this.devices.length })
            }</span
          >
        </label>
        ${this.capabilitySummary()}
        <label
          >${this.t("editor_name")}
          <input name="name" .value=${this.config.name ?? ""} @change=${this.updateField} />
        </label>
        <label
          >${this.t("editor_visual_model")}
          <select name="vehicle_model" @change=${this.updateField}>
            ${[
              ["auto", this.t("editor_automatic")],
              ["civic", "Honda Civic"],
              ["hrv", "Honda HR-V"],
              ["crv", "Honda CR-V"],
              ["zrv", "Honda ZR-V"],
              ["jazz", "Honda Jazz"],
              ["honda_e", "Honda e"],
              ["eny1", "Honda e:Ny1"],
              ["generic", this.t("editor_generic_honda")],
            ].map(
              ([value, label]) =>
                html`<option value=${value} ?selected=${this.config.vehicle_model === value}>
                  ${label}
                </option>`,
            )}
          </select>
        </label>
      </section>

      <section>
        <h3>${this.t("editor_appearance")}</h3>
        <label
          >${this.t("editor_layout")}
          <select name="layout" @change=${this.updateField}>
            <option value="full" ?selected=${this.config.layout === "full"}>
              ${this.t("editor_full")}
            </option>
            <option value="compact" ?selected=${this.config.layout === "compact"}>
              ${this.t("editor_compact")}
            </option>
          </select>
        </label>
        <label
          >${this.t("editor_vehicle_scale")}
          <input
            name="vehicle_scale"
            type="number"
            min="70"
            max="140"
            step="5"
            .value=${String(this.config.vehicle_scale ?? DEFAULT_CONFIG.vehicle_scale)}
            @change=${this.updateField}
          />
        </label>
        <label
          >${this.t("editor_alignment")}
          <select name="vehicle_alignment" @change=${this.updateField}>
            <option value="left" ?selected=${this.config.vehicle_alignment === "left"}>
              ${this.t("editor_left")}
            </option>
            <option value="center" ?selected=${this.config.vehicle_alignment === "center"}>
              ${this.t("editor_center")}
            </option>
            <option value="right" ?selected=${this.config.vehicle_alignment === "right"}>
              ${this.t("editor_right")}
            </option>
          </select>
        </label>
        <label class="check"
          ><input
            name="vehicle_shadow"
            type="checkbox"
            .checked=${this.config.vehicle_shadow !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_show_shadow")}</label
        >
        ${
          this.config.vehicle_shadow !== false
            ? html`
                <label
                  >${this.t("editor_shadow_color")}
                  <select name="color_preset" @change=${this.updateField}>
                    ${Object.entries(PAINT_PRESETS).map(
                      ([key, preset]) =>
                        html`<option value=${key} ?selected=${this.config.color_preset === key}>
                          ${key === "custom" ? this.t("editor_custom") : preset.label}
                        </option>`,
                    )}
                  </select>
                </label>
                ${
                  this.config.color_preset === "custom"
                    ? html`<label
                        >${this.t("editor_custom_shadow_color")}
                        <input
                          name="vehicle_color"
                          type="color"
                          .value=${this.config.vehicle_color ?? DEFAULT_CONFIG.vehicle_color}
                          @change=${this.updateField}
                        />
                      </label>`
                    : nothing
                }
                <label
                  >${this.t("editor_shadow_intensity")}
                  <input
                    name="shadow_intensity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    .value=${String(this.config.shadow_intensity ?? DEFAULT_CONFIG.shadow_intensity)}
                    @change=${this.updateField}
                  />
                </label>
              `
            : nothing
        }
        <label
          >${this.t("editor_image")}
          <select name="image_mode" @change=${this.updateField}>
            <option value="rendered" ?selected=${this.config.image_mode === "rendered"}>
              ${this.t("editor_included_art")}
            </option>
            <option value="custom" ?selected=${this.config.image_mode === "custom"}>
              ${this.t("editor_custom_image")}
            </option>
          </select>
        </label>
        ${
          this.config.image_mode === "custom"
            ? html`<label
                >${this.t("editor_image_url")}
                <input
                  name="vehicle_image"
                  .value=${this.config.vehicle_image ?? ""}
                  placeholder="/local/coches/mi-civic.png"
                  @change=${this.updateField}
                />
              </label>`
            : nothing
        }
      </section>

      <section>
        <h3>${this.t("editor_content")}</h3>
        ${this.checklist(this.t("editor_metrics"), "metrics", [
          ["range", this.t("range")],
          ["battery", this.t("battery")],
          ["odometer", this.t("odometer")],
          ["trip_distance", this.t("trip_distance")],
          ["trip_consumption", this.t("trip_consumption")],
          ["trip_duration", this.t("trip_duration")],
        ])}
        ${this.checklist(
          this.t("editor_states"),
          "statuses",
          [
            ["doors", this.t("doors")],
            ["windows", this.t("windows")],
            ["trunk", this.t("trunk")],
            ["hood", this.t("hood")],
            ["lights", this.t("lights")],
            ["charging", this.t("charging")],
            ["climate", this.t("climate")],
            ["location", this.t("location")],
          ] satisfies Array<[StatusKey, string]>,
          true,
        )}
        ${this.checklist(this.t("editor_controls"), "controls", [
          ["lock", this.t("editor_locking")],
          ["climate", this.t("climate")],
          ["horn_lights", this.t("horn_lights")],
          ["refresh_cached", this.t("refresh_cached")],
          ["refresh", this.t("refresh_from_car")],
        ])}
      </section>

      <section>
        <h3>${this.t("editor_behavior")}</h3>
        <label
          >${this.t("editor_language")}
          <select name="locale" @change=${this.updateField}>
            <option value="auto" ?selected=${this.config.locale === "auto"}>
              ${this.t("editor_automatic")}
            </option>
            <option value="es" ?selected=${this.config.locale === "es"}>Español</option>
            <option value="en" ?selected=${this.config.locale === "en"}>English</option>
            <option value="gl" ?selected=${this.config.locale === "gl"}>Galego</option>
          </select>
        </label>
        <label
          >${this.t("editor_stale_after")}
          <input
            name="stale_after"
            type="number"
            min="300"
            step="300"
            .value=${String(this.config.stale_after ?? DEFAULT_CONFIG.stale_after)}
            @change=${this.updateField}
          />
        </label>
        <label class="check"
          ><input
            name="show_controls"
            type="checkbox"
            .checked=${this.config.show_controls !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_show_controls")}</label
        >
        <label class="check"
          ><input
            name="show_model"
            type="checkbox"
            .checked=${this.config.show_model !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_show_model")}</label
        >
        <label class="check"
          ><input
            name="animate"
            type="checkbox"
            .checked=${this.config.animate !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_allow_animations")}</label
        >
        <label class="check"
          ><input
            name="confirm_unlock"
            type="checkbox"
            .checked=${this.config.confirm_unlock !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_confirm_unlock")}</label
        >
        <label class="check"
          ><input
            name="confirm_climate"
            type="checkbox"
            .checked=${this.config.confirm_climate === true}
            @change=${this.updateField}
          />
          ${this.t("editor_confirm_climate")}</label
        >
        <label class="check"
          ><input
            name="confirm_horn_lights"
            type="checkbox"
            .checked=${this.config.confirm_horn_lights === true}
            @change=${this.updateField}
          />
          ${this.t("editor_confirm_horn_lights")}</label
        >
        <label class="check"
          ><input
            name="confirm_refresh"
            type="checkbox"
            .checked=${this.config.confirm_refresh === true}
            @change=${this.updateField}
          />
          ${this.t("editor_confirm_refresh")}</label
        >
        <label class="check"
          ><input
            name="warn_stale_actions"
            type="checkbox"
            .checked=${this.config.warn_stale_actions !== false}
            @change=${this.updateField}
          />
          ${this.t("editor_warn_stale_actions")}</label
        >
        <label class="check"
          ><input
            name="debug"
            type="checkbox"
            .checked=${this.config.debug === true}
            @change=${this.updateField}
          />
          ${this.t("editor_show_diagnostics")}</label
        >
      </section>
    </div>`;
  }

  public static override styles = css`
    .grid {
      display: grid;
      gap: 16px;
      padding: 8px 0;
    }
    section {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 0.9rem;
    }
    input,
    select,
    button {
      box-sizing: border-box;
      width: 100%;
      padding: 10px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    input:focus-visible,
    select:focus-visible,
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid var(--primary-color);
      outline-offset: 2px;
    }
    fieldset {
      margin: 0;
      padding: 10px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    legend {
      padding: 0 5px;
      font-size: 0.85rem;
    }
    .checks {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .check-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }
    .ordered-checks {
      grid-template-columns: 1fr;
    }
    .order-buttons {
      display: flex;
      gap: 4px;
      flex: 0 0 auto;
    }
    .order-buttons button {
      display: grid;
      place-items: center;
      width: 34px;
      min-height: 34px;
      padding: 4px;
    }
    .order-buttons ha-icon {
      --mdc-icon-size: 18px;
    }
    .check input {
      width: auto;
    }
    .hint {
      font-size: 0.8rem;
      color: var(--secondary-text-color);
    }
    button {
      cursor: pointer;
      font-weight: 600;
    }
    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }
    .integration-status,
    .capabilities {
      display: grid;
      gap: 7px;
      padding: 11px;
      border: 1px solid var(--divider-color);
      border-radius: 9px;
      background: var(--secondary-background-color);
      font-size: 0.85rem;
    }
    .integration-status.success {
      border-inline-start: 4px solid var(--success-color, #43a047);
    }
    .integration-status.warning {
      border-inline-start: 4px solid var(--warning-color, #f9a825);
    }
    .integration-status a {
      color: var(--primary-color);
    }
    .capability-group {
      display: grid;
      gap: 5px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .chip {
      padding: 4px 7px;
      border-radius: 999px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      font-size: 0.75rem;
    }
    @media (max-width: 520px) {
      .checks {
        grid-template-columns: 1fr;
      }
    }
  `;
}
