/* =====================================================
   Portfolio public site — renders everything from /api/content
   ===================================================== */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  var linkOrText = function (item) {
    var value = esc(item.value);
    if (item.link) {
      return '<a href="' + esc(item.link) + '">' + value + "</a>";
    }
    return "<strong>" + value + "</strong>";
  };

  /* ---------- counters ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = (String(target).split(".")[1] || "").length;
    var duration = 1600;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- typing ---------- */
  function startTyping(roles) {
    var el = document.getElementById("typed");
    if (!el || !roles.length) return;
    var ri = 0, ci = 0, deleting = false;
    (function tick() {
      var word = roles[ri];
      el.textContent = word.slice(0, ci);
      var delay;
      if (!deleting) {
        ci++; delay = 70;
        if (ci > word.length) { deleting = true; delay = 1600; }
      } else {
        ci--; delay = 35;
        if (ci < 0) { deleting = false; ci = 0; ri = (ri + 1) % roles.length; delay = 350; }
      }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- renderers ---------- */
  function render(data) {
    document.title = data.profile.name + " — " + (data.profile.roles[0] || "Portfolio");

    // Hero
    $("#heroKicker").textContent = data.profile.kicker || "Hi, I'm";
    $("#heroName").textContent = data.profile.name;
    $("#heroSummary").textContent = data.profile.summary;

    // Monogram avatar — shows uploaded photo when set, initials otherwise
    var words = data.profile.name.split(/\s+/).filter(Boolean);
    var initials = ((words[0] || "")[0] || "") + ((words[words.length - 1] || "")[0] || "");
    initials = initials.toUpperCase() || "ME";
    var mono = $("#heroMonogram");
    if (mono) {
      mono.querySelector("span").textContent = initials;
      var photo = $("#heroPhoto");
      var photoUrl = (data.profile.photo || "").trim();
      if (photoUrl) {
        photo.src = photoUrl;
        photo.hidden = false;
        mono.classList.add("has-photo");
        photo.onerror = function () {
          photo.hidden = true;
          mono.classList.remove("has-photo");
        };
      } else {
        photo.hidden = true;
        photo.removeAttribute("src");
        mono.classList.remove("has-photo");
      }
    }
    $("#brandName").innerHTML = esc(initials[0]) + '<span class="brand-dot">.</span>' + esc(initials.slice(1));

    // Availability badge
    var av = $("#availabilityBadge");
    if (av) {
      if (data.profile.available) {
        av.innerHTML = '<span class="pulse-dot"></span>' + esc(data.profile.availableText || "Open to new opportunities");
        av.hidden = false;
      } else {
        av.hidden = true;
      }
    }


    // Stats
    var stats = $("#heroStats");
    stats.innerHTML = (data.profile.stats || []).map(function (s) {
      return '<li><strong class="stat-num" data-count="' + esc(s.value) + '" data-suffix="' + esc(s.suffix) + '">0</strong><span>' + esc(s.label) + "</span></li>";
    }).join("");

    // About
    $("#aboutKicker").textContent = data.about.kicker;
    $("#aboutTitle").textContent = data.about.title;
    $("#aboutText").innerHTML = (data.about.paragraphs || []).map(function (p) {
      return "<p>" + esc(p) + "</p>";
    }).join("");
    $("#aboutFacts").innerHTML = (data.about.facts || []).map(function (f) {
      return "<li><span>" + esc(f.label) + "</span>" + linkOrText(f) + "</li>";
    }).join("");

    // About photo (optional)
    var aboutPhotoWrap = $("#aboutPhotoWrap");
    if (aboutPhotoWrap) {
      var aboutUrl = (data.about.photo || "").trim();
      if (aboutUrl) {
        $("#aboutPhoto").src = aboutUrl;
        aboutPhotoWrap.hidden = false;
      } else {
        aboutPhotoWrap.hidden = true;
      }
    }

    // Experience
    $("#expKicker").textContent = data.experience.kicker;
    $("#expTitle").textContent = data.experience.title;
    $("#timeline").innerHTML = (data.experience.jobs || []).map(function (job, i) {
      var pill = job.current ? '<span class="timeline-pill">Current</span>' : "";
      return (
        '<article class="timeline-item reveal' + (i % 2 ? " delay-1" : "") + '">' +
          '<div class="timeline-badge">' + esc(job.icon || "💼") + "</div>" +
          '<div class="timeline-content card">' +
            '<div class="timeline-head"><h3>' + esc(job.role) + "</h3>" + pill + "</div>" +
            '<p class="timeline-meta">' + esc(job.company) + " · " + esc(job.period) + "</p>" +
            '<ul class="timeline-list">' +
              (job.bullets || []).map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") +
            "</ul>" +
            '<div class="tech-tags">' +
              (job.tags || []).map(function (t) { return '<span class="tech-tag">' + esc(t) + "</span>"; }).join("") +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    // Projects
    $("#projKicker").textContent = data.projects.kicker;
    $("#projTitle").textContent = data.projects.title;
    $("#projectGrid").innerHTML = (data.projects.items || []).map(function (p, i) {
      var hasHighlight = p.highlight && String(p.highlight).trim() !== "";
      var desc = esc((p.description || "").replace(/\{highlight\}/g, hasHighlight ? p.highlight : ""));
      var img = p.image
        ? '<img class="project-img" src="' + esc(p.image) + '" alt="' + esc(p.title) + '">'
        : '<div class="project-icon">' + esc(p.icon || "📁") + "</div>";
      var metric = hasHighlight ? '<div class="project-metric">' + esc(p.highlight) + "</div>" : "";
      return (
        '<article class="card project-card reveal' + (i % 3 === 1 ? " delay-1" : i % 3 === 2 ? " delay-2" : "") + '">' +
          metric + img + "<h3>" + esc(p.title) + "</h3><p>" + desc + "</p>" +
        "</article>"
      );
    }).join("");

    // Skills — grouped (if skillGroups defined) + full list
    $("#skillKicker").textContent = data.skills.kicker;
    $("#skillTitle").textContent = data.skills.title;
    $("#skillGrid").innerHTML = (data.skills.items || []).map(function (s) {
      return '<div class="card skill-card reveal"><span class="skill-icon">' + esc(s.icon || "•") + "</span><h3>" + esc(s.name) + "</h3></div>";
    }).join("");
    var groups = data.skills.groups || [];
    var groupsEl = $("#skillGroups");
    if (groupsEl) {
      groupsEl.innerHTML = groups.map(function (g, gi) {
        return (
          '<div class="skill-group reveal' + (gi % 4 === 1 ? " delay-1" : gi % 4 === 2 ? " delay-2" : gi % 4 === 3 ? " delay-3" : "") + '">' +
            "<h3>" + esc(g.name) + "</h3><ul>" +
            (g.items || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
          "</ul></div>"
        );
      }).join("");
      if (!groups.length) {
        $("#skillsHint").textContent = "";
        groupsEl.style.display = "none";
      }
    }

    // Certifications
    $("#certKicker").textContent = data.certifications.kicker;
    $("#certTitle").textContent = data.certifications.title;
    $("#certGrid").innerHTML = (data.certifications.items || []).map(function (c) {
      var isPdf = /\.pdf(\?|$)/i.test(c.image || "");
      var isImg = c.image && !isPdf;
      var media;
      if (isImg) {
        media = '<img class="cert-img" src="' + esc(c.image) + '" alt="' + esc(c.name) + '">';
      } else if (isPdf) {
        media = '<a class="cert-pdf" href="' + esc(c.image) + '" target="_blank" rel="noopener" title="View certificate">📄</a>';
      } else {
        media = '<span class="cert-icon">' + esc(c.icon || "🎓") + "</span>";
      }
      var nameHtml = isPdf && c.image
        ? '<a class="cert-link" href="' + esc(c.image) + '" target="_blank" rel="noopener">' + esc(c.name) + " ↗</a>"
        : esc(c.name);
      return (
        '<div class="card cert-card reveal' + (c.image ? " has-img" : "") + '">' + media +
          "<div><h3>" + nameHtml + "</h3><p>" + esc(c.issuer || "") + "</p></div>" +
        "</div>"
      );
    }).join("");

    // Education
    $("#eduKicker").textContent = data.education.kicker;
    $("#eduTitle").textContent = data.education.title;
    $("#eduList").innerHTML = (data.education.items || []).map(function (e) {
      return (
        '<div class="card edu-card reveal"><span class="edu-icon">' + esc(e.icon || "🎓") + "</span>" +
          "<div><h3>" + esc(e.degree) + "</h3><p>" + esc(e.school) + " · " + esc(e.period || "") + "</p></div>" +
        "</div>"
      );
    }).join("");

    // Contact
    $("#contactKicker").textContent = data.contact.kicker;
    $("#contactTitle").textContent = data.contact.title;
    $("#contactLead").textContent = data.contact.lead;

    // Contact form (Web3Forms) — shown only when a key is set in admin
    var formWrap = $("#contactFormWrap");
    if (formWrap) {
      var key = (data.contact.formKey || "").trim();
      if (key) {
        $("#web3formsKey").value = key;
        if (data.contact.formTitle) $("#contactFormTitle").textContent = data.contact.formTitle;
        formWrap.hidden = false;
      }
    }

    $("#contactCards").innerHTML = (data.contact.cards || []).map(function (c, i) {
      return (
        '<a class="card contact-card reveal' + (i % 3 === 1 ? " delay-1" : i % 3 === 2 ? " delay-2" : "") + '" href="' + esc(c.link || "#") + '">' +
          '<span class="contact-icon">' + esc(c.icon || "•") + "</span>" +
          "<h3>" + esc(c.label) + "</h3><p>" + esc(c.value) + "</p>" +
        "</a>"
      );
    }).join("");

    // Footer year
    $("#year").textContent = new Date().getFullYear();

    // CV button visibility
    var cvBtn = $("#cvBtn");
    cvBtn.style.display = data.footer.cvFile ? "" : "none";
    if (data.footer.cvFile) cvBtn.setAttribute("href", data.footer.cvFile);

    afterRender();
  }

  /* ---------- reveal + counters + typing ---------- */
  function afterRender() {
    startTyping(window.__roles__ || []);

    var revealEls = document.querySelectorAll(".reveal");
    var statEls = document.querySelectorAll(".stat-num");

    if ("IntersectionObserver" in window) {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            ro.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function (el) { ro.observe(el); });

      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            so.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      statEls.forEach(function (el) { so.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("visible"); });
      statEls.forEach(animateCounter);
    }
  }

  /* ---------- theme toggle (static, run once) ---------- */
  function initTheme() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    function current() {
      return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    }
    function paint() { btn.textContent = current() === "light" ? "☀️" : "🌙"; }
    btn.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      if (next === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      try { localStorage.setItem("theme", next); } catch (e) {}
      paint();
    });
    paint();
  }

  /* ---------- contact form (static, run once) ---------- */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var status = document.getElementById("formStatus");
    var submit = document.getElementById("formSubmit");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = "Please fill in your name, email and message.";
        status.className = "form-status err";
        return;
      }
      var key = (document.getElementById("web3formsKey") || {}).value || "";
      if (!key) {
        status.textContent = "Form is not configured yet.";
        status.className = "form-status err";
        return;
      }
      submit.disabled = true;
      status.textContent = "Sending…";
      status.className = "form-status";
      var payload = {
        access_key: key,
        subject: "Portfolio contact form — new message",
        from_name: form.name.value,
        replyto: form.email.value,
        message: form.message.value,
        botcheck: form.botcheck ? form.botcheck.checked : false,
      };
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.success) {
            status.textContent = "Thank you! Your message has been sent.";
            status.className = "form-status ok";
            form.reset();
          } else {
            status.textContent = j.message || "Sending failed — please email directly instead.";
            status.className = "form-status err";
          }
        })
        .catch(function () {
          status.textContent = "Sending failed — please email directly instead.";
          status.className = "form-status err";
        })
        .finally(function () { submit.disabled = false; });
    });
  }

  /* ---------- nav behaviours (static, run once) ---------- */
  function initNav() {
    var header = document.querySelector(".site-header");
    function onScrollHeader() {
      if (header) header.classList.toggle("scrolled", window.scrollY > 10);
    }
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();

    var toggle = document.getElementById("navToggle");
    var navList = document.getElementById("navList");
    if (toggle && navList) {
      toggle.addEventListener("click", function () {
        var open = navList.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      navList.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          navList.classList.remove("open");
          toggle.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    var sections = document.querySelectorAll("header, section[id]");
    var navLinks = document.querySelectorAll(".nav-link");
    function onScrollActive() {
      var pos = window.scrollY + 120;
      var currentId = "";
      sections.forEach(function (s) {
        if (s.offsetTop <= pos) currentId = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + currentId);
      });
    }
    window.addEventListener("scroll", onScrollActive, { passive: true });
    onScrollActive();
  }

  /* ---------- boot ---------- */
  initTheme();
  initContactForm();
  initNav();
  fetch("/api/content?cb=" + Date.now()) // cache-buster: always fetch fresh content
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window.__roles__ = data.profile.roles || [];
      render(data);
    })
    .catch(function (err) {
      document.body.insertAdjacentHTML("afterbegin",
        '<div style="padding:12px;background:#7f1d1d;color:#fff;font-family:sans-serif">Failed to load content: ' + esc(err.message) + "</div>");
    });
})();
