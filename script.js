(function () {
  "use strict";

  /* ════════════════════════════════════════════════════
     1. PREMIUM SMOOTH SCROLL  — native scroll + lerp velocity
        No DOM wrapping. Uses scrollTo on window directly.
     ════════════════════════════════════════════════════ */
  let targetY = window.scrollY;
  let currentY = window.scrollY;
  let rafId = null;
  let isScrolling = false;

  const EASE = 0.075; // lower = silkier (0.06–0.12 sweet spot)

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothLoop() {
    const diff = targetY - currentY;
    if (Math.abs(diff) < 0.3) {
      currentY = targetY;
      isScrolling = false;
      rafId = null;
      onScrollProgress();
      return;
    }
    currentY = lerp(currentY, targetY, EASE);
    window.scrollTo(0, currentY);
    onScrollProgress();
    rafId = requestAnimationFrame(smoothLoop);
  }

  function clampTarget(v) {
    return Math.max(
      0,
      Math.min(v, document.body.scrollHeight - window.innerHeight),
    );
  }

  const useCustomScroll =
    window.matchMedia("(pointer: fine)").matches &&
    window.matchMedia("(hover: hover)").matches &&
    window.innerWidth > 768;

  // Intercept wheel — prevent native, drive our lerp
  if (useCustomScroll) {
    window.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        const delta =
          e.deltaY *
          (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1);
        targetY = clampTarget(targetY + delta * 0.78);
        if (!isScrolling) {
          isScrolling = true;
          currentY = window.scrollY;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(smoothLoop);
        }
      },
      { passive: false },
    );
  }

  // Keyboard scroll
  window.addEventListener("keydown", function (e) {
    if (!useCustomScroll) return;
    const map = {
      ArrowDown: 100,
      ArrowUp: -100,
      PageDown: window.innerHeight * 0.85,
      PageUp: -(window.innerHeight * 0.85),
    };
    if (e.key === "Home") {
      targetY = 0;
    } else if (e.key === "End") {
      targetY = clampTarget(99999);
    } else if (e.key === " " && !e.target.matches("input,textarea,select")) {
      e.preventDefault();
      targetY = clampTarget(
        targetY +
          (e.shiftKey ? -window.innerHeight * 0.75 : window.innerHeight * 0.75),
      );
    } else if (map[e.key]) {
      e.preventDefault();
      targetY = clampTarget(targetY + map[e.key]);
    } else {
      return;
    }
    if (!isScrolling) {
      isScrolling = true;
      currentY = window.scrollY;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(smoothLoop);
    }
  });

  if (useCustomScroll) {
    // Touch scroll smoothing only on desktop-class pointer devices.
    let touchY0 = 0;
    window.addEventListener(
      "touchstart",
      (e) => {
        touchY0 = e.touches[0].clientY;
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        const dy = touchY0 - e.touches[0].clientY;
        touchY0 = e.touches[0].clientY;
        targetY = clampTarget(targetY + dy * 1.6);
        if (!isScrolling) {
          isScrolling = true;
          currentY = window.scrollY;
          rafId = requestAnimationFrame(smoothLoop);
        }
      },
      { passive: true },
    );
  }

  // Smooth anchor navigation
  document.addEventListener("click", function (e) {
    if (!useCustomScroll) return;
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute("href").slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    targetY = clampTarget(el.getBoundingClientRect().top + window.scrollY - 88);
    if (!isScrolling) {
      isScrolling = true;
      currentY = window.scrollY;
      rafId = requestAnimationFrame(smoothLoop);
    }
  });

  /* ════════════════════════════════════════════════════
     2. SCROLL PROGRESS BAR
     ════════════════════════════════════════════════════ */
  const bar = document.createElement("div");
  bar.style.cssText =
    "position:fixed;top:0;left:0;height:2px;width:0;z-index:99999;pointer-events:none;background:linear-gradient(90deg,#006EFF,#00E5FF);box-shadow:0 0 8px rgba(0,229,255,0.7);border-radius:0 2px 2px 0;";
  document.body.appendChild(bar);

  /* ════════════════════════════════════════════════════
     3. SCROLL CALLBACKS (nav, reveal, counters, bars)
     ════════════════════════════════════════════════════ */
  const navbar = document.getElementById("navbar");
  const pill = document.getElementById("navPill");
  const hoverBg = document.getElementById("navHoverBg");
  const pillLinks = pill ? [...pill.querySelectorAll("a")] : [];
  const sections = [...document.querySelectorAll("section[id]")];
  const reveals = [...document.querySelectorAll(".reveal")];
  const statBars = [...document.querySelectorAll(".why-stat-fill")];
  const counters = [...document.querySelectorAll(".counter")];
  const teamSection = document.getElementById("team");
  const deferredTeamImages = teamSection
    ? [...teamSection.querySelectorAll("img[data-src]")]
    : [];
  let teamImagesLoaded = false;

  function loadTeamImages() {
    if (teamImagesLoaded || !deferredTeamImages.length) return;
    deferredTeamImages.forEach((img) => {
      const src = img.getAttribute("data-src");
      if (!src) return;
      img.src = src;
      img.removeAttribute("data-src");
    });
    teamImagesLoaded = true;
  }

  function onScrollProgress() {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    const max = document.body.scrollHeight - vh;
    bar.style.width = (max > 0 ? (sy / max) * 100 : 0) + "%";

    // Nav shrink
    if (navbar) navbar.classList.toggle("scrolled", sy > 60);

    // Active section
    let activeId = "";
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top < vh * 0.5) activeId = s.id;
    });
    pillLinks.forEach((l) =>
      l.classList.toggle("active", l.getAttribute("href") === "#" + activeId),
    );

    // Reveal elements
    reveals.forEach((el) => {
      if (el.classList.contains("visible")) return;
      if (el.getBoundingClientRect().top < vh * 0.88)
        el.classList.add("visible");
    });

    // Stat bars
    statBars.forEach((b) => {
      if (b.dataset.done) return;
      if (b.getBoundingClientRect().top < vh * 0.9) {
        b.style.width = b.dataset.width + "%";
        b.dataset.done = 1;
      }
    });

    // Counters
    counters.forEach((c) => {
      if (c.dataset.done) return;
      if (c.getBoundingClientRect().top < vh * 0.9) {
        c.dataset.done = 1;
        animCount(c, +c.dataset.target);
      }
    });

    // Defer team portraits until the section is near the viewport
    if (
      teamSection &&
      !teamImagesLoaded &&
      teamSection.getBoundingClientRect().top < vh * 1.15
    ) {
      loadTeamImages();
    }
  }

  // Also run on native scroll (fallback / mobile)
  window.addEventListener("scroll", onScrollProgress, { passive: true });
  onScrollProgress();

  /* ════════════════════════════════════════════════════
     4. COUNTER ANIMATION
     ════════════════════════════════════════════════════ */
  function animCount(el, target, dur) {
    dur = dur || 2200;
    let t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.floor(ease * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  /* ════════════════════════════════════════════════════
     5. NAV PILL HOVER HIGHLIGHT
     ════════════════════════════════════════════════════ */
  if (pill && hoverBg) {
    pillLinks.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        const pr = pill.getBoundingClientRect();
        const er = link.getBoundingClientRect();
        hoverBg.style.cssText = `opacity:1;left:${er.left - pr.left}px;top:${er.top - pr.top}px;width:${er.width}px;height:${er.height}px;`;
      });
    });
    pill.addEventListener("mouseleave", () => {
      hoverBg.style.opacity = "0";
    });
  }

  /* ════════════════════════════════════════════════════
     6. CURSOR — magnetic ring that follows smoothly
     ════════════════════════════════════════════════════ */
  const cursorDot = document.getElementById("cursorDot");
  const cursorRing = document.getElementById("cursorRing");
  let mx = window.innerWidth / 2,
    my = window.innerHeight / 2;
  let rx = mx,
    ry = my;
  let cursorVisible = false;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!cursorVisible) {
      cursorVisible = true;
      if (cursorDot) cursorDot.style.opacity = "1";
      if (cursorRing) cursorRing.style.opacity = "1";
    }
  });

  document.addEventListener("mouseleave", () => {
    cursorVisible = false;
    if (cursorDot) cursorDot.style.opacity = "0";
    if (cursorRing) cursorRing.style.opacity = "0";
  });

  // Init hidden
  if (cursorDot) {
    cursorDot.style.opacity = "0";
    cursorDot.style.transition = "opacity 0.3s";
  }
  if (cursorRing) {
    cursorRing.style.opacity = "0";
    cursorRing.style.transition = "opacity 0.3s";
  }

  function animateCursor() {
    if (cursorDot) {
      cursorDot.style.left = mx + "px";
      cursorDot.style.top = my + "px";
    }
    if (cursorRing) {
      rx = lerp(rx, mx, 0.12);
      ry = lerp(ry, my, 0.12);
      cursorRing.style.left = rx + "px";
      cursorRing.style.top = ry + "px";
    }
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Cursor expand on interactive elements
  const interactiveEls =
    "a, button, input, textarea, select, .service-card, .team-card, .portfolio-card, .faq-q, .pricing-card, .process-step, .tech-pill, .team-link";
  document.querySelectorAll(interactiveEls).forEach((el) => {
    el.addEventListener("mouseenter", () => {
      if (!cursorRing) return;
      const inner = cursorRing.firstElementChild;
      inner.style.width = "54px";
      inner.style.height = "54px";
      inner.style.borderColor = "rgba(0,229,255,0.9)";
      inner.style.background = "rgba(0,229,255,0.06)";
    });
    el.addEventListener("mouseleave", () => {
      if (!cursorRing) return;
      const inner = cursorRing.firstElementChild;
      inner.style.width = "40px";
      inner.style.height = "40px";
      inner.style.borderColor = "rgba(0,229,255,0.5)";
      inner.style.background = "transparent";
    });
  });

  /* ════════════════════════════════════════════════════
     7. HERO ORB PARALLAX (mouse)
     ════════════════════════════════════════════════════ */
  let ox = 0,
    oy = 0,
    otx = 0,
    oty = 0;
  document.addEventListener("mousemove", (e) => {
    otx = (e.clientX / window.innerWidth - 0.5) * 24;
    oty = (e.clientY / window.innerHeight - 0.5) * 16;
  });
  function parallax() {
    ox = lerp(ox, otx, 0.04);
    oy = lerp(oy, oty, 0.04);
    const orbs = document.querySelectorAll(".hero-orb");
    orbs.forEach((orb, i) => {
      const f = (i + 1) * 0.45;
      orb.style.transform = `translate(${ox * f}px, ${oy * f}px)`;
    });
    requestAnimationFrame(parallax);
  }
  parallax();

  /* ════════════════════════════════════════════════════
     8. 3D CARD TILT
     ════════════════════════════════════════════════════ */
  const tiltCards =
    ".service-card, .team-card, .pricing-card, .tech-cat-card, .portfolio-card";
  document.querySelectorAll(tiltCards).forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 10;
      card.style.transition =
        "transform 0.08s linear, box-shadow 0.3s, border-color 0.3s";
      card.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px) scale(1.015)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transition =
        "transform 0.6s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s, border-color 0.3s";
      card.style.transform = "";
    });
  });

  /* ════════════════════════════════════════════════════
     9. MAGNETIC BUTTONS
     ════════════════════════════════════════════════════ */
  const magBtns = ".btn-primary, .btn-secondary, .nav-cta";
  document.querySelectorAll(magBtns).forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
      btn.style.transition = "transform 0.15s ease";
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transition = "transform 0.5s cubic-bezier(0.23,1,0.32,1)";
      btn.style.transform = "";
    });
  });

  /* ════════════════════════════════════════════════════
     10. FAQ ACCORDION
     ════════════════════════════════════════════════════ */
  window.toggleFaq = function (item) {
    const wasOpen = item.classList.contains("open");
    document
      .querySelectorAll(".faq-item")
      .forEach((i) => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  };

  window.toggleMobileMenu = function (forceOpen) {
    const mobileMenu = document.getElementById("mobileMenu");
    const hamburger = document.getElementById("hamburgerBtn");
    if (!mobileMenu || !hamburger) return;

    const shouldOpen =
      typeof forceOpen === "boolean"
        ? forceOpen
        : !mobileMenu.classList.contains("open");

    mobileMenu.classList.toggle("open", shouldOpen);
    hamburger.classList.toggle("open", shouldOpen);
    hamburger.setAttribute("aria-expanded", String(shouldOpen));
    navbar?.classList.toggle("menu-open", shouldOpen);
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  };

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    window.toggleMobileMenu(false);
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900) {
        window.toggleMobileMenu(false);
      }
    },
    { passive: true },
  );

  /* ════════════════════════════════════════════════════
     11. FORM SUBMIT
     ════════════════════════════════════════════════════ */
  const contactForm = document.getElementById("contactForm");
  const formBtn = document.querySelector(".form-submit");
  const formStatus = document.getElementById("formStatus");
  if (contactForm && formBtn) {
    contactForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const originalHTML = formBtn.innerHTML;
      const originalBg = formBtn.style.background;

      formBtn.disabled = true;
      formBtn.innerHTML =
        '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Sending...';
      if (formStatus) {
        formStatus.textContent = "Sending your message to TechTeamLead...";
      }

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to send message");
        }

        formBtn.innerHTML =
          '<i class="bi bi-check2-circle" aria-hidden="true"></i> Message Sent!';
        formBtn.style.background = "linear-gradient(135deg,#28C840,#006EFF)";
        if (formStatus) {
          formStatus.textContent =
            result.message || "Message sent successfully.";
        }
        contactForm.reset();

        setTimeout(() => {
          formBtn.innerHTML = originalHTML;
          formBtn.style.background = originalBg;
          formBtn.disabled = false;
          if (formStatus) {
            formStatus.textContent = "";
          }
        }, 3000);
      } catch (error) {
        formBtn.disabled = false;
        formBtn.innerHTML = originalHTML;
        formBtn.style.background = originalBg;
        if (formStatus) {
          formStatus.textContent = error.message || "Something went wrong.";
          formStatus.style.color = "#ff8a8a";
        }
      }
    });
  }
})();
