const slides = Array.from(document.querySelectorAll(".slide"));
const deck = document.getElementById("deck");
const slideCount = document.getElementById("slideCount");
const slideTitle = document.getElementById("slideTitle");
const progressBar = document.getElementById("progressBar");
const progressTrack = document.querySelector(".progress-track");
const overview = document.getElementById("overview");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const overviewBtn = document.getElementById("overviewBtn");
const autoplayBtn = document.getElementById("autoplayBtn");
const contrastBtn = document.getElementById("contrastBtn");

let current = 0;
let isOverviewOpen = false;
let autoplayTimer = null;
let touchStartX = 0;
const swipeThreshold = 44;

function toggleHighContrast(forceState) {
  const shouldEnable = typeof forceState === "boolean"
    ? forceState
    : !document.body.classList.contains("high-contrast");

  document.body.classList.toggle("high-contrast", shouldEnable);
  contrastBtn.classList.toggle("is-active", shouldEnable);
  contrastBtn.setAttribute("aria-pressed", String(shouldEnable));

  try {
    localStorage.setItem("deck-high-contrast", shouldEnable ? "on" : "off");
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

function initHighContrastPreference() {
  try {
    const stored = localStorage.getItem("deck-high-contrast");
    if (stored === "on") {
      toggleHighContrast(true);
    }
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

function getFragments(slideIndex) {
  return Array.from(slides[slideIndex].querySelectorAll(".fragment"));
}

function resetFragments(slideIndex) {
  getFragments(slideIndex).forEach((fragment) => fragment.classList.remove("revealed"));
}

function revealNextFragment() {
  const fragments = getFragments(current);
  const nextHidden = fragments.find((fragment) => !fragment.classList.contains("revealed"));

  if (!nextHidden) {
    return false;
  }

  nextHidden.classList.add("revealed");
  return true;
}

function hidePrevFragment() {
  const fragments = getFragments(current);
  const lastShown = [...fragments].reverse().find((fragment) => fragment.classList.contains("revealed"));

  if (!lastShown) {
    return false;
  }

  lastShown.classList.remove("revealed");
  return true;
}

function buildOverview() {
  overview.innerHTML = "";

  slides.forEach((slide, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "thumb";
    thumb.innerHTML = `<span>Slide ${index + 1}</span><strong>${slide.dataset.title || "Untitled"}</strong>`;
    thumb.addEventListener("click", () => {
      jumpTo(index, true);
      toggleOverview(false);
    });
    overview.appendChild(thumb);
  });
}

function syncOverviewSelection() {
  const thumbs = Array.from(overview.querySelectorAll(".thumb"));
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle("is-current", index === current);
  });
}

function updateUI() {
  slides.forEach((slide, index) => {
    slide.classList.toggle("active", index === current);
  });

  const total = slides.length;
  const title = slides[current].dataset.title || `Slide ${current + 1}`;
  const percent = ((current + 1) / total) * 100;

  slideCount.textContent = `${current + 1} / ${total}`;
  slideTitle.textContent = title;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuemax", String(total));
  progressTrack.setAttribute("aria-valuenow", String(current + 1));

  window.location.hash = `slide-${current + 1}`;
  syncOverviewSelection();
}

function jumpTo(index, revealFirstFragment = false) {
  if (index < 0 || index >= slides.length || index === current) {
    return;
  }

  current = index;
  resetFragments(current);

  if (revealFirstFragment) {
    revealNextFragment();
  }

  updateUI();
}

function nextStep() {
  if (revealNextFragment()) {
    return;
  }

  if (current < slides.length - 1) {
    jumpTo(current + 1);
  }
}

function prevStep() {
  if (hidePrevFragment()) {
    return;
  }

  if (current > 0) {
    jumpTo(current - 1);
  }
}

function toggleOverview(forceState) {
  isOverviewOpen = typeof forceState === "boolean" ? forceState : !isOverviewOpen;
  overview.classList.toggle("open", isOverviewOpen);
  overview.setAttribute("aria-hidden", String(!isOverviewOpen));
  overviewBtn.classList.toggle("is-active", isOverviewOpen);
}

function toggleAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
    autoplayBtn.classList.remove("is-active");
    return;
  }

  autoplayTimer = setInterval(() => {
    if (current >= slides.length - 1) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
      autoplayBtn.classList.remove("is-active");
      return;
    }
    nextStep();
  }, 4200);

  autoplayBtn.classList.add("is-active");
}

function initFromHash() {
  const match = window.location.hash.match(/slide-(\d+)/i);
  if (!match) {
    return;
  }
  const index = Number.parseInt(match[1], 10) - 1;
  if (!Number.isNaN(index) && index >= 0 && index < slides.length) {
    current = index;
  }
}

function onKeyDown(event) {
  if (isOverviewOpen && !["o", "O", "c", "C", "Escape"].includes(event.key)) {
    return;
  }

  switch (event.key) {
    case "ArrowRight":
    case "PageDown":
    case " ":
      event.preventDefault();
      nextStep();
      break;
    case "ArrowLeft":
    case "PageUp":
      event.preventDefault();
      prevStep();
      break;
    case "Home":
      event.preventDefault();
      jumpTo(0);
      break;
    case "End":
      event.preventDefault();
      jumpTo(slides.length - 1);
      break;
    case "o":
    case "O":
      event.preventDefault();
      toggleOverview();
      break;
    case "c":
    case "C":
      event.preventDefault();
      toggleHighContrast();
      break;
    case "Escape":
      if (isOverviewOpen) {
        event.preventDefault();
        toggleOverview(false);
      }
      break;
    default:
      break;
  }
}

prevBtn.addEventListener("click", prevStep);
nextBtn.addEventListener("click", nextStep);
overviewBtn.addEventListener("click", () => toggleOverview());
autoplayBtn.addEventListener("click", toggleAutoplay);
contrastBtn.addEventListener("click", () => toggleHighContrast());

deck.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

deck.addEventListener("touchend", (event) => {
  const diff = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(diff) < swipeThreshold) {
    return;
  }

  if (diff < 0) {
    nextStep();
  } else {
    prevStep();
  }
}, { passive: true });

window.addEventListener("keydown", onKeyDown);
window.addEventListener("hashchange", initFromHash);

buildOverview();
initHighContrastPreference();
initFromHash();
updateUI();