import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared mobile record helpers reuse existing record data and actions", async () => {
  const ui = await read("client/assets/js/mobileUI.js");
  assert.match(ui, /export function studentMobileCard/);
  assert.match(ui, /export function paymentMobileCard/);
  assert.match(ui, /export function reportMobileCard/);
  assert.match(ui, /studentInitials/);
  assert.match(ui, /data-action="receipt"/);
});

test("desktop tables and dedicated mobile lists are rendered from the same datasets", async () => {
  const directory = await read("client/assets/js/studentDirectory.js");
  const payments = await read("client/assets/js/billingPages.js");
  const reports = await read("client/assets/js/financialReports.js");
  const classes = await read("client/assets/js/classProfile.js");
  assert.match(directory, /directoryMobileRows/);
  assert.match(directory, /data\.students\.map\(student=>studentMobileCard/);
  assert.match(payments, /historyMobileRows/);
  assert.match(payments, /rows\.map\(item=>paymentMobileCard/);
  assert.match(reports, /reportMobileRows/);
  assert.match(reports, /filtered\.map\(reportMobileCard\)/);
  assert.match(classes, /class-student-mobile-list/);
  for (const source of [directory, payments, reports, classes]) assert.match(source, /desktop-data-view/);
});

test("mobile dashboard is a separate composition while desktop stays available", async () => {
  const dashboard = await read("client/assets/js/dashboard.js");
  const css = await read("client/assets/css/mobile-app.css");
  assert.match(dashboard, /desktop-dashboard/);
  assert.match(dashboard, /mobile-dashboard/);
  assert.match(dashboard, /mobile-metric-grid/);
  assert.match(dashboard, /mobile-quick-grid/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.desktop-dashboard[^}]*display: none !important/s);
  assert.match(css, /\.mobile-metric-grid[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
});

test("phone design system includes compact cards, touch targets and narrow-phone handling", async () => {
  const css = await read("client/assets/css/mobile-app.css");
  assert.match(css, /--mobile-shadow:/);
  assert.match(css, /border-radius: 17px/);
  assert.match(css, /min-height: 46px/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /\.mobile-pagination/);
  assert.match(css, /\.mobile-filter-panel/);
  assert.match(css, /\.receipt-pro/);
});
