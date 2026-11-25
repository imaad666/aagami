(function () {
  "use strict";

  // Reveal content only when the observer is ready. Without JavaScript, the
  // CSS keeps all copy visible so the site never renders as a blank page.
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (revealItems.length && "IntersectionObserver" in window && !reduceMotion) {
    document.documentElement.classList.add("js-reveal");
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" });

    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add("is-visible"); });
  }

  // Mobile navigation.
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");

  function closeMenu() {
    if (!menuToggle || !mainNav) return;
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  // On a phone the technology notes are icon buttons. A tap opens a short splash.
  var pillars = Array.prototype.slice.call(document.querySelectorAll(".tech-pillars > .pillar"));
  var pillarQuery = window.matchMedia("(max-width: 900px)");

  function closePillars() {
    pillars.forEach(function (pillar) {
      pillar.classList.remove("is-open");
      pillar.setAttribute("aria-expanded", "false");
    });
    if (pillarNote) {
      pillarNote.hidden = true;
      pillarNote.classList.remove("is-open");
    }
  }

  var pillarNote = document.querySelector(".pillar-note");

  function showPillarNote(pillar) {
    if (!pillarNote) return;
    var title = pillar.querySelector("h3");
    var body = pillar.querySelector("p");
    pillarNote.querySelector("h3").textContent = title ? title.textContent : "";
    pillarNote.querySelector("p").textContent = body ? body.textContent : "";
    pillarNote.hidden = false;
    pillarNote.classList.add("is-open");
  }

  pillars.forEach(function (pillar) {
    pillar.addEventListener("click", function (event) {
      event.stopPropagation();
      if (!pillarQuery.matches) return;
      var open = pillar.classList.contains("is-open");
      closePillars();
      if (!open) {
        pillar.classList.add("is-open");
        pillar.setAttribute("aria-expanded", "true");
        showPillarNote(pillar);
      }
    });
  });

  document.addEventListener("click", closePillars);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePillars();
  });

  // The wordmark sits in a sticky header, so a plain #top link never moves
  // the page. Send every "back to top" link to the document start.
  document.querySelectorAll('a[href="#top"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  // Keep the footer year current.
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Sections are one viewport tall. Scale a section down, rather than
  // scrolling inside it, so the page still snaps one screen at a time.
  var phoneQuery = window.matchMedia("(max-width: 900px)");
  var laptopQuery = window.matchMedia("(min-width: 901px) and (min-height: 560px)");
  var fitContainers = Array.prototype.slice.call(document.querySelectorAll("main > .section-pad > .container"));

  function fitSections() {
    var phone = phoneQuery.matches;
    var laptop = laptopQuery.matches;
    fitContainers.forEach(function (container) {
      container.style.removeProperty("--fit");
      if (!phone && !laptop) return;
      var section = container.parentElement;
      var styles = window.getComputedStyle(section);
      var available = section.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom) - 8;
      var floor = phone ? 0.32 : 0.6;
      var guard = 0;
      while (guard < 4) {
        guard += 1;
        // Painted height, so a phone width compensation that reflows the copy
        // is measured after it happens. Layout height would scale back up and
        // clip the last card.
        var needed = container.getBoundingClientRect().height;
        if (needed <= available + 1) {
          if (guard === 1) container.style.removeProperty("--fit");
          break;
        }
        var current = parseFloat(container.style.getPropertyValue("--fit")) || 1;
        var next = Math.max(floor, Math.min(1, current * (available / needed)));
        if (Math.abs(next - current) < 0.004) break;
        container.style.setProperty("--fit", next.toFixed(3));
        if (!phone) break;
      }
    });
  }

  var fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitSections);
  }

  fitSections();
  window.addEventListener("resize", scheduleFit);
  window.addEventListener("load", scheduleFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit);

  // Contact form goes to the address printed on the page. Without JavaScript the
  // form still posts to that same address via its action attribute.
  var listedMail = document.querySelector(".contact-email a[href^='mailto:']");
  var contactAddress = "contact@aagamiseq.com";
  if (listedMail) {
    var fromPage = listedMail.getAttribute("href").replace(/^mailto:/i, "").split("?")[0].trim();
    if (fromPage) contactAddress = fromPage;
  }
  var CONTACT_ENDPOINT = "https://formsubmit.co/ajax/" + contactAddress;
  var contactForm = document.getElementById("contactForm");
  if (contactForm) contactForm.action = "https://formsubmit.co/" + contactAddress;
  var formFeedback = document.getElementById("formFeedback");

  if (contactForm && formFeedback && window.fetch) {
    var submitButton = contactForm.querySelector(".form-submit");
    var submitLabel = submitButton ? submitButton.textContent : "";

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(contactForm);
      if (data.get("_honey")) return;

      var payload = {
        Name: data.get("name"),
        email: data.get("email"),
        Organization: data.get("organization") || "—",
        "Area of interest": data.get("interest"),
        Message: data.get("message") || "—",
        _subject: "New AagamiSEQ enquiry from " + data.get("name") + " (" + data.get("interest") + ")",
        _template: "table",
        _captcha: "false"
      };

      contactForm.classList.add("is-sending");
      formFeedback.classList.remove("is-error", "is-success");
      formFeedback.textContent = "Sending…";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending…";
      }

      fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok || String(body.success) !== "true") {
              throw new Error(body.message || "Request failed");
            }
          });
        })
        .then(function () {
          contactForm.reset();
          formFeedback.classList.add("is-success");
          formFeedback.textContent = "Thank you — your enquiry has been sent. We'll be in touch soon.";
        })
        .catch(function () {
          formFeedback.classList.add("is-error");
          formFeedback.textContent = "Sorry, something went wrong. Please try again in a moment.";
        })
        .then(function () {
          contactForm.classList.remove("is-sending");
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitLabel;
          }
        });
    });
  }
})();
