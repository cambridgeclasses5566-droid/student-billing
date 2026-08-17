const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowser && !document.querySelector('link[data-app-select]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/css/app-select.css';
  link.dataset.appSelect = 'true';
  document.head.append(link);
}

let active = null;

const selectableOptions = select => [...select.options];
const selectedText = select => select.selectedOptions[0]?.textContent?.trim() || 'Select an option';

function closeActive({ restoreFocus = false } = {}) {
  if (!active) return;
  const { trigger, panel } = active;
  trigger.setAttribute('aria-expanded', 'false');
  panel.remove();
  active = null;
  if (restoreFocus) trigger.focus();
}

function positionPanel(trigger, panel) {
  const margin = 8;
  const gap = 6;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(rect.width, viewportWidth - margin * 2);
  const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin));
  const below = Math.max(0, viewportHeight - rect.bottom - margin - gap);
  const above = Math.max(0, rect.top - margin - gap);
  const preferred = Math.min(280, Math.floor(viewportHeight * .45));
  const openAbove = below < Math.min(180, preferred) && above > below;
  const available = Math.max(96, openAbove ? above : below);
  const maxHeight = Math.min(preferred, available);
  panel.style.width = `${width}px`;
  panel.style.maxWidth = `${viewportWidth - margin * 2}px`;
  panel.style.left = `${left}px`;
  panel.style.maxHeight = `${maxHeight}px`;
  panel.style.visibility = 'hidden';
  panel.style.top = '0';
  const height = Math.min(panel.scrollHeight, maxHeight);
  panel.style.top = `${openAbove ? Math.max(margin, rect.top - height - gap) : Math.min(viewportHeight - height - margin, rect.bottom + gap)}px`;
  panel.classList.toggle('opens-up', openAbove);
  panel.style.visibility = 'visible';
}

function focusOption(panel, index) {
  const items = [...panel.querySelectorAll('[role="option"]:not(:disabled)')];
  if (!items.length) return;
  const next = Math.max(0, Math.min(index, items.length - 1));
  items[next].focus();
  items[next].scrollIntoView({ block: 'nearest' });
}

function openSelect(select, trigger) {
  if (select.disabled) return;
  closeActive();
  const panel = document.createElement('div');
  panel.className = 'app-select-panel';
  panel.id = `${trigger.id}-listbox`;
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-label', trigger.getAttribute('aria-label') || 'Select an option');
  let optionIndex = 0;
  [...select.children].forEach(child => {
    if (child.tagName === 'OPTGROUP') {
      const group = document.createElement('div');
      group.className = 'app-select-group';
      group.textContent = child.label;
      panel.append(group);
      [...child.children].forEach(option => panel.append(optionButton(option, optionIndex++)));
    } else if (child.tagName === 'OPTION') {
      panel.append(optionButton(child, optionIndex++));
    }
  });
  document.body.append(panel);
  trigger.setAttribute('aria-controls', panel.id);
  trigger.setAttribute('aria-expanded', 'true');
  active = { select, trigger, panel };
  positionPanel(trigger, panel);
  panel.addEventListener('click', event => {
    const item = event.target.closest('[role="option"]');
    if (!item || item.disabled) return;
    select.selectedIndex = Number(item.dataset.index);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncSelect(select);
    closeActive({ restoreFocus: true });
  });
  panel.addEventListener('keydown', event => {
    const items = [...panel.querySelectorAll('[role="option"]:not(:disabled)')];
    const current = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(panel, event.key === 'ArrowDown' ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOption(panel, event.key === 'Home' ? 0 : items.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeActive({ restoreFocus: true });
    } else if (event.key === 'Tab') closeActive();
  });
  const options = [...panel.querySelectorAll('[role="option"]:not(:disabled)')];
  const selected = options.findIndex(item => item.getAttribute('aria-selected') === 'true');
  focusOption(panel, selected >= 0 ? selected : 0);

  function optionButton(option, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'app-select-option';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.selected));
    button.disabled = option.disabled;
    button.textContent = option.textContent;
    return button;
  }
}

function syncSelect(select) {
  const wrapper = select.closest('.app-select');
  const trigger = wrapper?.querySelector('.app-select-trigger');
  if (!trigger) return;
  trigger.querySelector('.app-select-value').textContent = selectedText(select);
  trigger.disabled = select.disabled;
  trigger.classList.toggle('is-placeholder', !select.value);
  if (active?.select === select) {
    closeActive();
    openSelect(select, trigger);
  }
}

