import { get, post, del } from "./api.js";
import { escapeHTML, money, toast, busy, closeIconSVG } from "./ui.js";
import { openModal, closeModal } from "./modalManager.js";
import { renderBackButton, bindBackButtons, studentProfileRoute, classProfileRoute } from "./navigation.js";
import { studentInitials, avatarTone } from "./mobileUI.js";

/* =========================
   Class Student Management CSS
========================== */

if (!document.querySelector("link[data-class-student-management]")) {
  const link = document.createElement("link");

  link.rel = "stylesheet";
  link.href = "/assets/css/classStudentManagement.css";
  link.dataset.classStudentManagement = "true";

  document.head.append(link);
}

/* =========================
   Shared State
========================== */

let root;
let classId;
let profile;
let tab = "overview";

/* =========================
   Render Class Profile
========================== */

export async function renderClassProfile(target, params) {
  root = target;

  classId = params.get("id");

  tab = params.get("tab") || "overview";

  if (!classId) {
    root.innerHTML = `
      <div class="card empty">
        Class not selected.
      </div>
    `;

    return;
  }

  try {
    profile = await get(`/classes/${classId}/profile`);

    renderShell();
  } catch (error) {
    root.innerHTML = `
      <div class="card empty">

        <h2>
          Class could not be loaded
        </h2>

        <p>
          ${escapeHTML(error.message)}
        </p>

      </div>
    `;
  }
}

/* =========================
   Destroy Class Profile
========================== */

export function destroyClassProfile() {
  root = null;
  classId = null;
  profile = null;
  tab = "overview";
}

/* =========================
   Render Main Shell
========================== */

function renderShell() {
  const currentClass = profile.class;

  const tabs = ["overview", "students", "fees", "settings"];

  root.innerHTML = `
    <section
      class="academic-page class-profile-page"
    >

      ${renderBackButton({
        fallbackRoute: "#classes",

        label: "Back to Classes",
      })}


      <header
        class="page-header class-profile-mobile-head"
      >

        <div>

          <p class="eyebrow">
            CLASS / BATCH PROFILE
          </p>

          <h1>
            ${escapeHTML(currentClass.name)}
          </h1>

          <p>
            Standard
            ${escapeHTML(currentClass.standard)}
            · Division
            ${escapeHTML(currentClass.division)}
            ·
            ${escapeHTML(currentClass.academicYear)}
          </p>

        </div>


        <a
          class="
            btn
            btn-secondary
            mobile-profile-download
          "
          href="/api/billing/classes/${classId}/students.csv"
        >
          Download CSV
        </a>

      </header>


      <nav
        class="tabs profile-tabs"
        role="tablist"
      >

        ${tabs
          .map(
            (name) => `
              <a
                role="tab"
                aria-selected="${name === tab}"
                class="${name === tab ? "active" : ""}"
                href="#class-profile?id=${classId}&tab=${name}"
              >
                ${name[0].toUpperCase() + name.slice(1)}
              </a>
            `,
          )
          .join("")}

      </nav>


      <div
        id="classTab"
        class="class-profile-content"
      ></div>

    </section>
  `;

  bindBackButtons(root);

  renderTab();
}

/* =========================
   Refresh Students Tab
========================== */

async function refreshStudentsTab() {
  profile = await get(`/classes/${classId}/profile`);

  renderShell();
}

/* =========================
   Render Active Tab
========================== */

