import { get, post, patch, del } from "./api.js";
import { $, $$, money, date, escapeHTML, toast } from "./ui.js";
const root = $("#workspace"),
  modal = $("#modal");
let users = [],
  subscriptions = [],
  transactions = [],
  charts = [];
const status = (s) => `<span class="status ${s === "active" || s === "paid" ? "paid" : s === "expired" || s === "failed" || s === "blocked" ? "unpaid" : "partial"}">${escapeHTML(s)}</span>`;
const heading = (a, b, c = "") => `<div class="page-title"><div><h1>${a}</h1><p>${b}</p></div>${c}</div>`;
async function overview() {
  const d = await get("/admin/dashboard"),
    s = d.summary;
  root.innerHTML = `${heading("Platform overview", "Subscription, revenue, and registration health.")}<div class="kpis">${[
    ["Registered users", s.users],
    ["Verified users", s.verified],
    ["Unverified users", s.unverified],
    ["Active subscriptions", s.active],
    ["Pending payments", s.pending],
    ["Expired", s.expired],
    ["Blocked", s.blocked],
    ["Revenue", money(s.revenue)],
  ]
    .map((x) => `<article class="card kpi"><small>${x[0]}</small><strong>${x[1]}</strong></article>`)
    .join(
      "",
    )}</div><div class="dash-grid"><section class="card panel"><h3>Monthly signup growth</h3><div class="chart-wrap"><canvas id="signups"></canvas></div></section><section class="card panel"><h3>Subscription health</h3><div class="chart-wrap"><canvas id="subs"></canvas></div></section><section class="card panel"><h3>Recent registrations</h3>${d.registrations.map((u) => `<div class="receipt-row"><span>${escapeHTML(u.instituteName)}<small style="display:block">${escapeHTML(u.email)}</small></span>${status(u.accountStatus)}</div>`).join("")}</section><section class="card panel"><h3>Recent transactions</h3>${d.transactions.map((t) => `<div class="receipt-row"><span>${escapeHTML(t.userId?.instituteName || "Institute")}</span><strong>${money(t.amount)} ${status(t.status)}</strong></div>`).join("")}</section></div>`;
  charts.forEach((c) => c.destroy());
  charts = [
    new Chart($("#signups"), {
      type: "bar",
      data: { labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"], datasets: [{ data: [12, 19, 26, 35, 44, s.users], backgroundColor: "#dc2626" }] },
      options: { plugins: { legend: { display: false } }, maintainAspectRatio: false },
    }),
    new Chart($("#subs"), {
      type: "doughnut",
      data: { labels: ["Active", "Expired", "Pending"], datasets: [{ data: [s.active, s.expired, s.pending], backgroundColor: ["#16a34a", "#dc2626", "#d97706"] }] },
      options: { maintainAspectRatio: false },
    }),
  ];
}
async function userPage() {
  ({ users } = await get("/admin/users"));
  root.innerHTML = `${heading("Institute users", "Search, review, and administer tenant accounts.", '<button class="btn btn-primary" id="export">Export CSV</button>')}<div class="toolbar"><input id="search" placeholder="Search owner, email or institute"><select id="filter"><option value="">All statuses</option><option>active</option><option>pending_payment</option><option>expired</option><option>blocked</option></select></div><div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Owner</th><th>Institute</th><th>Email</th><th>Verified</th><th>Account</th><th>Subscription</th><th>Expiry</th><th>Paid</th><th>Actions</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;
  const draw = () => {
    const q = $("#search").value.toLowerCase(),
      f = $("#filter").value;
    $("#rows").innerHTML = users
      .filter((u) => (!q || `${u.fullName} ${u.email} ${u.instituteName}`.toLowerCase().includes(q)) && (!f || u.accountStatus === f))
      .map(
        (u) =>
          `<tr><td>${escapeHTML(u.fullName)}</td><td>${escapeHTML(u.instituteName)}</td><td>${escapeHTML(u.email)}</td><td>${u.emailVerified ? "Verified" : "Unverified"}</td><td>${status(u.accountStatus)}</td><td>${status(u.subscription?.status || "none")}</td><td>${date(u.subscription?.expiresAt)}</td><td>${money(u.amountPaid)}</td><td><div class="actions"><button class="icon-button" data-action="details" data-id="${u._id}">View</button><button class="icon-button" data-action="toggle" data-id="${u._id}">${u.accountStatus === "blocked" ? "Unblock" : "Block"}</button><button class="icon-button" data-action="extend" data-id="${u._id}">Extend</button><button class="icon-button" data-action="delete" data-id="${u._id}">Delete</button></div></td></tr>`,
      )
      .join("");
  };
  draw();
  $("#search").oninput = draw;
  $("#filter").onchange = draw;
  $("#export").onclick = () =>
    csv(
      [
        "Owner,Institute,Email,Account,Subscription,Expiry,Amount",
        ...users.map((u) => [u.fullName, u.instituteName, u.email, u.accountStatus, u.subscription?.status, date(u.subscription?.expiresAt), u.amountPaid].join(",")),
      ],
      "users.csv",
    );
}
async function detail(id) {
  const d = await get(`/admin/users/${id}`),
    u = d.user;
  modal.innerHTML = `<div class="modal-body"><button class="icon-button" style="float:right" id="close">×</button><span class="tag">ACCOUNT DETAIL</span><h2>${escapeHTML(u.instituteName)}</h2><p>${escapeHTML(u.fullName)} · ${escapeHTML(u.email)} · ${escapeHTML(u.mobile)}</p><div class="receipt-row"><span>Account status</span>${status(u.accountStatus)}</div><div class="receipt-row"><span>Subscription</span>${status(d.subscription?.status || "none")}</div><div class="receipt-row"><span>Expires</span><strong>${date(d.subscription?.expiresAt)}</strong></div><div class="receipt-row"><span>Students</span><strong>${d.metrics.students}</strong></div><div class="receipt-row"><span>Classes</span><strong>${d.metrics.classes}</strong></div><div class="receipt-row"><span>Fee collection</span><strong>${money(d.metrics.collection)}</strong></div><h3>Administrative activity</h3>${d.activity.map((a) => `<div class="receipt-row"><span>${escapeHTML(a.action)}</span><small>${date(a.createdAt)}</small></div>`).join("") || '<div class="empty">No activity yet</div>'}</div>`;
  modal.showModal();
  $("#close").onclick = () => modal.close();
}
async function subscriptionPage() {
  ({ subscriptions } = await get("/admin/subscriptions"));
  root.innerHTML = `${heading("Subscriptions", "All institute access periods and statuses.", '<button class="btn btn-primary" id="export">Export CSV</button>')}<div class="card table-card"><div class="table-scroll"><table><thead><tr><th>User</th><th>Institute</th><th>Plan</th><th>Status</th><th>Amount</th><th>Start</th><th>Expiry</th><th>Days left</th></tr></thead><tbody>${subscriptions.map((s) => `<tr><td>${escapeHTML(s.userId?.fullName)}</td><td>${escapeHTML(s.userId?.instituteName)}</td><td>${escapeHTML(s.planName)}</td><td>${status(s.status)}</td><td>${money(s.amount)}</td><td>${date(s.startsAt)}</td><td>${date(s.expiresAt)}</td><td>${s.expiresAt ? Math.max(0, Math.ceil((new Date(s.expiresAt) - new Date()) / 86400000)) : "—"}</td></tr>`).join("")}</tbody></table></div></div>`;
  $("#export").onclick = () =>
    csv(
      [
        "User,Institute,Plan,Status,Amount,Start,Expiry",
        ...subscriptions.map((s) => [s.userId?.fullName, s.userId?.instituteName, s.planName, s.status, s.amount, date(s.startsAt), date(s.expiresAt)].join(",")),
      ],
      "subscriptions.csv",
    );
}
async function transactionPage() {
  ({ transactions } = await get("/admin/transactions"));
  root.innerHTML = `${heading("Transactions", "Server-verified subscription payment ledger.", '<button class="btn btn-primary" id="export">Export CSV</button>')}<div class="card table-card"><div class="table-scroll"><table><thead><tr><th>Transaction</th><th>Order</th><th>Payment</th><th>Institute</th><th>Amount</th><th>Status</th><th>Verified</th><th>Date</th></tr></thead><tbody>${transactions.map((t) => `<tr><td>${escapeHTML(t.transactionId)}</td><td>${escapeHTML(t.razorpayOrderId)}</td><td>${escapeHTML(t.razorpayPaymentId || "—")}</td><td>${escapeHTML(t.userId?.instituteName)}</td><td>${money(t.amount)}</td><td>${status(t.status)}</td><td>${t.signatureVerified ? "Yes" : "No"}</td><td>${date(t.createdAt)}</td></tr>`).join("")}</tbody></table></div></div>`;
  $("#export").onclick = () =>
    csv(
      [
        "Transaction,Order,Payment,Institute,Amount,Status,Verified,Date",
        ...transactions.map((t) => [t.transactionId, t.razorpayOrderId, t.razorpayPaymentId, t.userId?.instituteName, t.amount, t.status, t.signatureVerified, date(t.createdAt)].join(",")),
      ],
      "transactions.csv",
    );
}
function csv(rows, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" }));
  a.download = name;
  a.click();
}
async function route() {
  const page = location.hash.slice(1) || "overview";
  $$(".side-link").forEach((x) => x.classList.toggle("active", x.dataset.page === page));
  try {
    if (page === "overview") await overview();
    if (page === "users") await userPage();
    if (page === "subscriptions") await subscriptionPage();
    if (page === "transactions") await transactionPage();
  } catch (e) {
    root.innerHTML = `<div class="card empty"><h3>Admin data unavailable</h3><p>${escapeHTML(e.message)}</p></div>`;
  }
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const u = users.find((x) => x._id === b.dataset.id);
  if (b.dataset.action === "details") detail(b.dataset.id);
  if (b.dataset.action === "toggle") {
    await patch(`/admin/users/${b.dataset.id}/status`, { status: u.accountStatus === "blocked" ? "active" : "blocked" });
    toast("Account status updated");
    userPage();
  }
  if (b.dataset.action === "extend") {
    const days = prompt("Extend subscription by how many days?", "30");
    if (days) {
      await post(`/admin/users/${b.dataset.id}/extend`, { days: Number(days) });
      toast("Subscription extended");
      userPage();
    }
  }
  if (b.dataset.action === "delete" && confirm("Delete this institute and all tenant data?")) {
    await del(`/admin/users/${b.dataset.id}`);
    toast("Account deleted");
    userPage();
  }
});
window.addEventListener("hashchange", route);
$("#menu").onclick = () => $("#sidebar").classList.add("open");
$("#overlay").onclick = () => $("#sidebar").classList.remove("open");
$("#logout").onclick = async () => {
  await post("/auth/logout", {});
  location.href = "/login";
};
route();