function enhanceSelect(select) {
  if (select.dataset.appSelectReady || select.multiple || Number(select.size) > 1 || select.matches('[data-native-select]')) return;
  select.dataset.appSelectReady = 'true';
  const wrapper = document.createElement('div');
  wrapper.className = 'app-select';
  select.parentNode.insertBefore(wrapper, select);
  wrapper.append(select);
  select.classList.add('app-select-native');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'app-select-trigger';
  trigger.id = `app-select-${Math.random().toString(36).slice(2, 10)}`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const label = select.id ? document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.textContent?.trim() : '';
  trigger.setAttribute('aria-label', select.getAttribute('aria-label') || label || select.name || 'Select an option');
  trigger.innerHTML = '<span class="app-select-value"></span><span class="app-select-chevron" aria-hidden="true"></span>';
  wrapper.append(trigger);
  trigger.addEventListener('click', () => active?.select === select ? closeActive() : openSelect(select, trigger));
  trigger.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (active?.select !== select) openSelect(select, trigger);
    } else if (event.key === 'Escape') closeActive({ restoreFocus: true });
  });
  select.addEventListener('change', () => syncSelect(select));
  select.addEventListener('input', () => syncSelect(select));
  select.addEventListener('focus', () => trigger.focus());
  select.addEventListener('invalid', () => trigger.focus());
  select.form?.addEventListener('reset', () => setTimeout(() => syncSelect(select)));
  new MutationObserver(() => syncSelect(select)).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
  syncSelect(select);
}

export function installAppSelects(root = document) {
  if (!isBrowser) return;
  root.querySelectorAll?.('select').forEach(enhanceSelect);
}

export function installAppCombobox(input, { options = [] } = {}) {
  if (!isBrowser || !input || input.dataset.appComboboxReady) return;
  input.dataset.appComboboxReady = 'true';
  const values = [...new Set(options.map(value => String(value).trim()).filter(Boolean))];
  const wrapper = document.createElement('div');
  wrapper.className = 'app-combobox';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.append(input);
  input.classList.add('app-combobox-input');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'app-combobox-toggle';
  toggle.setAttribute('aria-label', 'Show batch type options');
  toggle.innerHTML = '<span class="app-select-chevron" aria-hidden="true"></span>';
  wrapper.append(toggle);

  const open = ({ focusFirst = false, filter = false } = {}) => {
    closeActive();
    const panel = document.createElement('div');
    panel.className = 'app-select-panel app-combobox-panel';
    panel.id = `app-combobox-${Math.random().toString(36).slice(2, 10)}`;
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Batch type options');
    const query = filter ? input.value.trim().toLowerCase() : '';
    const matches = values.filter(value => !query || value.toLowerCase().includes(query));
    (matches.length ? matches : values).forEach(value => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'app-select-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(value === input.value));
      option.textContent = value;
      panel.append(option);
    });
    document.body.append(panel);
    input.setAttribute('aria-controls', panel.id);
    input.setAttribute('aria-expanded', 'true');
    active = { trigger: input, panel };
    positionPanel(input, panel);
    panel.addEventListener('click', event => {
      const option = event.target.closest('[role="option"]');
      if (!option) return;
      input.value = option.textContent;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      closeActive({ restoreFocus: true });
    });
    panel.addEventListener('keydown', event => {
      const items = [...panel.querySelectorAll('[role="option"]')];
      const current = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusOption(panel, event.key === 'ArrowDown' ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0));
      } else if (event.key === 'Enter' && current >= 0) {
        event.preventDefault();
        items[current].click();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeActive({ restoreFocus: true });
      }
    });
    if (focusFirst) focusOption(panel, 0);
  };

  toggle.addEventListener('click', () => active?.trigger === input ? closeActive({ restoreFocus: true }) : open({ focusFirst: true }));
  input.addEventListener('focus', () => { if (active?.trigger !== input) open(); });
  input.addEventListener('input', () => open({ filter: true }));
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open({ focusFirst: true });
    } else if (event.key === 'Escape') closeActive({ restoreFocus: true });
  });
}

if (isBrowser) {
  installAppSelects();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (!(node instanceof Element)) return;
    if (node.matches('select')) enhanceSelect(node);
    installAppSelects(node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('pointerdown', event => {
    if (active && !active.panel.contains(event.target) && !active.trigger.contains(event.target)) closeActive();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeActive({ restoreFocus: true }); });
  window.addEventListener('resize', () => active && positionPanel(active.trigger, active.panel));
  window.addEventListener('scroll', () => { if (active) positionPanel(active.trigger, active.panel); }, true);
}