async function renderTab() {
  const target = root.querySelector("#classTab");

  const currentClass = profile.class;

  const summary = profile.summary;

  /* =========================
     Overview Tab
  ========================== */

  if (tab === "overview") {
    target.innerHTML = `
      <div class="kpis">

        ${[
          ["Students", summary.studentCount],
          ["Expected fees", money(summary.expected)],
          ["Collected", money(summary.collected)],
          ["Pending", money(summary.pending)],
        ]
          .map(
            ([label, value]) => `
              <article
                class="card kpi"
              >
                <small>
                  ${label}
                </small>

                <strong>
                  ${value}
                </strong>
              </article>
            `,
          )
          .join("")}

      </div>


      <div class="card panel">

        <h2>
          Class details
        </h2>


        ${[
          ["Batch", currentClass.batchName || "—"],
          ["Timing", `${currentClass.startTime || "—"} – ${currentClass.endTime || "—"}`],
          ["Class teacher", currentClass.classTeacherName || "Not assigned"],
          ["Capacity", currentClass.capacity || "Not set"],
        ]
          .map(
            ([label, value]) => `
              <div class="receipt-row">

                <span>
                  ${label}
                </span>

                <strong>
                  ${escapeHTML(value)}
                </strong>

              </div>
            `,
          )
          .join("")}

      </div>
    `;

    return;
  }

  /* =========================
     Students Tab
  ========================== */

  if (tab === "students") {
    const data = await get(`/classes/${classId}/students`);

    const actions = studentActions();

    target.innerHTML = `
      <header
        class="section-header class-student-header"
      >

        <div>

          <h2>
            Enrolled Students
          </h2>

          <p>
            ${data.students.length}
            student${data.students.length === 1 ? "" : "s"}
          </p>

        </div>

        ${data.students.length ? actions : ""}

      </header>

      ${renderStudents(data.students)}
    `;

    bindStudentActions();
    bindRemove();
    bindOverflowMenus();

    return;
  }

  /* =========================
     Fees Tab
  ========================== */

  if (tab === "fees") {
    const data = await get(`/classes/${classId}/financial-summary`);

    target.innerHTML = `
      <div class="kpis">

        ${[
          ["Expected", data.expected],
          ["Collected", data.collected],
          ["Pending", data.pending],
        ]
          .map(
            ([label, amount]) => `
              <article
                class="card kpi"
              >

                <small>
                  ${label}
                </small>

                <strong>
                  ${money(amount)}
                </strong>

              </article>
            `,
          )
          .join("")}

      </div>


      <a
        class="btn btn-primary"
        href="#students"
      >
        Open Student Billing
      </a>
    `;

    return;
  }

  /* =========================
     Settings Tab
  ========================== */

  target.innerHTML = `
    <div class="card panel">

      <h2>
        Class settings
      </h2>

      <p>
        Edit this class from
        the Classes page.
      </p>

      <a
        class="btn btn-secondary"
        href="#classes"
      >
        Back to Classes
      </a>

    </div>
  `;
}

/* =========================
   Student Actions
========================== */

function studentActions({ empty = false } = {}) {
  return `
    <div
      class="class-student-actions${empty ? " empty-actions" : ""}"
    >

      <button
        class="btn btn-primary"
        type="button"
        data-add-existing
      >
        + Add Existing Student
      </button>


      <a
        class="btn btn-secondary"
        href="#add-student?classId=${classId}&returnTo=class-profile"
      >
        Create New Student
      </a>


      <a
        class="btn btn-secondary"
        href="/api/billing/classes/${classId}/students.csv"
      >
        Download CSV
      </a>

    </div>
  `;
}

/* =========================
   Render Students
========================== */

