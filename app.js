/* ============================================================
   Riverbend Clinic — application logic
   Persistence: localStorage (key: "clinic_appointments")
   ============================================================ */

const STORAGE_KEY = "clinic_appointments";
const ADMIN_PASSCODE = "clinic2026";

// ---------- Storage helpers ----------
function getAppointments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAppointments(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  return "RB-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
}

// ---------- Date/time helpers ----------
function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLong(iso) {
  return isoToDate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function minutesToLabel(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function hourToMinutes(hour) {
  return Math.round(hour * 60);
}

// Build every slot (as minutes-from-midnight) for a doctor on a given weekday
function buildSlotsForDoctor(doctor) {
  const slots = [];
  const start = hourToMinutes(doctor.startHour);
  const end = hourToMinutes(doctor.endHour);
  const lunchStart = hourToMinutes(doctor.lunch[0]);
  const lunchEnd = hourToMinutes(doctor.lunch[1]);
  for (let t = start; t + doctor.slotMinutes <= end; t += doctor.slotMinutes) {
    if (t >= lunchStart && t < lunchEnd) continue;
    slots.push(t);
  }
  return slots;
}

function getBookedTimesFor(doctorId, dateISO) {
  return getAppointments()
    .filter(a => a.doctorId === doctorId && a.date === dateISO && a.status !== "cancelled")
    .map(a => a.time);
}

// ---------- Navigation ----------
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function switchView(name) {
  navButtons.forEach(b => b.classList.toggle("is-active", b.dataset.view === name));
  views.forEach(v => v.classList.toggle("is-active", v.id === `view-${name}`));
  if (name === "admin" && adminUnlocked) renderAdminDashboard();
}

// ============================================================
// BOOK VIEW
// ============================================================
let selectedDept = "All";
let selectedDoctor = null;
let selectedTime = null;
let rescheduleTargetId = null; // set when editing an existing appointment from "My Appointments"

const deptFilterEl = document.getElementById("deptFilter");
const doctorGridEl = document.getElementById("doctorGrid");
const panelEmpty = document.getElementById("panelEmpty");
const bookForm = document.getElementById("bookForm");
const selectedDoctorSummary = document.getElementById("selectedDoctorSummary");
const apptDateInput = document.getElementById("apptDate");
const dateHint = document.getElementById("dateHint");
const slotGrid = document.getElementById("slotGrid");
const apptTimeInput = document.getElementById("apptTime");
const formError = document.getElementById("formError");

function renderDeptFilter() {
  const chips = ["All", ...DEPARTMENTS];
  deptFilterEl.innerHTML = chips.map(dep =>
    `<button class="dept-chip ${dep === selectedDept ? "is-active" : ""}" data-dept="${dep}">${dep}</button>`
  ).join("");
  deptFilterEl.querySelectorAll(".dept-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      selectedDept = chip.dataset.dept;
      renderDeptFilter();
      renderDoctorGrid();
    });
  });
}

