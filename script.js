// Intel Summit Check-In App
// Works with current index.html and style.css

// ---------- Constants ----------
const ATTENDANCE_GOAL = 50;
const STORAGE_KEY = "intel_summit_checkin_state_v1";

// ---------- State ----------
let totalAttendees = 0;
let teamCounts = {
  water: 0, // Team Water Wise
  zero: 0, // Team Net Zero
  power: 0, // Team Renewables
};
let attendeeList = []; // [{ name, teamValue, teamLabel }]

// ---------- DOM ----------
const checkInForm = document.getElementById("checkInForm");
const attendeeNameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");

const greetingEl = document.getElementById("greeting");
const attendeeCountEl = document.getElementById("attendeeCount");
const progressBarEl = document.getElementById("progressBar");

const waterCountEl = document.getElementById("waterCount");
const zeroCountEl = document.getElementById("zeroCount");
const powerCountEl = document.getElementById("powerCount");

const waterCardEl = document.querySelector(".team-card.water");
const zeroCardEl = document.querySelector(".team-card.zero");
const powerCardEl = document.querySelector(".team-card.power");

// ---------- Utility ----------
function teamLabelFromValue(teamValue) {
  if (teamValue === "water") return "Team Water Wise";
  if (teamValue === "zero") return "Team Net Zero";
  if (teamValue === "power") return "Team Renewables";
  return "Unknown Team";
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function showGreeting(message, isSuccess = true) {
  greetingEl.textContent = message;
  greetingEl.style.display = "block";
  greetingEl.classList.remove("success-message");
  if (isSuccess) {
    greetingEl.classList.add("success-message");
  }
}

function clearWinnerHighlight() {
  [waterCardEl, zeroCardEl, powerCardEl].forEach((card) => {
    if (card) {
      card.style.outline = "none";
      card.style.boxShadow = "none";
      card.style.transform = "none";
    }
  });
}

function highlightWinningTeam(teamValue) {
  clearWinnerHighlight();
  let card = null;
  if (teamValue === "water") card = waterCardEl;
  if (teamValue === "zero") card = zeroCardEl;
  if (teamValue === "power") card = powerCardEl;

  if (card) {
    card.style.outline = "3px solid #16a34a";
    card.style.boxShadow = "0 0 0 6px rgba(22, 163, 74, 0.15)";
    card.style.transform = "translateY(-2px)";
  }
}

function getWinningTeam() {
  const entries = Object.entries(teamCounts); // [["water", n], ...]
  entries.sort((a, b) => b[1] - a[1]);

  // Handle tie at top
  const topCount = entries[0][1];
  const tied = entries.filter(([, count]) => count === topCount);

  if (tied.length > 1) {
    return { type: "tie", teams: tied.map(([team]) => team), count: topCount };
  }

  return { type: "single", team: entries[0][0], count: topCount };
}

// ---------- Rendering ----------
function renderCounts() {
  attendeeCountEl.textContent = totalAttendees;
  waterCountEl.textContent = teamCounts.water;
  zeroCountEl.textContent = teamCounts.zero;
  powerCountEl.textContent = teamCounts.power;
}

function renderProgressBar() {
  const percent = clamp((totalAttendees / ATTENDANCE_GOAL) * 100, 0, 100);
  progressBarEl.style.width = `${percent}%`;
}

function ensureAttendeeListUI() {
  // Create attendee list section only once (LevelUp)
  let section = document.getElementById("attendeeListSection");
  if (section) return;

  section = document.createElement("div");
  section.id = "attendeeListSection";
  section.className = "team-stats";
  section.style.marginTop = "25px";

  section.innerHTML = `
    <h3>Recent Check-Ins</h3>
    <ul id="attendeeListUI" style="text-align:left; list-style: none; padding: 0; margin: 0;"></ul>
  `;

  const container = document.querySelector(".container");
  container.appendChild(section);
}

function renderAttendeeList() {
  ensureAttendeeListUI();
  const listEl = document.getElementById("attendeeListUI");
  listEl.innerHTML = "";

  attendeeList.forEach((entry, index) => {
    const li = document.createElement("li");
    li.style.padding = "10px 12px";
    li.style.marginBottom = "8px";
    li.style.borderRadius = "10px";
    li.style.background = "#f8fafc";
    li.style.border = "1px solid #e2e8f0";
    li.textContent = `${index + 1}. ${entry.name} — ${entry.teamLabel}`;
    listEl.appendChild(li);
  });
}

function renderCelebrationIfNeeded() {
  if (totalAttendees < ATTENDANCE_GOAL) {
    clearWinnerHighlight();
    return;
  }

  const result = getWinningTeam();

  if (result.type === "tie") {
    const names = result.teams.map(teamLabelFromValue).join(" and ");
    showGreeting(
      `🎉 Goal reached! Attendance hit ${ATTENDANCE_GOAL}. It's currently a tie between ${names}!`,
      true,
    );
    clearWinnerHighlight();
    return;
  }

  highlightWinningTeam(result.team);
  showGreeting(
    `🎉 Goal reached! ${teamLabelFromValue(result.team)} is leading with ${result.count} check-ins.`,
    true,
  );
}

function renderAll() {
  renderCounts();
  renderProgressBar();
  renderAttendeeList();
  renderCelebrationIfNeeded();
}

// ---------- Local Storage (LevelUp) ----------
function saveState() {
  const state = {
    totalAttendees,
    teamCounts,
    attendeeList,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    totalAttendees = Number(parsed.totalAttendees) || 0;

    teamCounts.water = Number(parsed?.teamCounts?.water) || 0;
    teamCounts.zero = Number(parsed?.teamCounts?.zero) || 0;
    teamCounts.power = Number(parsed?.teamCounts?.power) || 0;

    attendeeList = Array.isArray(parsed.attendeeList)
      ? parsed.attendeeList
      : [];
  } catch (error) {
    console.error("Failed to parse saved state:", error);
  }
}

// ---------- Check-In Logic ----------
function handleCheckIn(event) {
  event.preventDefault();

  const name = attendeeNameInput.value.trim();
  const teamValue = teamSelect.value;

  if (!name) {
    showGreeting("Please enter attendee name before check-in.", false);
    return;
  }

  if (!teamValue) {
    showGreeting("Please select a team before check-in.", false);
    return;
  }

  // Update state
  totalAttendees += 1;
  teamCounts[teamValue] += 1;

  const teamLabel = teamLabelFromValue(teamValue);
  attendeeList.push({
    name,
    teamValue,
    teamLabel,
  });

  // Personalized greeting (required rubric)
  showGreeting(`Welcome, ${name}! You checked in with ${teamLabel}.`, true);

  // Update UI + persist
  renderAll();
  saveState();

  // Reset form for next attendee
  checkInForm.reset();
  attendeeNameInput.focus();
}

// ---------- Init ----------
function init() {
  loadState();
  renderAll();

  checkInForm.addEventListener("submit", handleCheckIn);
}

document.addEventListener("DOMContentLoaded", init);