function renderStudents(rows) {
  if (!rows.length) {
    return `
      <div
        class="
          card
          empty
          class-student-empty
        "
      >

        <h2>
          No students assigned yet
        </h2>

        <p>
          Add an existing student
          or create a new student.
        </p>

        ${studentActions({
          empty: true,
        })}

      </div>
    `;
  }

  /* =========================
     Mobile Student Cards
  ========================== */

  const cards = rows
    .map((row) => {
      const student = row.student || {};

      const billing = row.billing || {};

      const status = billing.status || row.feeStatus || "Unpaid";

      return `
        <article
          class="
            mobile-record-card
            class-student-mobile-card
          "
        >

          <header>

            <span
              class="
                mobile-avatar
                tone-${avatarTone(student.name)}
              "
            >
              ${studentInitials(student.name)}
            </span>


            <div>

              <small>
                ${escapeHTML(student.studentId)}
              </small>

              <h2>
                ${escapeHTML(student.name)}
              </h2>

              <p>
                ☎
                ${escapeHTML(student.mobile || "No mobile")}
              </p>

            </div>


            <span
              class="
                mobile-status
                status-${String(status).toLowerCase().replace(/\s+/g, "-")}
              "
            >
              ${escapeHTML(status)}
            </span>

          </header>


          <div
            class="mobile-money-grid"
          >

            <div>

              <strong>
                ${money(billing.finalPayableFees || 0)}
              </strong>

              <small>
                Payable
              </small>

            </div>


            <div>

              <strong>
                ${money(billing.totalPaid || 0)}
              </strong>

              <small>
                Paid
              </small>

            </div>


            <div class="is-due">

              <strong>
                ${money(billing.remainingAmount || 0)}
              </strong>

              <small>
                Remaining
              </small>

            </div>

          </div>


          <footer>

            <a
              class="mobile-open-action"
              href="${studentProfileRoute(student._id, classProfileRoute(classId).slice(1))}"
            >
              Open profile
              <span>›</span>
            </a>


            <button
              type="button"
              class="mobile-remove-action"
              data-remove="${row._id}"
              data-name="${escapeHTML(student.name)}"
            >
              Remove
            </button>

          </footer>

        </article>
      `;
    })
    .join("");

  /* =========================
     Desktop Student Table
  ========================== */

  const tableRows = rows
    .map((row) => {
      const student = row.student;

      const billing = row.billing || {};

      return `
        <tr>

          <td>
            ${escapeHTML(student?.studentId)}
          </td>


          <td>
            <strong>
              ${escapeHTML(student?.name)}
            </strong>
          </td>


          <td>
            ${escapeHTML(student?.mobile || "—")}
          </td>


          <td>
            ${money(billing.finalPayableFees || 0)}
          </td>


          <td>
            ${money(billing.totalPaid || 0)}
          </td>


          <td>
            ${money(billing.remainingAmount || 0)}
          </td>


          <td>
            ${escapeHTML(billing.status || row.feeStatus)}
          </td>


          <td>

            <div
              class="student-row-actions"
            >

              <a
                class="
                  btn
                  btn-primary
                  btn-small
                "
                href="${studentProfileRoute(student?._id, classProfileRoute(classId).slice(1))}"
              >
                Open
              </a>


              <details
                class="overflow-menu"
              >

                <summary
                  class="icon-button"
                  aria-label="More actions for ${escapeHTML(student?.name)}"
                >
                  ⋮
                </summary>


                <div role="menu">

                  <button
                    type="button"
                    role="menuitem"
                    class="danger-menu-item"
                    data-remove="${row._id}"
                    data-name="${escapeHTML(student?.name)}"
                  >
                    Remove from Class
                  </button>

                </div>

              </details>

            </div>

          </td>

        </tr>
      `;
    })
    .join("");

  return `
    <div
      class="
        mobile-record-list
        class-student-mobile-list
      "
    >
      ${cards}
    </div>


<div
  class="
    card
    table-card
    desktop-data-view
    class-student-table
  "
>

      <div class="table-scroll">

        <table>

          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student</th>
              <th>Mobile</th>
              <th>Payable</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>


          <tbody>
            ${tableRows}
          </tbody>

        </table>

      </div>

    </div>
  `;
}

/* =========================
   Bind Student Actions
========================== */

function bindStudentActions() {
  root.querySelectorAll("[data-add-existing]").forEach((button) => {
    button.onclick = () => openExistingStudentDialog(button);
  });
}

function bindOverflowMenus() {
  const menus = root.querySelectorAll(".overflow-menu");

  menus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;

      menus.forEach((otherMenu) => {
        if (otherMenu !== menu) {
          otherMenu.open = false;
        }
      });
    });
  });

  document.onclick = (event) => {
    if (event.target.closest(".overflow-menu")) {
      return;
    }

    menus.forEach((menu) => {
      menu.open = false;
    });
  };
}

/* =========================
   Existing Student Dialog
========================== */

