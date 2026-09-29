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
    // Initials = first letter of EVERY word (Salai Thant Zaw Win -> STZW)
    var words = data.profile.name.split(/\s+/).filter(Boolean);
    var initials = words.map(function (w) { return (w[0] || ""); }).join("");
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
    $("#brandName").textContent = initials;

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
      var photo = job.image
        ? '<img class="timeline-photo" src="' + esc(job.image) + '" alt="' + esc(job.company) + '" loading="lazy" width="900" height="600">'
        : "";
      return (
        '<article class="timeline-item reveal' + (i % 2 ? " delay-1" : "") + '">' +
          '<div class="timeline-badge">' + esc(job.icon || "💼") + "</div>" +
          '<div class="timeline-content card">' +
            photo +
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
        ? '<img class="project-img" src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" width="800" height="600">'
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
    $("#skillGrid").innerHTML = (data.skills.items || []).map(function (s, i) {
      return '<div class="card skill-card reveal' + (i % 4 === 1 ? " delay-1" : i % 4 === 2 ? " delay-2" : i % 4 === 3 ? " delay-3" : "") + '"><span class="skill-icon">' + esc(s.icon || "•") + "</span><h3>" + esc(s.name) + "</h3></div>";
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
    $("#certGrid").innerHTML = (data.certifications.items || []).map(function (c, ci) {
      var isPdf = /\.pdf(\?|$)/i.test(c.image || "");
      var isImg = c.image && !isPdf;
      var media;
      if (isImg) {
        media = '<img class="cert-img" src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy" width="140" height="140">';
      } else if (isPdf) {
        media = '<a class="cert-pdf" href="' + esc(c.image) + '" target="_blank" rel="noopener" title="View certificate">📄</a>';
      } else {
        media = '<span class="cert-icon">' + esc(c.icon || "🎓") + "</span>";
      }
      var nameHtml = isPdf && c.image
        ? '<a class="cert-link" href="' + esc(c.image) + '" target="_blank" rel="noopener">' + esc(c.name) + " ↗</a>"
        : esc(c.name);
      return (
        '<div class="card cert-card reveal' + (c.image ? " has-img" : "") +
          (ci % 4 === 1 ? " delay-1" : ci % 4 === 2 ? " delay-2" : ci % 4 === 3 ? " delay-3" : "") +
        '">' + media +
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

    // Blog / updates (optional — hidden when no posts)
    var blogSec = document.getElementById("blog");
    if (blogSec) {
      var posts = (data.blog && data.blog.posts) || [];
      if (posts.length) {
        $("#blogKicker").textContent = data.blog.kicker || "Updates";
        $("#blogTitle").textContent = data.blog.title || "Updates";
        $("#blogList").innerHTML = posts.map(function (p, i) {
          var paras = String(p.body || "").split(/\n\s*\n/).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
          return (
            '<article class="card blog-card reveal' + (i % 2 ? " delay-1" : "") + '">' +
              '<div class="blog-meta">' + esc(p.date || "") + "</div>" +
              "<h3>" + esc(p.title) + "</h3>" + paras +
            "</article>"
          );
        }).join("");
        blogSec.hidden = false;
      } else {
        blogSec.hidden = true;
      }
    }

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
        '<a class="card contact-card reveal' + (i === 1 ? " delay-1" : i === 2 ? " delay-2" : i === 3 ? " delay-3" : "") + '" href="' + esc(c.link || "#") + '">' +
          '<span class="contact-icon">' + esc(c.icon || "•") + "</span>" +
          "<h3>" + esc(c.label) + "</h3><p>" + esc(c.value) + "</p>" +
        "</a>"
      );
    }).join("");

    // Social links (Contact section + footer)
    var socials = data.contact.socials || [];
    var socialIcons = { linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z"/></svg>', facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.78-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>' };
    function socialBtn(s) {
      var label = (s.label || "").toLowerCase();
      var icon = socialIcons[label] || '<span class="social-letter">' + esc((s.label || "")[0] || "•") + "</span>";
      return '<a class="social-btn" href="' + esc(s.url || "#") + '" target="_blank" rel="noopener" aria-label="' + esc(s.label || "Social link") + '">' + icon + "</a>";
    }
    var socialRow = $("#socialRow");
    if (socialRow) {
      if (socials.length) {
        socialRow.innerHTML = socials.map(socialBtn).join("");
        socialRow.hidden = false;
      } else socialRow.hidden = true;
    }
    var footerSocial = $("#footerSocial");
    if (footerSocial) {
      footerSocial.innerHTML = socials.map(socialBtn).join("");
      footerSocial.hidden = !socials.length;
    }

    // Footer year
    $("#year").textContent = new Date().getFullYear();

    // Visitor counter (once per browser session) + friendly compact format
    var visitBadge = $("#visitBadge");
    if (visitBadge) {
      var ping = false;
      var notrack = false;
      try {
        ping = !sessionStorage.getItem("visited");
        // Secret opt-out: owner visits aren't counted. Enable once:
        //   https://<site>/?notrack=1   (persists in localStorage), disable: ?track=1
        var qs = new URLSearchParams(location.search);
        if (qs.has("notrack")) { localStorage.setItem("stzw_notrack", "1"); notrack = true; }
        else if (qs.has("track")) { localStorage.removeItem("stzw_notrack"); }
        else { notrack = !!localStorage.getItem("stzw_notrack"); }
      } catch (e) {}
      if (notrack) {
        visitBadge.hidden = false;
        fetch("/api/visit")
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.total != null) $("#visitCount").textContent = compactNumber(j.total);
          })
          .catch(function () {});
      } else {
        fetch("/api/visit" + (ping ? "?increment" : ""))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.total != null) {
              $("#visitCount").textContent = compactNumber(j.total);
              visitBadge.hidden = false;
              try { sessionStorage.setItem("visited", "1"); } catch (e) {}
            }
          })
          .catch(function () {});
      }
    }

    // Section view tracking (privacy-friendly counters, no cookies/IPs)
    var noTrackSections = false;
    try { noTrackSections = !!localStorage.getItem("stzw_notrack"); } catch (e) {}
    if (!noTrackSections) trackSectionViews();

    // CV button visibility
    var cvBtn = $("#cvBtn");
    cvBtn.style.display = data.footer.cvFile ? "" : "none";
    if (data.footer.cvFile) cvBtn.setAttribute("href", data.footer.cvFile);

    afterRender();
  }

  /* ---------- helpers ---------- */
  function compactNumber(n) {
    if (n >= 1000000) return (Math.floor(n / 100000) / 10).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }

  // Count one view per section per session when it scrolls into view
  function trackSectionViews() {
    var tracked = {};
    try { tracked = JSON.parse(sessionStorage.getItem("sectionViews") || "{}"); } catch (e) {}
    var ids = ["home", "about", "experience", "projects", "skills", "certs", "education", "blog", "contact"];
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        if (!id || tracked[id]) return;
        tracked[id] = 1;
        try { sessionStorage.setItem("sectionViews", JSON.stringify(tracked)); } catch (e) {}
        fetch("/api/visit?increment&section=" + id).catch(function () {});
      });
    }, { threshold: 0.25 });
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
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
      submit.textContent = "Sending…";
      status.textContent = "";
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
            showFormSuccess();
          } else {
            status.textContent = j.message || "Sending failed — please email directly instead.";
            status.className = "form-status err";
          }
        })
        .catch(function () {
          status.textContent = "Sending failed — please email directly instead.";
          status.className = "form-status err";
        })
        .finally(function () { submit.disabled = false; submit.textContent = "Send message"; });
    });

    function showFormSuccess() {
      var done = document.createElement("div");
      done.className = "form-success";
      done.innerHTML =
        '<div class="form-success-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 52 52" width="56" height="56"><circle class="fs-circle" cx="26" cy="26" r="24" fill="none"/><path class="fs-check" fill="none" d="M14 27l8 8 16-17"/></svg>' +
        "</div>" +
        '<h4 class="form-success-title">Message sent!</h4>' +
        '<p class="form-success-text">Thank you for reaching out — I will get back to you as soon as possible, usually within a day or two.</p>' +
        '<button type="button" class="btn btn-outline btn-sm" id="formAgainBtn">Send another message</button>';
      form.style.display = "none";
      form.parentElement.appendChild(done);
      var again = done.querySelector("#formAgainBtn");
      again.addEventListener("click", function () {
        done.remove();
        form.reset();
        form.style.display = "";
        status.textContent = "";
        status.className = "form-status";
        form.querySelector("input[name=name]").focus();
      });
    }
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
      // Close the mobile menu with Escape (keyboard users)
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && navList.classList.contains("open")) {
          navList.classList.remove("open");
          toggle.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
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

  /* ---------- preloader ---------- */
  function hidePreloader() {
    var p = document.getElementById("preloader");
    if (p && !p.classList.contains("done")) p.classList.add("done");
  }
  // Safety net: never trap the visitor on the loader
  setTimeout(hidePreloader, 4000);

  /* ---------- boot ---------- */
  initTheme();
  initContactForm();
  initNav();
  fetch("/api/content?cb=" + Date.now()) // cache-buster: always fetch fresh content
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window.__roles__ = data.profile.roles || [];
      render(data);
      // Fade out once the page above the fold has settled
      setTimeout(hidePreloader, 250);
    })
    .catch(function (err) {
      document.body.insertAdjacentHTML("afterbegin",
        '<div style="padding:12px;background:#7f1d1d;color:#fff;font-family:sans-serif">Failed to load content: ' + esc(err.message) + "</div>");
      hidePreloader();
    });
})();
