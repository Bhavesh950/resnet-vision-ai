/* ============================================================
   ResNet Vision AI — Frontend behavior
   No frameworks. Pure JS + Bootstrap 5 utilities.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Theme toggle (persisted in localStorage) ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const THEME_KEY = "resnet-vision-theme";

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
  }

  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
    }
  })();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  /* ---------- Navbar scroll state ---------- */
  const mainNav = document.getElementById("mainNav");
  function updateNavState() {
    if (!mainNav) return;
    if (window.scrollY > 12) {
      mainNav.classList.add("is-scrolled");
    } else {
      mainNav.classList.remove("is-scrolled");
    }
  }
  window.addEventListener("scroll", updateNavState, { passive: true });
  updateNavState();

  /* ---------- Upload: drag & drop + preview ---------- */
  const dropzone = document.getElementById("dropzone");
  const imageInput = document.getElementById("imageInput");
  const uploadPrompt = document.getElementById("uploadPrompt");
  const imagePreviewWrap = document.getElementById("imagePreviewWrap");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImage");
  const predictBtn = document.getElementById("predictBtn");
  const fileNameHint = document.getElementById("fileNameHint");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  function showPreview(file) {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setHint("Please choose a PNG, JPG, or WEBP image.", true);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setHint("That file is larger than 10MB. Try a smaller image.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      imagePreview.src = e.target.result;
      uploadPrompt.classList.add("d-none");
      imagePreviewWrap.classList.remove("d-none");
      if (predictBtn) predictBtn.disabled = false;
      setHint(`Ready: ${file.name}`, false);
    };
    reader.readAsDataURL(file);
  }

  function setHint(text, isError) {
    if (!fileNameHint) return;
    fileNameHint.textContent = text;
    fileNameHint.style.color = isError ? "var(--danger, #E0544D)" : "var(--success)";
  }

  function resetUpload() {
    if (imageInput) imageInput.value = "";
    if (imagePreview) imagePreview.src = "";
    if (uploadPrompt) uploadPrompt.classList.remove("d-none");
    if (imagePreviewWrap) imagePreviewWrap.classList.add("d-none");
    if (predictBtn) predictBtn.disabled = true;
    setHint("", false);
  }

  if (imageInput) {
    imageInput.addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) showPreview(file);
    });
  }

  if (dropzone) {
    ["dragenter", "dragover"].forEach((evt) => {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "dragend"].forEach((evt) => {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("is-dragover");

      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) {
        // Sync dropped file into the actual input so the form submits it.
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          imageInput.files = dt.files;
        } catch (err) {
          /* DataTransfer construction can fail in older browsers; preview still works. */
        }
        showPreview(file);
      }
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      resetUpload();
    });
  }

  /* ---------- Confidence ring + progress bar animation ---------- */
  function animateConfidence() {
    const ring = document.getElementById("confidenceRing");
    const ringFill = document.getElementById("ringFill");
    const valueLabel = document.getElementById("confidenceValue");
    const progressBar = document.getElementById("confidenceProgressBar");
    if (!ring || !ringFill) return;

    const target = parseFloat(ring.getAttribute("data-confidence")) || 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;

    ringFill.style.strokeDasharray = `${circumference} ${circumference}`;
    ringFill.style.strokeDashoffset = `${circumference}`;

    requestAnimationFrame(() => {
      const offset = circumference - (Math.min(target, 100) / 100) * circumference;
      ringFill.style.strokeDashoffset = `${offset}`;
    });

    if (progressBar) {
      requestAnimationFrame(() => {
        progressBar.style.width = `${Math.min(target, 100)}%`;
      });
    }

    // Count-up number animation
    if (valueLabel) {
      const duration = 1100;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        valueLabel.textContent = (target * eased).toFixed(1);
        if (progress < 1) requestAnimationFrame(tick);
        else valueLabel.textContent = target.toFixed(1);
      }
      requestAnimationFrame(tick);
    }
  }
  animateConfidence();

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Predict button loading state on submit ---------- */
  const predictForm = document.getElementById("predictForm");
  if (predictForm && predictBtn) {
    predictForm.addEventListener("submit", function () {
      if (!imageInput.files || !imageInput.files.length) return;
      predictBtn.disabled = true;
      predictBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Predicting...';
    });
  }

  /* ---------- Footer year ---------- */
  const footerYear = document.getElementById("footerYear");
  if (footerYear) footerYear.textContent = new Date().getFullYear();
})();

const openCamera =
document.getElementById("openCamera");

const video =
document.getElementById("video");

const cameraContainer =
document.getElementById("cameraContainer");

if(openCamera){

openCamera.addEventListener(
"click",
async ()=>{

const stream =
await navigator.mediaDevices
.getUserMedia({
video:true
});

video.srcObject = stream;

cameraContainer
.classList
.remove("d-none");

});
}

const captureBtn =
document.getElementById("captureBtn");

captureBtn?.addEventListener(
"click",
()=>{

const canvas =
document.createElement("canvas");

canvas.width =
video.videoWidth;

canvas.height =
video.videoHeight;

canvas
.getContext("2d")
.drawImage(
video,
0,
0
);

const imgData =
canvas.toDataURL("image/png");

imagePreview.src = imgData;

uploadPrompt
.classList
.add("d-none");

imagePreviewWrap
.classList
.remove("d-none");

});