async function openExistingStudentDialog(trigger) {
  try {
    const data = await get(`/classes/${classId}/eligible-students`);

    const students = data.students || [];

    const content = `
      <form
        class="
          form-dialog
          student-assignment-dialog
        "
        id="existingStudentForm"
        aria-labelledby="existing-student-title"
      >

        <header
          class="dialog-header"
        >

          <div
            class="dialog-title"
          >

            <span
              class="dialog-icon"
              aria-hidden="true"
            >
              +
            </span>


            <div>

              <span
                class="dialog-tag"
              >
                CLASS MEMBERSHIP
              </span>

              <h2
                id="existing-student-title"
              >
                Add student to
                ${escapeHTML(profile.class.name)}
              </h2>

              <p>
                Choose one or more
                existing students.
                Students already in
                this class are excluded.
              </p>

            </div>

          </div>


          <button
            type="button"
            class="dialog-close"
            data-dialog-close
            aria-label="Close"
          >
            ${closeIconSVG}
          </button>

        </header>


        <div class="dialog-body">

          <section
            data-student-picker
          >

            <label
              class="student-picker-search"
            >
              Search students

              <input
                id="existingStudentSearch"
                type="search"
                placeholder="Search students by name or student ID..."
                autocomplete="off"
              >
            </label>


            <div
              class="eligible-summary"
            >

              <span
                id="eligibleCount"
              >
                ${students.length}
                available
              </span>

              <span>
                Matching standard
                and academic year
                appear first.
              </span>

            </div>


            <div
              class="student-picker-list"
              id="eligibleStudentList"
            ></div>

          </section>


          <section
            class="transfer-confirmation"
            data-transfer-confirmation
            hidden
          ></section>

        </div>


        <footer
          class="dialog-footer"
        >

          <span
            id="studentSelectionSummary"
          >
            No students selected
          </span>


          <div>

            <button
              type="button"
              class="btn btn-secondary"
              data-dialog-close
            >
              Cancel
            </button>


            <button
              type="submit"
              class="btn btn-primary"
              id="addSelectedStudents"
              disabled
            >
              Add Students
            </button>

          </div>

        </footer>

      </form>
    `;

    openModal({
      content,
      size: "large",
      trigger,
      preventBackdropClose: true,

      onOpen: (dialog) => bindExistingStudentDialog(dialog, students),
    });
  } catch (error) {
    toast(error.message, "error");
  }
}

/* =========================
   Bind Student Picker Dialog
========================== */

