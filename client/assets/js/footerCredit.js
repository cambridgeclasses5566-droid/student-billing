const footerCredit = document.querySelector('.app-footer a');

if (footerCredit) {
  let releaseTimer;
  const press = () => {
    clearTimeout(releaseTimer);
    footerCredit.classList.add('is-pressed');
  };
  const release = () => {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => footerCredit.classList.remove('is-pressed'), 220);
  };
  footerCredit.addEventListener('pointerdown', press);
  footerCredit.addEventListener('pointerup', release);
  footerCredit.addEventListener('pointercancel', release);
  footerCredit.addEventListener('pointerleave', release);
  footerCredit.addEventListener('blur', () => footerCredit.classList.remove('is-pressed'));
}
