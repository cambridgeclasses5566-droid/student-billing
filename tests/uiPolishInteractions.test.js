import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('sidebar uses readable theme tokens and preserves active contrast',()=>{
  const variables=read('client/assets/css/variables.css'),theme=read('client/assets/css/theme.css'),responsive=read('client/assets/css/responsive-dashboard.css');
  for(const token of ['--sidebar-text','--sidebar-icon','--sidebar-label','--sidebar-hover','--sidebar-active-text'])assert.match(variables,new RegExp(token));
  assert.match(theme,/\.side\s*\{[^}]*opacity:\s*1;[^}]*filter:\s*none/s);
  assert.match(theme,/\.side \.side-link\.active\s*\{[^}]*color:\s*var\(--sidebar-active-text\)\s*!important/s);
  assert.match(theme,/\.side \.side-link:not\(\.active\):hover/);
  assert.match(theme,/\.side \.side-link:active/);
  assert.match(theme,/\.nav-group\s*\{[^}]*var\(--sidebar-label\)/s);
  assert.match(responsive,/\.side\s*\{[\s\S]*z-index:\s*80\s*!important/s);
  assert.match(responsive,/\.drawer-overlay\.show\s*\{[\s\S]*z-index:\s*70\s*!important/s);
});

test('logo actions have intentional desktop gaps and narrow-screen stacking',()=>{
  const css=read('client/assets/css/receipt.css');
  assert.match(css,/\.logo-upload-card > div > div\s*\{[^}]*gap:\s*10px/s);
  assert.match(css,/\.logo-upload-card > div > div > p\s*\{[^}]*flex-basis:\s*100%/s);
  assert.match(css,/@media \(max-width:\s*480px\)[\s\S]*\.logo-upload-card > div > div\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css,/\.logo-upload-card \.btn\s*\{\s*width:\s*100%/s);
});

test('shared control system covers hover press focus disabled and dark mode',()=>{
  const variables=read('client/assets/css/variables.css'),theme=read('client/assets/css/theme.css');
  assert.match(variables,/--control-transition:/);
  assert.match(theme,/\.btn-primary:not\(:disabled\)[\s\S]*:hover/);
  assert.match(theme,/\.btn-secondary[\s\S]*:hover/);
  assert.match(theme,/\.btn-danger:not\(:disabled\)[\s\S]*:hover/);
  assert.match(theme,/:focus-visible\s*\{[\s\S]*outline:\s*3px solid/);
  assert.match(theme,/\[disabled\][\s\S]*cursor:\s*not-allowed/);
  assert.match(theme,/:active\s*\{[\s\S]*transform:\s*scale\(\.98\)/);
  assert.match(theme,/\[data-theme="dark"\][\s\S]*\.btn-danger/);
});
