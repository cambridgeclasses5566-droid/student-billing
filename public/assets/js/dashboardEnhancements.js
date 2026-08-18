import { loadOnboardingStatus, renderOnboarding } from './onboarding.js';

export async function renderDashboardEnhancements(root) {
  if (!root || root.querySelector('[data-section="dashboard-enhancements"]')) return;
  const marker = document.createElement('div'); marker.dataset.section = 'dashboard-enhancements'; marker.hidden = true; root.prepend(marker);
  const onboarding = await loadOnboardingStatus().catch(() => null);
  if (onboarding && !onboarding.complete && !root.querySelector('#setupChecklist')) marker.insertAdjacentHTML('afterend', renderOnboarding(onboarding));
  root.querySelector('#collapseSetup')?.addEventListener('click', () => root.querySelector('#setupChecklist')?.classList.toggle('collapsed'));
}