function bindExistingStudentDialog(dialog, students) {
  const form = dialog.querySelector("#existingStudentForm");

  const search = dialog.querySelector("#existingStudentSearch");

  const list = dialog.querySelector("#eligibleStudentList");

  const count = dialog.querySelector("#eligibleCount");

  let submit = dialog.querySelector("#addSelectedStudents");

  const summary = dialog.querySelector("#studentSelectionSummary");

  const selected = new Set();

  let confirmationPending = false;

  /* =========================
     Draw Student Picker
  ========================== */

  const draw = () => {
    const query = search.value.trim().toLowerCase();

    const visible = students.filter((student) => !query || `${student.name} ${student.studentId} ${student.mobile || ""}`.toLowerCase().includes(query));

    count.textContent = `${visible.length} available`;

    list.innerHTML =
      visible
        .map(
          (student) => `
            <label
              class="
                student-picker-row${student.matchesClass ? " recommended" : ""}
              "
            >

              <input
                type="checkbox"
                value="${student._id}"
                ${selected.has(String(student._id)) ? "checked" : ""}
              >


              <span
                class="student-picker-copy"
              >

                <strong>
                  ${escapeHTML(student.name)}
                </strong>


                <small>
                  ${escapeHTML(student.studentId)}
                  · Standard
                  ${escapeHTML(student.standard)}
                  · Division
                  ${escapeHTML(student.division)}
                </small>


                <small>
                  ${escapeHTML(student.mobile || "No mobile number")}

                  ${student.currentClass ? ` · Currently in ${escapeHTML(student.currentClass.name || "another class")}` : " · Not currently assigned"}
                </small>

              </span>


              ${
                student.matchesClass
                  ? `
                    <span
                      class="match-chip"
                    >
                      Best match
                    </span>
                  `
                  : ""
              }

            </label>
          `,
        )
        .join("") ||
      `
        <div
          class="empty compact"
        >

          <h3>
            No eligible students found
          </h3>

          <p>
            Try another search
            or create a new student
            for this class.
          </p>

        </div>
      `;

    list.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.onchange = () => {
        if (input.checked) {
          selected.add(input.value);
        } else {
          selected.delete(input.value);
        }

        updateSelection();
      };
    });
  };

  /* =========================
     Update Selection
  ========================== */

  const updateSelection = () => {
    const total = selected.size;

    summary.textContent = total ? `${total} student${total === 1 ? "" : "s"} selected` : "No students selected";

    submit.disabled = !total;

    submit.textContent = total ? `Add ${total} Student${total === 1 ? "" : "s"}` : "Add Students";
  };

  /* =========================
     Assign Students
  ========================== */

  const assign = async (transferStudents) => {
    try {
      busy(submit, true, transferStudents.length ? "Moving students..." : "Adding students...");

      const result = await post(`/classes/${classId}/enrollments/bulk`, {
        studentIds: [...selected],

        transferStudentIds: transferStudents.map((student) => String(student._id)),
      });

      closeModal({
        force: true,
      });

      await refreshStudentsTab();

      const enrolled = result.enrolled || [];

      toast(enrolled.length === 1 ? `${enrolled[0].name} added to ${profile.class.name}.` : `${enrolled.length} students added to ${profile.class.name}.`);
    } catch (error) {
      toast(error.message, "error");

      busy(submit, false);
    }
  };

  /* =========================
     Submit Student Selection
  ========================== */

  form.onsubmit = async (event) => {
    event.preventDefault();

    if (!selected.size || confirmationPending) {
      return;
    }

    const transfers = students.filter((student) => selected.has(String(student._id)) && student.transferRequired);

    if (!transfers.length) {
      await assign([]);

      return;
    }

    confirmationPending = true;

    dialog.querySelector("[data-student-picker]").hidden = true;

    const confirmation = dialog.querySelector("[data-transfer-confirmation]");

    confirmation.hidden = false;

    confirmation.innerHTML = `
        <div
          class="transfer-warning"
        >

          <span
            aria-hidden="true"
          >
            !
          </span>


          <div>

            <h3>
              ${transfers.length === 1 ? "Move this student?" : `Move ${transfers.length} students?`}
            </h3>


            <p>
              ${transfers
                .map(
                  (student) => `
                    <strong>
                      ${escapeHTML(student.name)}
                    </strong>
                    is currently assigned to
                    ${escapeHTML(student.currentClass?.name || "another class")}.
                  `,
                )
                .join("<br>")}
            </p>


            <p>
              Moving will end the
              current enrollment and
              assign
              ${transfers.length === 1 ? "the student" : "them"}
              to

              <strong>
                ${escapeHTML(profile.class.name)}
              </strong>.
            </p>

          </div>

        </div>


        <div
          class="transfer-actions"
        >

          <button
            type="button"
            class="btn btn-secondary"
            data-back-to-picker
          >
            Cancel
          </button>


          <button
            type="button"
            class="btn btn-primary"
            data-confirm-transfer
          >
            Move Student${transfers.length === 1 ? "" : "s"}
          </button>

        </div>
      `;

    submit.hidden = true;

    /* Back to Picker */

    confirmation.querySelector("[data-back-to-picker]").onclick = () => {
      confirmationPending = false;

      confirmation.hidden = true;

      dialog.querySelector("[data-student-picker]").hidden = false;

      submit.hidden = false;

      search.focus();
    };

    /* Confirm Transfer */

    confirmation.querySelector("[data-confirm-transfer]").onclick = async (event) => {
      submit.hidden = false;

      submit = event.currentTarget;

      await assign(transfers);
    };
  };

  /* =========================
     Search
  ========================== */

  search.oninput = draw;

  /* =========================
     Initial Render
  ========================== */

  draw();
  updateSelection();
}

/* =========================
   Remove Student
========================== */

function bindRemove() {
  root.querySelectorAll("[data-remove]").forEach((button) => {
    button.onclick = async () => {
      const confirmed = confirm(`Remove ${button.dataset.name} from this class? The student record and billing history will be preserved.`);

      if (!confirmed) {
        return;
      }

      try {
        await del(`/enrollments/${button.dataset.remove}`);

        toast("Student removed from class");

        await refreshStudentsTab();
      } catch (error) {
        toast(error.message, "error");
      }
    };
  });
}
