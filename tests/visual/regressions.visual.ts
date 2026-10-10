import { expect, test, type Page } from "@playwright/test";

const card = "myhondaplus-vehicle-card";
const editor = "myhondaplus-vehicle-card-editor";
async function open(page: Page, query = ""): Promise<void> {
  await page.goto(`/tests/visual/?locale=en&${query}`);
  await page.waitForFunction(() => window.__visualReady === true);
}

test("in-flight discovery is shared across HA updates", async ({ page }) => {
  await open(page, "discoveryDelay=true");
  await page.evaluate(async () => {
    const { component, hass } = window.__visualTest;
    for (let i = 0; i < 10; i++) {
      component.hass = { ...hass };
      await component.updateComplete;
    }
  });
  await expect(page.locator(`${card} .metric`)).toHaveCount(5);
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(2);
});

test("failed discovery stops until explicitly retried", async ({ page }) => {
  await open(page, "failDiscovery=true");
  await expect(page.locator(`${card} .setup`)).toContainText("could not");
  await page.evaluate(async () => {
    const { component, hass } = window.__visualTest;
    for (let i = 0; i < 10; i++) {
      component.hass = { ...hass };
      await component.updateComplete;
    }
  });
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(2);
  await page.evaluate(() => {
    window.__visualTest.state.failDiscovery = false;
  });
  await page.locator(`${card} .setup button`).click();
  await expect(page.locator(`${card} .metric`)).toHaveCount(5);
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(4);
});

test("late discovery results cannot restore the previous vehicle", async ({ page }) => {
  await open(page, "discoveryDelay=true");
  await page.evaluate(() => {
    const { component, config, devices, registry, hass } = window.__visualTest;
    devices.push({ id: "synthetic-second", name: "Synthetic second Honda", model: "HR-V" });
    registry.push({
      entity_id: "sensor.synthetic_second_range",
      device_id: "synthetic-second",
      platform: "myhondaplus",
      translation_key: "total_range",
    });
    hass.states["sensor.synthetic_second_range"] = {
      entity_id: "sensor.synthetic_second_range",
      state: "99",
      attributes: { unit_of_measurement: "km" },
      last_updated: new Date().toISOString(),
    };
    component.setConfig({ ...config, device: "synthetic-second" });
  });
  await expect(page.locator(`${card} .metric`)).toHaveCount(1);
  await expect(page.locator(`${card} .metric`)).toContainText("99 km");
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(4);
});

test("registry events refresh capabilities and subscriptions are disposed on removal", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(`${card} .metric`)).toHaveCount(5);
  await page.evaluate(() => {
    const { registry, events } = window.__visualTest;
    registry.splice(
      registry.findIndex((item) => item.translation_key === "battery_level"),
      1,
    );
    events.entity_registry_updated!();
  });
  await expect(page.locator(`${card} .metric`)).toHaveCount(4);
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(4);
  await page.evaluate(() => window.__visualTest.component.remove());
  expect(await page.evaluate(() => window.__visualTest.state.unsubscriptions)).toBe(2);
  expect(await page.evaluate(() => Object.keys(window.__visualTest.events))).toEqual([]);
});

test("unknown and transitional lock states cannot issue a toggle", async ({ page }) => {
  await open(page);
  for (const state of ["unknown", "unavailable", "locking", "unlocking", "jammed"]) {
    await page.evaluate((state) => {
      const { hass, component } = window.__visualTest;
      hass.states["lock.synthetic_vehicle"]!.state = state;
      component.hass = { ...hass };
    }, state);
    await expect(page.locator(`${card} .badge`)).toContainText("Unknown state");
    await expect(page.locator(`${card} .controls button[aria-label=Lock]`)).toBeDisabled();
  }
  await expect(page.locator("body")).not.toHaveAttribute("data-called-service");
});

test("unpressed buttons remain usable and both refresh commands target the correct entity", async ({
  page,
}) => {
  await open(page, "confirmations=true");
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator(`${card} .controls button[aria-label='Refresh cached data']`).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-called-entity",
    "button.synthetic_refresh_cached",
  );
  await page.locator(`${card} .controls button[aria-label='Refresh from car']`).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-called-entity",
    "button.synthetic_refresh",
  );
});

test("unknown vehicle age warns before remote actions even after a recent HA write", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    const { hass, component } = window.__visualTest;
    hass.states["sensor.synthetic_updated"]!.state = "unavailable";
    hass.states["sensor.synthetic_updated"]!.last_updated = new Date().toISOString();
    component.hass = { ...hass };
  });
  await expect(page.locator(`${card} .freshness`)).toHaveText("No update date");
  const dialogPromise = page.waitForEvent("dialog");
  const click = page.locator(`${card} .controls button[aria-label='Refresh from car']`).click();
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain("vehicle update date is unknown");
  await dialog.dismiss();
  await click;
  await expect(page.locator("body")).not.toHaveAttribute("data-called-service");
});

test("the HA estimate is labelled and wraps on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 1000 });
  await open(page, "locale=es");
  await page.evaluate(() => {
    const { registry, events } = window.__visualTest;
    registry.splice(
      registry.findIndex((item) => item.translation_key === "last_updated"),
      1,
    );
    events.entity_registry_updated!();
  });
  await expect(page.locator(`${card} .freshness`)).toContainText("Home Assistant:");
  await expect(page.locator(`${card} .freshness`)).toContainText("unknown");
  const widths = await page.locator(`${card} .freshness`).evaluate((element) => ({
    actual: element.scrollWidth,
    available: element.clientWidth,
  }));
  expect(widths.actual).toBeLessThanOrEqual(widths.available + 1);
});

test("freshness advances without HA state changes or registry requests", async ({ page }) => {
  await page.clock.install();
  await open(page);
  await page.evaluate(() => {
    const { component, config } = window.__visualTest;
    component.setConfig({ ...config, stale_after: 30 });
  });
  await expect(page.locator(`${card} .freshness`)).not.toHaveClass(/stale/);
  await expect(page.locator(`${card} .metric`)).toHaveCount(5);
  const calls = await page.evaluate(() => window.__visualTest.state.wsCalls);
  await page.clock.fastForward(61000);
  await expect(page.locator(`${card} .freshness`)).toHaveClass(/stale/);
  expect(await page.evaluate(() => window.__visualTest.state.wsCalls)).toBe(calls);
});

test("compact editor metrics and controls preserve implicit statuses, while empty explicit statuses persist", async ({
  page,
}) => {
  await open(page, "target=editor&layout=compact");
  await page.locator(editor).evaluate((element) => {
    element.addEventListener("config-changed", (event) => {
      document.body.dataset.savedConfig = JSON.stringify(
        (event as CustomEvent<{ config: unknown }>).detail.config,
      );
    });
  });
  await page.locator(`${editor} input[value=range]`).uncheck();
  let saved = JSON.parse((await page.locator("body").getAttribute("data-saved-config"))!);
  expect(saved).not.toHaveProperty("statuses");
  await page.locator(`${editor} input[value=horn_lights]`).uncheck();
  saved = JSON.parse((await page.locator("body").getAttribute("data-saved-config"))!);
  expect(saved).not.toHaveProperty("statuses");
  await page.evaluate(() => {
    const { component, config } = window.__visualTest;
    component.setConfig({ ...config, statuses: [] });
  });
  await page.locator(`${editor} input[value=range]`).uncheck();
  saved = JSON.parse((await page.locator("body").getAttribute("data-saved-config"))!);
  expect(saved.statuses).toEqual([]);
});
