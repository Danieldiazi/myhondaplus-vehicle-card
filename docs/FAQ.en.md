# Frequently asked questions

[Español](FAQ.md) | **English**

## Does this card connect directly to Honda?

No. It only uses the devices, entities and services created by [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant). Authentication and Honda communication belong to that integration.

## Why is battery, climate or another feature missing?

The card discovers capabilities from the actual entities associated with the device, never from a fixed per-model list. If the integration does not publish a compatible entity, the card hides that feature.

A temporarily `unknown` or `unavailable` entity differs from a missing capability: the former can appear as **No data**; the latter is hidden.

## Why does my model show the Honda logo?

The Civic has a dedicated illustration. Models without a specific SVG use the Honda logo as the official fallback. This does not affect detected metrics, statuses or controls.

## What is the difference between the two refresh actions?

- **Refresh cached data** queries the information available in Honda's cloud again.
- **Refresh from car** asks for new information directly from the vehicle.

Not every vehicle publishes both entities. `confirm_refresh` protects either action when displayed.

## Why is a button missing?

The control must be selected and the integration must publish a compatible entity for the vehicle. Use **Detect integration and entities again** after enabling or adding entities.

## Which elements are actions and which only show information?

The bottom controls —lock, climate, horn and lights, and refresh— call Home Assistant services. Metrics, the header lock badge, freshness, statuses and location open Home Assistant's native `more-info` dialog with attributes and history.

## Why do I see an outdated-data warning?

The last-update age exceeded `stale_after`, six hours by default. With `warn_stale_actions: true`, the card requests confirmation before selected remote actions. The warning does not update the vehicle.

## Why is freshness unknown after a cloud refresh?

HA's `last_updated` records an entity write; the timestamp sensor's state describes the vehicle data date. A cloud refresh can keep that date unchanged. Invalid, future or unavailable dates are not reported as fresh. When the timestamp entity is absent, an HA update estimate does not remove the unknown-age warning.

## Why is an unknown button enabled but an unknown lock disabled?

Buttons may remain `unknown` until first pressed. A lock in `unknown`, `unavailable`, `locking`, `unlocking` or `jammed` cannot determine a safe toggle and is disabled.

## Why does compact layout show fewer statuses?

Omitted `statuses` defaults to climate and location in compact layout and all detected statuses in full layout. An explicit list replaces this, including an empty list. Editing metrics or controls preserves omitted defaults.

## How can I check the installed version?

HACS shows the installed and latest versions on the repository page. Home Assistant also creates an update entity with `installed_version` and `latest_version` attributes. The loaded card version is announced in the browser console.

## HACS does not detect a new release immediately

Detection depends on HACS's periodic check. You can refresh repository information, but restarting Home Assistant does not guarantee earlier detection. Once HACS installs the update, reload the browser without cache.

## The card still loads an older version

1. Confirm that HACS installed the new version.
2. Check that the resource is `/hacsfiles/myhondaplus-vehicle-card/myhondaplus-vehicle-card.js`.
3. Hard reload with `Ctrl + F5`, `Ctrl + Shift + R` or `Cmd + Shift + R`.
4. Fully close the mobile app before reopening it.
5. Check the registered card version in the browser console.

Do not add a second resource URL as a cache workaround; that can load two versions of the same custom element.

## What information can I share in an issue?

Share Home Assistant, integration, card and browser versions; sanitized YAML; anonymized diagnostics; and relevant console errors. Never publish VINs, coordinates, license plates, credentials, tokens or complete identifiers.

## Where should I report a problem?

- Authentication, missing vehicle or Honda communication: My Honda+ for Home Assistant repository.
- Existing entity not detected, editor, layout, translation or controls: this repository.
