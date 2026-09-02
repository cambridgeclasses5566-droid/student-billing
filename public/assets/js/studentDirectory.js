import { get, del, patch } from "./api.js";
import { escapeHTML, money } from "./ui.js";
import { studentProfileRoute } from "./navigation.js";
import { renderPaymentStatusBadge } from "./paymentStatus.js";
import { studentMobileCard, mobileEmpty } from "./mobileUI.js";

/* =========================
   Student Directory Styles 
========================== */

if (!document.querySelector("link[data-student-directory]")) {
  const link = document.createElement("link");

  link.rel = "stylesheet";
  link.href = "/assets/css/student-directory.css";
  link.dataset.studentDirectory = "true";

  document.head.append(link);
}

/* =========================
   Helpers
========================== */

const debounce = (fn, delay = 300) => {
  let timer;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
};

/* =========================
   Student Directory
========================== */

export async function renderStudentDirectory(root, mode = "all") {
  const { classes } = await get("/classes?active=true");

  let page = 1;
  let token = 0;

  const standards = [...new Set(classes.map((item) => item.standard))];

  const years = [...new Set(classes.map((item) => item.academicYear))];

  /* =========================
     Page Layout
  ========================== */

  root.innerHTML = `
    <header class="page-header mobile-page-header">
      <div>
        <p class="eyebrow">
          STUDENT DIRECTORY
        </p>

        <div class="mobile-title-row">
          <h1>
            ${mode === "pending" ? "Pending fees" : "Students"}
          </h1>

          <a
            class="btn btn-primary"
            href="#add-student"
          >
            + Add Student
          </a>
        </div>

        <p>
          ${mode === "pending" ? "Outstanding accounts requiring attention." : "Search and manage institute student records."}
        </p>
      </div>

      <a
        class="btn btn-primary desktop-page-action"
        href="#add-student"
      >
        + Add Student
      </a>
    </header>


    <div class="student-directory-filters mobile-filter-panel">

      <input
        id="directorySearch"
        type="search"
        placeholder="Search name, ID, mobile, parent, or email"
      >


      <select id="directoryStandard">
        <option value="">
          All standards
        </option>

        ${standards
          .map(
            (standard) => `
              <option>
                ${escapeHTML(standard)}
              </option>
            `,
          )
          .join("")}
      </select>


      <select id="directoryClass">
        <option value="">
          All classes
        </option>
      </select>


      <select id="directoryFee">
        <option value="">
          All fee statuses
        </option>

        <option>Paid</option>
        <option>Partially Paid</option>
        <option>Unpaid</option>
      </select>


      <select id="directoryYear">
        <option value="">
          All academic years
        </option>

        ${years
          .map(
            (year) => `
              <option>
                ${escapeHTML(year)}
              </option>
            `,
          )
          .join("")}
      </select>


     <select id="directoryEnrollment">
  <option value="">
    All students
  </option>

  <option value="active">
    Actively enrolled
  </option>

  <option value="unassigned">
    Unassigned
  </option>

  <option value="archived">
    Archived students
  </option>
</select>


      <button
        class="btn btn-ghost"
        id="directoryClear"
      >
        Clear All
      </button>

    </div>


    <div class="directory-summary mobile-results-head">

      <strong id="directoryCount">
        Loading...
      </strong>

      <span
        class="mobile-sort-chip"
        aria-label="Sorted by student name"
      >
        ⇅ Name
      </span>

      <div
        id="directoryChips"
        class="active-filter-chips"
      ></div>

    </div>


    <div
      id="directoryMobileRows"
      class="mobile-record-list"
      aria-live="polite"
    ></div>


    <div class="card table-card desktop-data-view">

      <div class="table-scroll">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Class / Batch</th>
              <th>Mobile</th>
              <th>Payable</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="directoryRows">
            <tr>
              <td
                colspan="9"
                class="empty"
              >
                Loading students...
              </td>
            </tr>
          </tbody>

        </table>

      </div>

    </div>


    <footer class="directory-pagination mobile-pagination">

      <select
        id="directoryLimit"
        aria-label="Rows per page"
      >
        <option>25</option>
        <option>50</option>
        <option>100</option>
      </select>


      <button
        class="btn btn-secondary"
        id="directoryPrev"
      >
        Previous
      </button>


      <span id="directoryPage"></span>


      <button
        class="btn btn-secondary"
        id="directoryNext"
      >
        Next
      </button>

    </footer>
  `;

  /* =========================
     Controls
  ========================== */

  const controls = {
    search: root.querySelector("#directorySearch"),

    standard: root.querySelector("#directoryStandard"),

    classId: root.querySelector("#directoryClass"),

    feeStatus: root.querySelector("#directoryFee"),

    academicYear: root.querySelector("#directoryYear"),

    enrollmentStatus: root.querySelector("#directoryEnrollment"),

    limit: root.querySelector("#directoryLimit"),
  };

  /* =========================
     Class Filter
  ========================== */

  const fillClasses = () => {
    const previous = controls.classId.value;

    const rows = classes.filter((item) => !controls.standard.value || item.standard === controls.standard.value);

    controls.classId.innerHTML =
      `
      <option value="">
        All classes
      </option>
    ` +
      rows
        .map(
          (item) => `
            <option value="${item._id}">
              ${escapeHTML(item.name)}
            </option>
          `,
        )
        .join("");

    const previousExists = [...controls.classId.options].some((option) => option.value === previous);

    controls.classId.value = previousExists ? previous : "";
  };

  /* =========================
     Active Filter Chips
  ========================== */

  const chips = () => {
    const filterLabels = [
      ["standard", "Standard"],
      ["classId", "Class"],
      ["feeStatus", "Fees"],
      ["academicYear", "Year"],
      ["enrollmentStatus", "Enrollment"],
    ];

    const labels = filterLabels
      .filter(([key]) => controls[key].value)
      .map(
        ([key, label]) => `
          <button data-clear="${key}">
            ${label}:
            ${escapeHTML(controls[key].selectedOptions[0].textContent)}
            ×
          </button>
        `,
      );

    root.querySelector("#directoryChips").innerHTML = labels.join("");

    root.querySelectorAll("[data-clear]").forEach((button) => {
      button.onclick = () => {
        controls[button.dataset.clear].value = "";

        page = 1;

        load();
      };
    });
  };

  /* =========================
     Load Students
  ========================== */

  const load = async () => {
    const current = ++token;

    const query = new URLSearchParams({
      page,
      limit: controls.limit.value,
      sort: "name",
    });

    Object.entries(controls).forEach(([key, control]) => {
      if (key !== "limit" && control.value.trim()) {
        query.set(key, control.value.trim());
      }
    });

    if (mode === "pending" && !controls.feeStatus.value) {
      query.set("feeStatus", "Unpaid");
    }

    try {
      const data = await get(`/billing/students?${query}`);

      if (current !== token) {
        return;
      }

      /* Desktop Table */

      root.querySelector("#directoryRows").innerHTML =
        data.students
          .map(
            (student) => `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(student.studentId)}
                  </strong>
                </td>

                <td>
                  ${escapeHTML(student.name)}
                </td>

                <td>
                  ${escapeHTML(student.currentClass?.name || "Unassigned")}
                </td>

                <td>
                  ${escapeHTML(student.mobile || "—")}
                </td>

                <td>
                  ${money((student.finalPayablePaise ?? 0) / 100)}
                </td>

                <td>
                  ${money(student.totalPaid)}
                </td>

                <td>
                  <strong>
                    ${money(student.remaining)}
                  </strong>
                </td>

                <td>
                  ${renderPaymentStatusBadge(student.status)}
                </td>

                <td>
                <div class="student-actions">
                  <a
                    class="btn btn-primary btn-small"
                    href="${studentProfileRoute(student._id, "students")}"
                  >
                    Open
                  </a>
  ${
    mode !== "pending"
      ? `
  <div class="student-menu-wrap">

    <button
      type="button"
      class="student-menu-btn"
      data-student-menu="${student._id}"
      aria-label="Student actions"
      aria-expanded="false"
    >
      ⋮
    </button>

    <div
      class="student-menu"
      data-student-menu-panel="${student._id}"
      hidden
    >
      <button
        type="button"
        class="${controls.enrollmentStatus.value === "archived" ? "student-restore-menu-item" : "student-delete-menu-item"}"
        data-student-id="${student._id}"
        data-student-name="${escapeHTML(student.name)}"
        data-student-code="${escapeHTML(student.studentId)}"
      >
        ${controls.enrollmentStatus.value === "archived" ? "Restore Student" : "Delete Student"}
      </button>
    </div>

  </div>
`
      : ""
  }

  </div>
                </td>

              </tr>
            `,
          )
          .join("") ||
        `
          <tr>
            <td
              colspan="9"
              class="empty"
            >
              No students match these filters.
            </td>
          </tr>
        `;

      /* Mobile Cards */

      root.querySelector("#directoryMobileRows").innerHTML =
        data.students
          .map((student) =>
            studentMobileCard(student, {
              pending: mode === "pending",

              href: studentProfileRoute(student._id, "students"),
              archived: controls.enrollmentStatus.value === "archived",
            }),
          )
          .join("") || mobileEmpty("No matching students", "Try changing or clearing the current filters.");

      /* Pagination */

      root.querySelector("#directoryCount").textContent = `${data.pagination.total} Students`;

      root.querySelector("#directoryPage").textContent = `Page ${data.pagination.page} of ${data.pagination.pages}`;

      root.querySelector("#directoryPrev").disabled = data.pagination.page <= 1;

      root.querySelector("#directoryNext").disabled = data.pagination.page >= data.pagination.pages;

      chips();
    } catch (error) {
      if (current === token) {
        root.querySelector("#directoryRows").innerHTML = `
          <tr>
            <td
              colspan="9"
              class="empty"
            >
              ${escapeHTML(error.message)}
            </td>
          </tr>
        `;

        root.querySelector("#directoryMobileRows").innerHTML = mobileEmpty("Students could not be loaded", error.message);
      }
    }
  };

  /* =========================
     Event Listeners
  ========================== */

  fillClasses();

  controls.search.oninput = debounce(() => {
    page = 1;
    load();
  });

  controls.standard.onchange = () => {
    fillClasses();

    page = 1;

    load();
  };

  Object.entries(controls)
    .filter(([key]) => !["search", "standard"].includes(key))
    .forEach(([, control]) => {
      control.onchange = () => {
        page = 1;
        load();
      };
    });

  root.querySelector("#directoryPrev").onclick = () => {
    page--;
    load();
  };

  root.querySelector("#directoryNext").onclick = () => {
    page++;
    load();
  };

  root.querySelector("#directoryClear").onclick = () => {
    Object.entries(controls).forEach(([key, control]) => {
      if (key !== "limit") {
        control.value = "";
      }
    });

    fillClasses();

    page = 1;

    load();
  };
  /* =========================
   Student Action Menu
========================== */

  root.onclick = async (event) => {
    const restoreButton = event.target.closest(".student-restore-menu-item");

    if (restoreButton) {
      event.preventDefault();
      event.stopPropagation();

      const studentId = restoreButton.dataset.studentId;
      const studentName = restoreButton.dataset.studentName || "this student";

      const confirmed = window.confirm(`Restore ${studentName} to the active students list?`);

      if (!confirmed) return;

      try {
        await patch(`/billing/students/${studentId}/restore`);

        window.alert("Student restored successfully.");

        page = 1;
        await load();
      } catch (error) {
        window.alert(error.message || "Student could not be restored.");
      }

      return;
    }

    /* =========================
     Delete Student
  ========================== */

    const deleteButton = event.target.closest(".student-delete-menu-item");

    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();

      const studentId = deleteButton.dataset.studentId;
      const studentName = deleteButton.dataset.studentName || "this student";
      const studentCode = deleteButton.dataset.studentCode || "";

      console.log("Delete clicked:", {
        studentId,
        studentName,
        studentCode,
      });

      const confirmed = window.confirm(`Delete ${studentName}${studentCode ? ` (${studentCode})` : ""}?\n\n` + `Students with payment or receipt history cannot be permanently deleted.`);

      if (!confirmed) return;

      try {
        await del(`/billing/students/${studentId}`);

        window.alert("Student deleted successfully.");

        page = 1;
        await load();
      } catch (error) {
        if (error.status === 409) {
          const archiveInstead = window.confirm(`${error.message}\n\nWould you like to archive ${studentName} instead?`);

          if (!archiveInstead) return;

          try {
            await patch(`/billing/students/${studentId}/archive`);

            window.alert("Student archived successfully.");

            page = 1;
            await load();
          } catch (archiveError) {
            window.alert(archiveError.message || "Student could not be archived.");
          }

          return;
        }

        window.alert(error.message || "Student could not be deleted.");
      }

      return;
    }

    /* =========================
     Open / Close 3-dot Menu
  ========================== */

    const menuButton = event.target.closest(".student-menu-btn");

    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();

      const menuWrap = menuButton.closest(".student-menu-wrap");

      const menu = menuWrap?.querySelector(".student-menu");

      if (!menu) return;
      const buttonRect = menuButton.getBoundingClientRect();

      menu.style.top = `${buttonRect.bottom + 6}px`;
      menu.style.right = `${window.innerWidth - buttonRect.right}px`;

      root.querySelectorAll(".student-menu").forEach((otherMenu) => {
        if (otherMenu !== menu) {
          otherMenu.hidden = true;
        }
      });

      root.querySelectorAll(".student-menu-btn").forEach((button) => {
        if (button !== menuButton) {
          button.setAttribute("aria-expanded", "false");
        }
      });

      const shouldOpen = menu.hidden;

      menu.hidden = !shouldOpen;

      menuButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

      return;
    }

    /* =========================
     Click Outside
  ========================== */

    if (!event.target.closest(".student-menu")) {
      root.querySelectorAll(".student-menu").forEach((menu) => {
        menu.hidden = true;
      });

      root.querySelectorAll(".student-menu-btn").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
    }
  };

  /* Initial Load */

  load();
}
