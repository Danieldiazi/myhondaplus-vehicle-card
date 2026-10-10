# User guide

[Español](USER_GUIDE.md) | **English**

## What you need to install

This card is the visual interface. It does not sign in to Honda or retrieve vehicle data by itself.

Data comes from [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant), which creates the device, entities and services consumed by the card.

```text
Honda services
       ↓
My Honda+ for Home Assistant
       ↓
Home Assistant devices, entities and services
       ↓
My Honda+ Vehicle Card
```

## Requirements

- Home Assistant with Lovelace.
- My Honda+ for Home Assistant installed, authenticated and working.
- At least one vehicle device with available entities.
- HACS, recommended for installation and updates.

Before continuing, open **Settings → Devices & services** and verify that the integration shows the vehicle and its entities.

## Installation

1. Install and configure [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant).
2. Open **HACS**.
3. Add `https://github.com/Danieldiazi/myhondaplus-vehicle-card` as a custom repository of type **Dashboard**.
4. Download **My Honda+ Vehicle Card**.
5. Fully reload the browser or Home Assistant app.
6. Add a card and select **My Honda+ Vehicle Card**.

## Visual editor

The editor selects the vehicle, visual model, shadow, layout and visible metrics, statuses and controls. Statuses can be moved up or down. With the default selection, unsupported capabilities are hidden automatically.

```yaml
type: custom:myhondaplus-vehicle-card
device: DEVICE_ID
```

## Common configurations

### Compact layout

```yaml
type: custom:myhondaplus-vehicle-card
device: DEVICE_ID
layout: compact
```

### Disable animations

```yaml
type: custom:myhondaplus-vehicle-card
device: DEVICE_ID
animate: false
```

### Custom image

```yaml
type: custom:myhondaplus-vehicle-card
device: DEVICE_ID
image_mode: custom
vehicle_image: /local/cars/my-civic.png
```

### Visible status order

```yaml
statuses:
  - location
  - doors
  - windows
  - trunk
  - hood
  - lights
  - charging
  - climate
```

A selected status appears only when the integration publishes its entity.

### Manual entities

```yaml
entities:
  lock: lock.my_honda
  range: sensor.my_honda_range
  battery: sensor.my_honda_battery
  refresh_cached: button.my_honda_refresh_cached
  refresh: button.my_honda_refresh_from_car
```

## Two refresh actions

The card can show two different controls when the integration exposes them:

- **Refresh cached data** (`refresh_cached`) queries the information available in Honda's cloud again.
- **Refresh from car** (`refresh`) asks for new information directly from the vehicle.

Some vehicles offer only one. The card hides any unavailable action automatically.

## Safety

Unlock confirmation is enabled by default:

```yaml
confirm_unlock: true
```

Optional confirmations can also be enabled:

```yaml
confirm_climate: true
confirm_horn_lights: true
confirm_refresh: true
```

`confirm_refresh` applies to both refresh controls and uses an action-specific message. Do not disable unlock confirmation on shared or wall-mounted dashboards.

## Outdated data

The default `stale_after` value is six hours:

```yaml
stale_after: 21600
warn_stale_actions: true
```

The warning does not force an update. It warns before remote actions when the displayed vehicle state may no longer be current.

## Freshness, defaults and recovery

The timestamp sensor's state determines vehicle freshness; its HA write time does not show when the car supplied data. Invalid or unavailable timestamps show **No update date**. If no timestamp entity exists, any HA update estimate is labelled explicitly. With `warn_stale_actions: true`, remote commands require confirmation for outdated or unknown vehicle data.

Default metrics are range, battery, odometer, monthly distance and average consumption. Default controls are locking, climate, horn/lights and direct vehicle refresh; cached refresh is opt-in. Full layout defaults to all detected statuses; compact defaults to climate and location. Explicit lists replace defaults, including empty lists.

Discovery failures stop automatic retries. Use the card's retry button or **Detect integration and entities again** in the editor. Registry events refresh capabilities automatically when HA supports subscriptions. Enable `debug: true` for another rediscovery button and anonymized diagnostics distinguishing assigned, present and available entities. Unknown or transitional lock states disable the toggle; an unpressed `unknown` button can still be available.

Manual installation is in the [README](../README.md#manual-installation-without-hacs); the full contract is in [Configuration](CONFIGURATION.en.md).

## Troubleshooting

### The card is missing

- Confirm that HACS installed the repository.
- Check that the resource URL is `/hacsfiles/myhondaplus-vehicle-card/myhondaplus-vehicle-card.js` and its type is **JavaScript module**.
- Reload the browser without cache.
- Verify the card type is `custom:myhondaplus-vehicle-card`.

### No vehicle is found

- Verify that the integration created a Home Assistant device.
- Check that its entities are enabled.
- Reload the integration and select **Detect integration and entities again** in the card editor.

### An entity exists but is not detected

- Enable anonymized diagnostics.
- Temporarily map it under `entities`.
- Open an issue without VINs, coordinates, tokens or private states.

### A metric, status or control is missing

Check whether the integration exposes the corresponding entity for this vehicle. The model name never enables features.

### The visual model is wrong

Select `vehicle_model` manually. This changes artwork only.

### HACS does not show an update

- Verify that the release and its version tag exist.
- Refresh HACS repository information or wait for its periodic check.
- Restarting Home Assistant does not force immediate release detection.
- Once HACS installs the update, reload the browser without cache.

More answers are available in the [FAQ](FAQ.en.md).

## Getting help

| Problem                                           | Repository                   |
| ------------------------------------------------- | ---------------------------- |
| Authentication or Honda communication             | My Honda+ for Home Assistant |
| Vehicle or all entities missing in Home Assistant | My Honda+ for Home Assistant |
| Existing entity not detected by the card          | My Honda+ Vehicle Card       |
| Layout, translation, editor or card controls      | My Honda+ Vehicle Card       |

Include Home Assistant, integration and card versions, browser, sanitized YAML, anonymized diagnostics and relevant console errors.
