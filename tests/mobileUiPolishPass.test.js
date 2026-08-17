import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("global native selects and responsive filter grids cannot exceed their containers", async () => {
  const [globalCss, mobileCss, billingCss] = await Promise.all([read("client/assets/css/global.css"), read("client/assets/css/mobile-app.css"), read("client/assets/css/billing-pages.css")]);
  assert.match(globalCss, /select\{display:block;width:100%;max-width:100%;min-width:0/);
  assert.match(globalCss, /payment-history-filters>\*[^}]*min-width:0/);
  assert.match(mobileCss, /@media \(max-width: 389px\)/);
  assert.match(mobileCss, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(billingCss, /max-height:min\(280px,45vh\)/);
  assert.match(billingCss, /overflow-x:hidden;overflow-y:auto/);
});

test("touch feedback is separate from hover-capable device styling", async () => {
  const [globalCss, themeCss] = await Promise.all([read("client/assets/css/global.css"), read("client/assets/css/theme.css")]);
  assert.match(globalCss, /@media\(hover:none\),\(pointer:coarse\)/);
  assert.match(themeCss, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(themeCss, /btn-primary[^}]*:active[^}]*background: var\(--primary-hover\)/s);
  assert.match(themeCss, /account-trigger[^}]*:active/s);
  assert.match(themeCss, /@media \(hover: hover\) and \(pointer: fine\)/);
});

test("login, forgot, and reset pages share the mobile auth system", async () => {
  const [login, forgot, reset, authCss, authJs] = await Promise.all([
    read("client/login.html"),
    read("client/forgot-password.html"),
    read("client/reset-password.html"),
    read("client/assets/css/auth.css"),
    read("client/assets/js/auth.js"),
  ]);
  assert.match(login, /class="password-control"/);
  assert.match(login, /aria-controls="password"/);
  assert.match(forgot, /class="auth-return"/);
  assert.equal((reset.match(/class="password-control"/g) || []).length, 2);
  assert.match(reset, /aria-controls="confirmPassword"/);
  assert.match(authCss, /padding-right: 74px/);
  assert.match(authCss, /@media \(max-width: 374px\)/);
  assert.match(authCss, /\[data-theme="dark"\] \.auth-main/);
  assert.match(authJs, /\$\$\('\[data-toggle-password\]'\)\.forEach/);
  assert.match(authJs, /toggle\.textContent=reveal\?'Hide':'Show'/);
});