// Availability pulse: next 5 working days for this doctor, colored by openness
function pulseDots(doctor) {
  const days = [];
  let cursor = new Date();
  let guard = 0;
  while (days.length < 5 && guard < 30) {
    guard++;
    const iso = cursor.toISOString().slice(0, 10);
    if (doctor.workDays.includes(cursor.getDay())) {
      const total = buildSlotsForDoctor(doctor).length;
      const booked = getBookedTimesFor(doctor.id, iso).length;
      const openRatio = total === 0 ? 0 : (total - booked) / total;
      let level = "none";
      if (openRatio > 0.75) level = "high";
      else if (openRatio > 0.4) level = "mid";
      else if (openRatio > 0) level = "low";
      else level = "full";
      days.push(level);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function renderDoctorGrid() {
  const list = selectedDept === "All" ? DOCTORS : DOCTORS.filter(d => d.department === selectedDept);
  doctorGridEl.innerHTML = list.map(doc => {
    const dots = pulseDots(doc).map(level => `<span class="pulse-dot" data-level="${level}"></span>`).join("");
    return `
      <button class="doctor-card ${selectedDoctor && selectedDoctor.id === doc.id ? "is-selected" : ""}" data-doctor="${doc.id}">
        <div class="doctor-card-top">
          ${avatarMarkup(doc)}
          <div>
            <div class="doctor-name">${doc.name}</div>
            <div class="doctor-dept">${doc.department}</div>
          </div>
        </div>
        <p class="doctor-blurb">${doc.blurb}</p>
        <div class="pulse-row">
          <span class="pulse-label">Next 5 days</span>
          <span class="pulse-dots">${dots}</span>
        </div>
      </button>
    `;
  }).join("");

  doctorGridEl.querySelectorAll(".doctor-card").forEach(card => {
    card.addEventListener("click", () => selectDoctor(card.dataset.doctor));
  });
}

function selectDoctor(id) {
  selectedDoctor = DOCTORS.find(d => d.id === id);
  selectedTime = null;
  apptTimeInput.value = "";
  renderDoctorGrid();

  panelEmpty.classList.add("is-hidden");
  bookForm.classList.remove("is-hidden");

  selectedDoctorSummary.innerHTML = `
    ${avatarMarkup(selectedDoctor, "avatar-lg")}
    <div>
      <div class="selected-doctor-name">${selectedDoctor.name}</div>
      <div class="selected-doctor-dept">${selectedDoctor.department}</div>
    </div>
  `;

  apptDateInput.min = todayISO();
  apptDateInput.value = "";
  dateHint.textContent = `Works ${describeWorkDays(selectedDoctor.workDays)}`;
  slotGrid.innerHTML = `<p class="slot-placeholder">Choose a date to see open times.</p>`;
  formError.classList.remove("is-visible");
}

// Renders a doctor photo if available, falling back to initials if the
// image fails to load (or no photo is set).
function avatarMarkup(doctor, extraClass = "") {
  const initialsSpan = `<span class="avatar-fallback">${doctor.initials}</span>`;
  if (!doctor.photo) {
    return `<span class="avatar ${extraClass}">${initialsSpan}</span>`;
  }
  return `
    <span class="avatar ${extraClass}">
      <img src="${doctor.photo}" alt="${doctor.name}" loading="lazy"
           onerror="this.remove()">
      ${initialsSpan}
    </span>
  `;
}

function describeWorkDays(days) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map(d => names[d]).join(", ");
}

apptDateInput.addEventListener("change", () => {
  formError.classList.remove("is-visible");
  const iso = apptDateInput.value;
  if (!iso || !selectedDoctor) return;

  const date = isoToDate(iso);
  if (date < isoToDate(todayISO())) {
    slotGrid.innerHTML = "";
    showFormError("That date is in the past. Please choose an upcoming date.");
    return;
  }
  if (!selectedDoctor.workDays.includes(date.getDay())) {
    slotGrid.innerHTML = `<p class="slot-placeholder">${selectedDoctor.name} doesn't see patients on this day. They work ${describeWorkDays(selectedDoctor.workDays)}.</p>`;
    return;
  }

  renderSlotGrid(iso);
});

function renderSlotGrid(iso) {
  const allSlots = buildSlotsForDoctor(selectedDoctor);
  const booked = new Set(getBookedTimesFor(selectedDoctor.id, iso));
  selectedTime = null;
  apptTimeInput.value = "";

  if (allSlots.length === 0) {
    slotGrid.innerHTML = `<p class="slot-placeholder">No slots configured for this day.</p>`;
    return;
  }

  slotGrid.innerHTML = allSlots.map(mins => {
    const isBooked = booked.has(mins);
    return `<button type="button" class="slot-btn" data-mins="${mins}" ${isBooked ? "disabled" : ""}>${minutesToLabel(mins)}</button>`;
  }).join("");

  slotGrid.querySelectorAll(".slot-btn:not(:disabled)").forEach(btn => {
    btn.addEventListener("click", () => {
      slotGrid.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedTime = Number(btn.dataset.mins);
      apptTimeInput.value = String(selectedTime);
    });
  });
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.add("is-visible");
}

bookForm.addEventListener("submit", e => {
  e.preventDefault();
  formError.classList.remove("is-visible");

  const name = document.getElementById("patientName").value.trim();
  const email = document.getElementById("patientEmail").value.trim();
  const phone = document.getElementById("patientPhone").value.trim();
  const reason = document.getElementById("visitReason").value.trim();
  const date = apptDateInput.value;

  if (!selectedDoctor) return showFormError("Please select a doctor first.");
  if (!date) return showFormError("Please choose a date.");
  if (selectedTime === null) return showFormError("Please choose an available time slot.");
  if (!name) return showFormError("Please enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showFormError("Please enter a valid email address.");
  if (!/^[0-9+()\-\s]{7,}$/.test(phone)) return showFormError("Please enter a valid phone number.");

  // Re-check the slot hasn't just been taken (e.g. in another tab)
  const stillOpen = !getBookedTimesFor(selectedDoctor.id, date).includes(selectedTime);
  if (!stillOpen) {
    showFormError("That slot was just booked by someone else. Please pick another time.");
    renderSlotGrid(date);
    return;
  }

  const appointments = getAppointments();

  if (rescheduleTargetId) {
    const idx = appointments.findIndex(a => a.id === rescheduleTargetId);
    if (idx !== -1) {
      appointments[idx] = {
        ...appointments[idx],
        doctorId: selectedDoctor.id,
        department: selectedDoctor.department,
        date, time: selectedTime,
        status: "upcoming"
      };
    }
    saveAppointments(appointments);
    showToast("Appointment rescheduled.");
    rescheduleTargetId = null;
    showConfirmation(appointments[idx]);
  } else {
    const newAppt = {
      id: generateId(),
      patientName: name,
      email, phone, reason,
      doctorId: selectedDoctor.id,
      department: selectedDoctor.department,
      date, time: selectedTime,
      status: "upcoming",
      doctorApproved: false,
      createdAt: new Date().toISOString()
    };
    appointments.push(newAppt);
    saveAppointments(appointments);
    showConfirmation(newAppt);
  }

  bookForm.reset();
  panelEmpty.classList.remove("is-hidden");
  bookForm.classList.add("is-hidden");
  selectedDoctor = null;
  selectedTime = null;
  renderDoctorGrid();
});

// ---------- Confirmation modal ----------
const confirmModal = document.getElementById("confirmModal");
const modalDetails = document.getElementById("modalDetails");
const modalApptId = document.getElementById("modalApptId");
const modalCloseBtn = document.getElementById("modalCloseBtn");

function showConfirmation(appt) {
  const doctor = DOCTORS.find(d => d.id === appt.doctorId);
  modalDetails.innerHTML = `
    <div><b>${doctor.name}</b> — ${doctor.department}</div>
    <div>${formatDateLong(appt.date)} at ${minutesToLabel(appt.time)}</div>
    <div>${appt.patientName}</div>
  `;
  modalApptId.textContent = `Confirmation ID: ${appt.id}`;
  confirmModal.classList.remove("is-hidden");
}

modalCloseBtn.addEventListener("click", () => confirmModal.classList.add("is-hidden"));
confirmModal.addEventListener("click", e => { if (e.target === confirmModal) confirmModal.classList.add("is-hidden"); });

// ---------- Toast ----------
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("is-hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("is-hidden"), 2800);
}

// ============================================================
// MY APPOINTMENTS VIEW
// ============================================================
const lookupForm = document.getElementById("lookupForm");
const lookupValue = document.getElementById("lookupValue");
const lookupResults = document.getElementById("lookupResults");

lookupForm.addEventListener("submit", e => {
  e.preventDefault();
  const q = lookupValue.value.trim().toLowerCase();
  if (!q) return;
  const matches = getAppointments().filter(a =>
    a.email.toLowerCase() === q || a.phone.replace(/\s/g, "") === q.replace(/\s/g, "")
  ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  renderLookupResults(matches);
});

function computeStatus(appt) {
  if (appt.status === "cancelled") return "cancelled";
  if (appt.status === "completed") return "completed";
  const apptDateTime = isoToDate(appt.date).getTime() + appt.time * 60000;
  return apptDateTime < Date.now() ? "completed" : "upcoming";
}

function renderLookupResults(matches) {
  if (matches.length === 0) {
    lookupResults.innerHTML = `<p class="lookup-empty">No appointments found for that email or phone number.</p>`;
    return;
  }

  lookupResults.innerHTML = matches.map(appt => {
    const doctor = DOCTORS.find(d => d.id === appt.doctorId);
    const status = computeStatus(appt);
    const canModify = status === "upcoming";
    return `
      <div class="appt-card" data-id="${appt.id}">
        <div class="appt-info">
          <span class="appt-doctor">${doctor ? doctor.name : "Unknown doctor"} — ${appt.department}</span>
          <span class="appt-meta">${formatDateLong(appt.date)} · ${minutesToLabel(appt.time)}</span>
          <span class="status-pill ${status}">${status}</span>
        </div>
        ${canModify ? `
          <div class="appt-actions">
            <button class="btn btn-ghost btn-small" data-action="reschedule" data-id="${appt.id}">Reschedule</button>
            <button class="btn btn-danger-outline btn-small" data-action="cancel" data-id="${appt.id}">Cancel</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  lookupResults.querySelectorAll("[data-action='cancel']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("Cancel this appointment?")) return;
      const list = getAppointments();
      const idx = list.findIndex(a => a.id === btn.dataset.id);
      if (idx !== -1) { list[idx].status = "cancelled"; saveAppointments(list); }
      showToast("Appointment cancelled.");
      lookupForm.dispatchEvent(new Event("submit"));
    });
  });

  lookupResults.querySelectorAll("[data-action='reschedule']").forEach(btn => {
    btn.addEventListener("click", () => {
      const appt = getAppointments().find(a => a.id === btn.dataset.id);
      if (!appt) return;
      rescheduleTargetId = appt.id;
      switchView("book");
      selectedDept = "All";
      renderDeptFilter();
      renderDoctorGrid();
      selectDoctor(appt.doctorId);
      // Pre-fill patient fields since we know them
      document.getElementById("patientName").value = appt.patientName;
      document.getElementById("patientEmail").value = appt.email;
      document.getElementById("patientPhone").value = appt.phone;
      document.getElementById("visitReason").value = appt.reason || "";
      showToast("Pick a new date and time, then confirm to reschedule.");
    });
  });
}

// ============================================================
// ADMIN VIEW
// ============================================================
let adminUnlocked = false;

const adminGate = document.getElementById("adminGate");
const adminDashboard = document.getElementById("adminDashboard");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPasscode = document.getElementById("adminPasscode");
const adminLoginError = document.getElementById("adminLoginError");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

adminLoginForm.addEventListener("submit", e => {
  e.preventDefault();
  if (adminPasscode.value === ADMIN_PASSCODE) {
    adminUnlocked = true;
    adminGate.classList.add("is-hidden");
    adminDashboard.classList.remove("is-hidden");
    adminLoginError.classList.remove("is-visible");
    adminPasscode.value = "";
    renderAdminDashboard();
  } else {
    adminLoginError.textContent = "Incorrect passcode. Try again.";
    adminLoginError.classList.add("is-visible");
  }
});

adminLogoutBtn.addEventListener("click", () => {
  adminUnlocked = false;
  adminGate.classList.remove("is-hidden");
  adminDashboard.classList.add("is-hidden");
});

const filterDate = document.getElementById("filterDate");
const filterDept = document.getElementById("filterDept");
const filterDoctor = document.getElementById("filterDoctor");
const filterStatus = document.getElementById("filterStatus");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const adminTableBody = document.getElementById("adminTableBody");
const tableEmpty = document.getElementById("tableEmpty");
const statsRow = document.getElementById("statsRow");

function populateAdminFilterOptions() {
  filterDept.innerHTML = `<option value="">All departments</option>` +
    DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join("");
  filterDoctor.innerHTML = `<option value="">All doctors</option>` +
    DOCTORS.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
}
populateAdminFilterOptions();

[filterDate, filterDept, filterDoctor, filterStatus].forEach(el => {
  el.addEventListener("change", renderAdminDashboard);
});

clearFiltersBtn.addEventListener("click", () => {
  filterDate.value = ""; filterDept.value = ""; filterDoctor.value = ""; filterStatus.value = "";
  renderAdminDashboard();
});

function renderAdminDashboard() {
  const all = getAppointments().map(a => ({ ...a, computedStatus: computeStatus(a) }));

  renderStats(all);

  let filtered = all;
  if (filterDate.value) filtered = filtered.filter(a => a.date === filterDate.value);
  if (filterDept.value) filtered = filtered.filter(a => a.department === filterDept.value);
  if (filterDoctor.value) filtered = filtered.filter(a => a.doctorId === filterDoctor.value);
  if (filterStatus.value) filtered = filtered.filter(a => a.computedStatus === filterStatus.value);

  filtered.sort((a, b) => (b.date + b.time.toString().padStart(4, "0")).localeCompare(a.date + a.time.toString().padStart(4, "0")));

  if (filtered.length === 0) {
    adminTableBody.innerHTML = "";
    tableEmpty.classList.remove("is-hidden");
    return;
  }
  tableEmpty.classList.add("is-hidden");

  adminTableBody.innerHTML = filtered.map(appt => {
    const doctor = DOCTORS.find(d => d.id === appt.doctorId);
    const isApproved = !!appt.doctorApproved;
    const isCancelled = appt.computedStatus === "cancelled";
    return `
      <tr data-id="${appt.id}">
        <td>${appt.patientName}</td>
        <td>${appt.email}<br><span style="color:var(--text-muted)">${appt.phone}</span></td>
        <td>
          <div class="table-doctor-cell">
            ${doctor ? avatarMarkup(doctor, "avatar-sm") : ""}
            <span>${doctor ? doctor.name : "—"}</span>
          </div>
        </td>
        <td>${appt.department}</td>
        <td>${formatDateLong(appt.date)}</td>
        <td>${minutesToLabel(appt.time)}</td>
        <td>
          <span class="status-pill ${appt.computedStatus}">${appt.computedStatus}</span>
          ${!isCancelled ? `<span class="approval-badge ${isApproved ? "is-approved" : "is-pending"}">${isApproved ? "✓ Doctor approved" : "Awaiting approval"}</span>` : ""}
        </td>
        <td>
          <div class="table-actions">
            ${!isApproved && !isCancelled ? `<button class="btn btn-approve btn-small" data-action="approve" data-id="${appt.id}">Approve</button>` : ""}
            ${appt.computedStatus === "upcoming" ? `<button class="btn btn-ghost btn-small" data-action="complete" data-id="${appt.id}">Complete</button>` : ""}
            ${!isCancelled ? `<button class="btn btn-danger-outline btn-small" data-action="admin-cancel" data-id="${appt.id}">Cancel</button>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  adminTableBody.querySelectorAll("[data-action='approve']").forEach(btn => {
    btn.addEventListener("click", () => updateAppointment(btn.dataset.id, { doctorApproved: true }));
  });
  adminTableBody.querySelectorAll("[data-action='complete']").forEach(btn => {
    btn.addEventListener("click", () => updateAppointment(btn.dataset.id, { status: "completed" }));
  });
  adminTableBody.querySelectorAll("[data-action='admin-cancel']").forEach(btn => {
    btn.addEventListener("click", () => updateAppointment(btn.dataset.id, { status: "cancelled" }));
  });
}

function updateAppointment(id, patch) {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  saveAppointments(list);
  showToast("Appointment updated.");
  renderAdminDashboard();
}

function renderStats(all) {
  const today = todayISO();
  const todayCount = all.filter(a => a.date === today && a.computedStatus !== "cancelled").length;
  const upcomingCount = all.filter(a => a.computedStatus === "upcoming").length;
  const completedCount = all.filter(a => a.computedStatus === "completed").length;
  const cancelledCount = all.filter(a => a.computedStatus === "cancelled").length;
  const pendingApprovalCount = all.filter(a => !a.doctorApproved && a.computedStatus !== "cancelled").length;

  const stats = [
    { label: "Today", value: todayCount },
    { label: "Upcoming", value: upcomingCount },
    { label: "Pending Approval", value: pendingApprovalCount },
    { label: "Completed", value: completedCount },
    { label: "Cancelled", value: cancelledCount }
  ];

  statsRow.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join("");
}

// ============================================================
// INIT
// ============================================================
renderDeptFilter();
renderDoctorGrid();
