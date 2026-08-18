export function installMobileNavigation() {
  const sidebar = document.querySelector('#sidebar');
  const menu = document.querySelector('#menu');
  const closeButton = document.querySelector('#mobileNavClose');
  const overlay = document.querySelector('#overlay');
  if (!sidebar || !menu || !closeButton || !overlay) return;

  const isOpen = () => sidebar.classList.contains('open');
  const close = ({ restoreFocus = false } = {}) => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.classList.remove('mobile-nav-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    overlay.setAttribute('aria-hidden', 'true');
    if (restoreFocus) menu.focus();
  };
  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('mobile-nav-open');
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', 'Navigation open');
    overlay.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  };

  menu.addEventListener('click', () => isOpen() ? close({ restoreFocus: true }) : open());
  closeButton.addEventListener('click', () => close({ restoreFocus: true }));
  overlay.addEventListener('click', () => close({ restoreFocus: true }));
  sidebar.addEventListener('click', event => {
    if (event.target.closest('a.side-link')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', event => {
    if (event.matches) close();
  });
}
