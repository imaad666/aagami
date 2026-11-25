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

  // The wordmark sits in a sticky header, so a plain #top link never moves
  // the page. Send every "back to top" link to the document start.
  document.querySelectorAll('a[href="#top"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  // Desktop sections are one viewport tall; shrink a section's content
  // uniformly when it would not fit (paired with --fit in theme.css).
  var fitQuery = window.matchMedia("(min-height: 480px)");
  var fitContainers = Array.prototype.slice.call(document.querySelectorAll("main > .section-pad > .container"));

  function fitSections() {
    fitContainers.forEach(function (container) {
      container.style.removeProperty("--fit");
      if (!fitQuery.matches) return;
      var section = container.parentElement;
      var styles = window.getComputedStyle(section);
      var available = section.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      var needed = container.offsetHeight;
      if (needed > available) {
        var floor = window.innerWidth <= 900 ? 0.4 : 0.6;
        container.style.setProperty("--fit", Math.max(floor, available / needed).toFixed(3));
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

  // Keep the footer year current.
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

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
