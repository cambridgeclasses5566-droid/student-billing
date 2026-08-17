/* Static private-client dashboard navigation. Page rendering is owned by dashboard.js. */
import './footerCredit.js';
const workflowStyles=document.createElement('link');workflowStyles.rel='stylesheet';workflowStyles.href='../assets/css/workflow.css';document.head.append(workflowStyles);
export function organizeNavigation(){const nav=document.querySelector('#sideNav');if(!nav||nav.dataset.organized)return;nav.dataset.organized='true';const groups=[[['dashboard','Dashboard']],[['students','Students'],['add-student','Add Student'],['classes','Classes']],[['fee-collection','Collect Payment'],['payments','Payment History'],['pending','Pending Fees']],[['reports','Financial Reports']]];nav.innerHTML=groups.map(items=>items.map(([page,text],index)=>`<a class="side-link${index===0?' side-link--group-start':''}" href="#${page}" data-page="${page}">${text}</a>`).join('')).join('')}
organizeNavigation();

const showDashboardShellError = error => {
  console.error('Dashboard module initialization failed', error);
  const root = document.querySelector('#workspace');
  if (!root || !root.querySelector('.skeleton')) return;
  root.innerHTML = '<div class="card empty"><h3>Could not load your workspace</h3><p>The application encountered an initialization error. Navigation remains available.</p><div class="form-actions"><a class="btn btn-primary" href="#dashboard">Open Dashboard</a><button class="btn btn-secondary" type="button" onclick="location.reload()">Retry</button></div></div>';
};
window.addEventListener('error', event => showDashboardShellError(event.error || event.message));
window.addEventListener('unhandledrejection', event => showDashboardShellError(event.reason));
