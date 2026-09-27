/* =====================================================
   Portfolio Admin — login, tabbed editors, CRUD, uploads
   ===================================================== */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  var TOKEN = sessionStorage.getItem("cms_token") || "";
  var DATA = null;          // whole content object
  var TAB = "hero";
  var UPLOADS_CACHE = [];   // [{name,url,size}]

  /* ---------------- api helpers ---------------- */
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers);
    if (TOKEN) opts.headers["Authorization"] = "Bearer " + TOKEN;
    if (opts.body && typeof opts.body !== "string") {
      opts.body = JSON.stringify(opts.body);
      opts.headers["Content-Type"] = "application/json";
    }
    return fetch(path, opts).then(function (res) {
      if (res.status === 401 && path !== "/api/login") {
        showLogin();
        throw new Error("Session expired — please sign in again");
      }
      return res.json().then(function (j) {
        if (!res.ok) throw new Error(j.error || res.statusText);
        return j;
      });
    });
  }

  function toast(msg, isErr) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("error", !!isErr);
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- auth ---------------- */
  function showLogin() {
    TOKEN = "";
    sessionStorage.removeItem("cms_token");
    $("#loginView").hidden = false;
    $("#appView").hidden = true;
  }

  function showApp() {
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
  }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var user = $("#loginUser").value.trim();
    var pass = $("#loginPass").value;
    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.token) {
        TOKEN = j.token;
        sessionStorage.setItem("cms_token", TOKEN);
        $("#loginError").hidden = true;
        boot();
      } else {
        $("#loginError").hidden = false;
      }
    }).catch(function () { $("#loginError").hidden = false; });
  });

  $("#logoutBtn").addEventListener("click", function () {
    api("/api/logout", { method: "POST" }).catch(function () {});
    showLogin();
  });

  /* ---------------- save ---------------- */
  $("#saveBtn").addEventListener("click", function () {
    api("/api/content", { method: "PUT", body: DATA })
      .then(function () { toast("✅ Saved — refresh the public site to see changes"); })
      .catch(function (err) { toast("Save failed: " + err.message, true); });
  });

  /* ---------------- tabs ---------------- */
  $("#sideNav").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    TAB = btn.dataset.tab;
    $$("#sideNav button").forEach(function (b) { b.classList.toggle("active", b === btn); });
    renderTab();
  });

  /* ============================================================
     small field helpers — bind inputs to DATA paths
     ============================================================ */
  function getField(obj, key, label, opts) {
    opts = opts || {};
    var type = opts.type || "text";
    return '<label class="field">' + esc(label) +
      (type === "textarea"
        ? '<textarea data-bind="' + key + '" rows="' + (opts.rows || 3) + '">' + esc(obj[key] || "") + "</textarea>"
        : '<input type="' + type + '" data-bind="' + key + '" value="' + esc(obj[key] == null ? "" : obj[key]) + '">') +
      "</label>";
  }

  function bindFields(root) {
    $$("[data-bind]", root).forEach(function (input) {
      input.addEventListener("input", function () {
        var key = input.dataset.bind;
        DATA[TAB === "hero" ? "profile" : TAB][key] =
          input.type === "number" ? parseFloat(input.value) || 0 : input.value;
      });
    });
  }

  /* ---------------- image picker ---------------- */
  function imagePicker(sectionKey, itemKey) {
    // returns HTML + wires events after insertion via wireImagePicker()
    var section = DATA[sectionKey];
    var hasItem = itemKey !== null && itemKey !== undefined && itemKey !== "";
    var list = section ? (section.items || section.jobs || section.cards || []) : [];
    var item = hasItem ? list[itemKey] : section;
    if (!item) return "";
    var current = item.image || "";
    var pvId = "pv-" + sectionKey + "-" + (hasItem ? itemKey : "root");
    return (
      '<label class="field">Image (optional)' +
        '<div class="img-picker">' +
          '<img class="img-preview" src="' + esc(current) + '" onerror="this.style.display=\'none\'" id="' + pvId + '">' +
          '<div class="stack">' +
            '<input type="text" placeholder="uploads/example.jpg or https://…" value="' + esc(current) + '" data-imgpath="' + sectionKey + "|" + (hasItem ? itemKey : "") + '">' +
            '<div class="upload-row">' +
              '<input type="file" accept="image/*" data-uploadfor="' + sectionKey + "|" + (hasItem ? itemKey : "") + '">' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</label>"
    );
  }

  function wireImagePickers(root) {
    // text inputs
    $$("input[data-imgpath]", root).forEach(function (input) {
      input.addEventListener("input", function () {
        var parts = input.dataset.imgpath.split("|");
        var target = DATA[parts[0]];
        if (parts[1] !== "") target = (target.items || target.jobs || [])[parseInt(parts[1], 10)];
        target.image = input.value;
      });
    });
    // file uploads
    $$("input[type=file][data-uploadfor]", root).forEach(function (input) {
      input.addEventListener("change", function () {
        var file = input.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append("file", file);
        fetch("/api/upload", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: fd })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j.url) {
              var parts = input.dataset.uploadfor.split("|");
              var target = DATA[parts[0]];
              if (parts[1] !== "") target = (target.items || target.jobs || [])[parseInt(parts[1], 10)];
              target.image = j.url;
              toast("Uploaded: " + j.name);
              renderTab(); // re-render to show preview
            } else {
              toast(j.error || "Upload failed", true);
            }
          })
          .catch(function (err) { toast("Upload failed: " + err.message, true); });
      });
    });
  }

  /* ============================================================
     TABS
     ============================================================ */
  var renderers = {

    /* ---------------- HERO ---------------- */
    hero: function () {
      var p = DATA.profile;
      var html = '<div class="panel"><h2>Hero &amp; Profile</h2>' +
        '<div class="field-row">' + getField(p, "name", "Name") + getField(p, "kicker", "Kicker (small text above name)") + "</div>" +
        getField(p, "summary", "Summary", { type: "textarea", rows: 3 }) +
        getField(p, "photo", "Profile photo URL") +
        '<div class="upload-row"><input type="file" accept="image/*" id="heroPhotoFile"><span class="hint">Upload new profile photo</span></div>' +
        '<div class="field"><label>Rotating role titles (one per line)</label>' +
          '<textarea rows="5" id="rolesBox">' + esc((p.roles || []).join("\n")) + "</textarea></div>" +
        "</div>";

      html += '<div class="panel"><h2>Hero statistics</h2><p class="hint">Numbers count up when the page loads.</p><div class="editor-list" id="statList"></div>' +
        '<button class="btn btn-ghost btn-sm" id="addStat">+ Add stat</button></div>';

      html += '<div class="panel"><h2>CV file</h2><p class="hint">Shown on the "Download CV" button. Leave empty to hide the button.</p>' +
        getField(DATA.footer, "cvFile", "CV file URL (e.g. salaithantzawwin.docx)") + "</div>";

      $("#main").innerHTML = html;

      // stats editor
      function drawStats() {
        $("#statList").innerHTML = (p.stats || []).map(function (s, i) {
          return '<div class="editor-item"><div class="editor-item-head"><span class="title">Stat #' + (i + 1) + "</span>" +
            '<button class="icon-btn danger" data-delstat="' + i + '">Delete</button></div>' +
            '<div class="field-row-3">' +
              '<label class="field">Value<input type="number" step="any" data-stat="' + i + '" data-statkey="value" value="' + esc(s.value) + '"></label>' +
              '<label class="field">Suffix<input data-stat="' + i + '" data-statkey="suffix" value="' + esc(s.suffix) + '"></label>' +
              '<label class="field">Label<input data-stat="' + i + '" data-statkey="label" value="' + esc(s.label) + '"></label>' +
            "</div></div>";
        }).join("");
      }
      drawStats();
      $("#statList").addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.stat != null) {
          var i = +t.dataset.stat, k = t.dataset.statkey;
          p.stats[i][k] = k === "value" ? parseFloat(t.value) || 0 : t.value;
        }
      });
      $("#statList").addEventListener("click", function (e) {
        var del = e.target.closest("[data-delstat]");
        if (del) { p.stats.splice(+del.dataset.delstat, 1); drawStats(); }
      });
      $("#addStat").addEventListener("click", function () {
        p.stats.push({ value: 10, suffix: "", label: "New stat" });
        drawStats();
      });

      // roles
      $("#rolesBox").addEventListener("input", function () {
        p.roles = this.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      });

      // photo upload
      $("#heroPhotoFile").addEventListener("change", function () {
        var file = this.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append("file", file);
        fetch("/api/upload", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: fd })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j.url) { p.photo = j.url; toast("Photo uploaded"); renderTab(); }
            else toast(j.error || "Upload failed", true);
          });
      });

      bindFields($("#main"));
    },

    /* ---------------- ABOUT ---------------- */
    about: function () {
      var a = DATA.about;
      $("#main").innerHTML = '<div class="panel"><h2>About section</h2>' +
        '<div class="field-row">' + getField(a, "kicker", "Kicker") + getField(a, "title", "Title") + "</div>" +
        '<div class="field"><label>Paragraphs (blank line = new paragraph)</label>' +
          '<textarea rows="6" id="paraBox">' + esc((a.paragraphs || []).join("\n\n")) + "</textarea></div>" +
        "</div>" +
        '<div class="panel"><h2>Facts list</h2><div class="editor-list" id="factList"></div>' +
        '<button class="btn btn-ghost btn-sm" id="addFact">+ Add fact</button></div>';

      $("#paraBox").addEventListener("input", function () {
        a.paragraphs = this.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      });

      function drawFacts() {
        $("#factList").innerHTML = (a.facts || []).map(function (f, i) {
          return '<div class="editor-item"><div class="editor-item-head"><span class="title">' + esc(f.label || "Fact") + "</span>" +
            '<button class="icon-btn danger" data-del="' + i + '">Delete</button></div>' +
            '<div class="field-row"><label class="field">Label<input data-fact="' + i + '" data-fk="label" value="' + esc(f.label) + '"></label>' +
            '<label class="field">Value<input data-fact="' + i + '" data-fk="value" value="' + esc(f.value) + '"></label></div>' +
            '<label class="field">Link (optional)<input data-fact="' + i + '" data-fk="link" value="' + esc(f.link || "") + '"></label></div>';
        }).join("");
      }
      drawFacts();
      $("#factList").addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.fact != null) a.facts[+t.dataset.fact][t.dataset.fk] = t.value;
      });
      $("#factList").addEventListener("click", function (e) {
        var del = e.target.closest("[data-del]");
        if (del) { a.facts.splice(+del.dataset.del, 1); drawFacts(); }
      });
      $("#addFact").addEventListener("click", function () {
        a.facts.push({ label: "New", value: "", link: "" });
        drawFacts();
      });

      bindFields($("#main"));
    },

    /* ---------------- EXPERIENCE ---------------- */
    experience: function () {
      var sec = DATA.experience;
      var html = '<div class="panel"><h2>Experience section</h2><div class="field-row">' +
        getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div></div>" +
        '<div class="panel"><h2>Jobs</h2><p class="hint">Shown in order — first job appears at the top.</p>' +
        '<div class="editor-list" id="jobList"></div><button class="btn btn-ghost btn-sm" id="addJob">+ Add job</button></div>';
      $("#main").innerHTML = html;

      function drawJobs() {
        $("#jobList").innerHTML = (sec.jobs || []).map(function (j, i) {
          return '<div class="editor-item">' +
            '<div class="editor-item-head"><span class="title">' + esc(j.role || "Job") + "</span>" +
              '<div class="editor-item-actions">' +
                '<button class="icon-btn" data-up="' + i + '">↑</button>' +
                '<button class="icon-btn" data-down="' + i + '">↓</button>' +
                '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
              "</div></div>" +
            '<div class="field-row">' +
              '<label class="field">Icon / emoji<input data-job="' + i + '" data-jk="icon" value="' + esc(j.icon || "") + '"></label>' +
              '<label class="field">Role / job title<input data-job="' + i + '" data-jk="role" value="' + esc(j.role) + '"></label>' +
            "</div>" +
            '<div class="field-row">' +
              '<label class="field">Company<input data-job="' + i + '" data-jk="company" value="' + esc(j.company) + '"></label>' +
              '<label class="field">Period<input data-job="' + i + '" data-jk="period" value="' + esc(j.period) + '"></label>' +
            "</div>" +
            '<label class="field checkline"><input type="checkbox" data-job="' + i + '" data-jk="current"' + (j.current ? " checked" : "") + '> Show "Current" badge</label>' +
            '<label class="field">Bullet points (one per line)<textarea rows="6" data-job="' + i + '" data-jk="bulletsText">' + esc((j.bullets || []).join("\n")) + "</textarea></label>" +
            "</div>";
        }).join("");
      }

      var list = $("#jobList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.job == null) return;
        var j = sec.jobs[+t.dataset.job];
        if (t.dataset.jk === "bulletsText") {
          j.bullets = t.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        } else if (t.dataset.jk === "current") {
          j.current = t.checked;
        } else {
          j[t.dataset.jk] = t.value;
        }
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.jobs.splice(+b.dataset.del, 1); drawJobs(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var tmp = sec.jobs[i - 1]; sec.jobs[i - 1] = sec.jobs[i]; sec.jobs[i] = tmp; drawJobs(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.jobs.length - 1) { var tmp2 = sec.jobs[i2 + 1]; sec.jobs[i2 + 1] = sec.jobs[i2]; sec.jobs[i2] = tmp2; drawJobs(); }
        }
      });
      $("#addJob").addEventListener("click", function () {
        sec.jobs.push({ id: uid("job"), role: "New role", company: "", period: "", current: false, icon: "💼", bullets: [] });
        drawJobs();
      });

      drawJobs();
      bindFields($("#main"));
    },

    /* ---------------- PROJECTS ---------------- */
    projects: function () {
      var sec = DATA.projects;
      $("#main").innerHTML = '<div class="panel"><h2>Projects section</h2><div class="field-row">' +
        getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div></div>" +
        '<div class="panel"><h2>Project cards</h2><p class="hint">Use <code>{highlight}</code> inside the description to show the highlighted text (e.g. 80%).</p>' +
        '<div class="editor-list" id="projList"></div><button class="btn btn-ghost btn-sm" id="addProj">+ Add project</button></div>';

      function drawProjs() {
        $("#projList").innerHTML = (sec.items || []).map(function (p2, i) {
          return '<div class="editor-item">' +
            '<div class="editor-item-head"><span class="title">' + esc(p2.title || "Project") + "</span>" +
              '<div class="editor-item-actions">' +
                '<button class="icon-btn" data-up="' + i + '">↑</button>' +
                '<button class="icon-btn" data-down="' + i + '">↓</button>' +
                '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
              "</div></div>" +
            '<div class="field-row-3">' +
              '<label class="field">Icon<input data-proj="' + i + '" data-pk="icon" value="' + esc(p2.icon || "") + '"></label>' +
              '<label class="field">Title<input data-proj="' + i + '" data-pk="title" value="' + esc(p2.title) + '"></label>' +
              '<label class="field">Highlight<input data-proj="' + i + '" data-pk="highlight" value="' + esc(p2.highlight || "") + '"></label>' +
            "</div>" +
            '<label class="field">Description<textarea rows="3" data-proj="' + i + '" data-pk="description">' + esc(p2.description) + "</textarea></label>" +
            imagePicker("projects", i) +
            "</div>";
        }).join("");
        wireImagePickers($("#projList"));
      }

      var list = $("#projList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.proj != null) sec.items[+t.dataset.proj][t.dataset.pk] = t.value;
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.items.splice(+b.dataset.del, 1); drawProjs(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var t = sec.items[i - 1]; sec.items[i - 1] = sec.items[i]; sec.items[i] = t; drawProjs(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.items.length - 1) { var t2 = sec.items[i2 + 1]; sec.items[i2 + 1] = sec.items[i2]; sec.items[i2] = t2; drawProjs(); }
        }
      });
      $("#addProj").addEventListener("click", function () {
        sec.items.push({ id: uid("proj"), icon: "🚀", title: "New project", description: "", highlight: "", image: "" });
        drawProjs();
      });

      drawProjs();
      bindFields($("#main"));
    },

    /* ---------------- SKILLS ---------------- */
    skills: function () {
      var sec = DATA.skills;
      $("#main").innerHTML = '<div class="panel"><h2>Skills section</h2><div class="field-row">' +
        getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div></div>" +
        '<div class="panel"><h2>Skill cards</h2><div class="editor-list" id="skillList"></div>' +
        '<button class="btn btn-ghost btn-sm" id="addSkill">+ Add skill</button></div>';

      function draw() {
        $("#skillList").innerHTML = (sec.items || []).map(function (s, i) {
          return '<div class="editor-item"><div class="editor-item-head"><span class="title">' + esc(s.name || "Skill") + "</span>" +
            '<div class="editor-item-actions">' +
              '<button class="icon-btn" data-up="' + i + '">↑</button>' +
              '<button class="icon-btn" data-down="' + i + '">↓</button>' +
              '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
            "</div></div>" +
            '<div class="field-row">' +
              '<label class="field">Icon / emoji<input data-sk="' + i + '" data-sk-k="icon" value="' + esc(s.icon || "") + '"></label>' +
              '<label class="field">Name<input data-sk="' + i + '" data-sk-k="name" value="' + esc(s.name) + '"></label>' +
            "</div></div>";
        }).join("");
      }
      var list = $("#skillList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.sk != null) sec.items[+t.dataset.sk][t.dataset.skK] = t.value;
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.items.splice(+b.dataset.del, 1); draw(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var t = sec.items[i - 1]; sec.items[i - 1] = sec.items[i]; sec.items[i] = t; draw(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.items.length - 1) { var t2 = sec.items[i2 + 1]; sec.items[i2 + 1] = sec.items[i2]; sec.items[i2] = t2; draw(); }
        }
      });
      $("#addSkill").addEventListener("click", function () {
        sec.items.push({ id: uid("skill"), icon: "•", name: "New skill" });
        draw();
      });

      draw();
      bindFields($("#main"));
    },

    /* ---------------- CERTIFICATIONS ---------------- */
    certifications: function () {
      var sec = DATA.certifications;
      $("#main").innerHTML = '<div class="panel"><h2>Certifications section</h2><div class="field-row">' +
        getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div></div>" +
        '<div class="panel"><h2>Certificates</h2><p class="hint">Upload the certificate image to show it beside the name.</p>' +
        '<div class="editor-list" id="certList"></div><button class="btn btn-ghost btn-sm" id="addCert">+ Add certification</button></div>';

      function draw() {
        $("#certList").innerHTML = (sec.items || []).map(function (c, i) {
          return '<div class="editor-item">' +
            '<div class="editor-item-head"><span class="title">' + esc(c.name || "Certificate") + "</span>" +
              '<div class="editor-item-actions">' +
                '<button class="icon-btn" data-up="' + i + '">↑</button>' +
                '<button class="icon-btn" data-down="' + i + '">↓</button>' +
                '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
              "</div></div>" +
            '<div class="field-row-3">' +
              '<label class="field">Icon<input data-c="' + i + '" data-ck="icon" value="' + esc(c.icon || "") + '"></label>' +
              '<label class="field">Name<input data-c="' + i + '" data-ck="name" value="' + esc(c.name) + '"></label>' +
              '<label class="field">Issuer / year<input data-c="' + i + '" data-ck="issuer" value="' + esc(c.issuer || "") + '"></label>' +
            "</div>" +
            imagePicker("certifications", i) +
            "</div>";
        }).join("");
        wireImagePickers($("#certList"));
      }

      var list = $("#certList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.c != null) sec.items[+t.dataset.c][t.dataset.ck] = t.value;
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.items.splice(+b.dataset.del, 1); draw(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var t = sec.items[i - 1]; sec.items[i - 1] = sec.items[i]; sec.items[i] = t; draw(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.items.length - 1) { var t2 = sec.items[i2 + 1]; sec.items[i2 + 1] = sec.items[i2]; sec.items[i2] = t2; draw(); }
        }
      });
      $("#addCert").addEventListener("click", function () {
        sec.items.push({ id: uid("cert"), icon: "🎓", name: "New certification", issuer: "", image: "" });
        draw();
      });

      draw();
      bindFields($("#main"));
    },

    /* ---------------- EDUCATION ---------------- */
    education: function () {
      var sec = DATA.education;
      $("#main").innerHTML = '<div class="panel"><h2>Education section</h2><div class="field-row">' +
        getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div></div>" +
        '<div class="panel"><h2>Degrees</h2><div class="editor-list" id="eduList"></div>' +
        '<button class="btn btn-ghost btn-sm" id="addEdu">+ Add education</button></div>';

      function draw() {
        $("#eduList").innerHTML = (sec.items || []).map(function (ed, i) {
          return '<div class="editor-item">' +
            '<div class="editor-item-head"><span class="title">' + esc(ed.degree || "Degree") + "</span>" +
              '<div class="editor-item-actions">' +
                '<button class="icon-btn" data-up="' + i + '">↑</button>' +
                '<button class="icon-btn" data-down="' + i + '">↓</button>' +
                '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
              "</div></div>" +
            '<div class="field-row-3">' +
              '<label class="field">Icon<input data-e="' + i + '" data-ek="icon" value="' + esc(ed.icon || "") + '"></label>' +
              '<label class="field">Degree<input data-e="' + i + '" data-ek="degree" value="' + esc(ed.degree) + '"></label>' +
              '<label class="field">Period<input data-e="' + i + '" data-ek="period" value="' + esc(ed.period || "") + '"></label>' +
            "</div>" +
            '<label class="field">School<input data-e="' + i + '" data-ek="school" value="' + esc(ed.school) + '"></label>' +
            "</div>";
        }).join("");
      }
      var list = $("#eduList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.e != null) sec.items[+t.dataset.e][t.dataset.ek] = t.value;
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.items.splice(+b.dataset.del, 1); draw(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var t = sec.items[i - 1]; sec.items[i - 1] = sec.items[i]; sec.items[i] = t; draw(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.items.length - 1) { var t2 = sec.items[i2 + 1]; sec.items[i2 + 1] = sec.items[i2]; sec.items[i2] = t2; draw(); }
        }
      });
      $("#addEdu").addEventListener("click", function () {
        sec.items.push({ id: uid("edu"), icon: "🎓", degree: "New degree", school: "", period: "" });
        draw();
      });

      draw();
      bindFields($("#main"));
    },

    /* ---------------- CONTACT ---------------- */
    contact: function () {
      var sec = DATA.contact;
      $("#main").innerHTML = '<div class="panel"><h2>Contact section</h2>' +
        '<div class="field-row">' + getField(sec, "kicker", "Kicker") + getField(sec, "title", "Title") + "</div>" +
        getField(sec, "lead", "Lead text", { type: "textarea", rows: 2 }) +
        "</div>" +
        '<div class="panel"><h2>Contact cards</h2><div class="editor-list" id="conList"></div>' +
        '<button class="btn btn-ghost btn-sm" id="addCon">+ Add contact card</button></div>';

      function draw() {
        $("#conList").innerHTML = (sec.cards || []).map(function (c, i) {
          return '<div class="editor-item">' +
            '<div class="editor-item-head"><span class="title">' + esc(c.label || "Card") + "</span>" +
              '<div class="editor-item-actions">' +
                '<button class="icon-btn" data-up="' + i + '">↑</button>' +
                '<button class="icon-btn" data-down="' + i + '">↓</button>' +
                '<button class="icon-btn danger" data-del="' + i + '">Delete</button>' +
              "</div></div>" +
            '<div class="field-row-3">' +
              '<label class="field">Icon<input data-cc="' + i + '" data-ck="icon" value="' + esc(c.icon || "") + '"></label>' +
              '<label class="field">Label<input data-cc="' + i + '" data-ck="label" value="' + esc(c.label) + '"></label>' +
              '<label class="field">Value<input data-cc="' + i + '" data-ck="value" value="' + esc(c.value) + '"></label>' +
            "</div>" +
            '<label class="field">Link (mailto:, tel:, https://…)<input data-cc="' + i + '" data-ck="link" value="' + esc(c.link || "") + '"></label>' +
            "</div>";
        }).join("");
      }
      var list = $("#conList");
      list.addEventListener("input", function (e) {
        var t = e.target;
        if (t.dataset.cc != null) sec.cards[+t.dataset.cc][t.dataset.ck] = t.value;
      });
      list.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-del]"))) { sec.cards.splice(+b.dataset.del, 1); draw(); }
        else if ((b = e.target.closest("[data-up]"))) {
          var i = +b.dataset.up;
          if (i > 0) { var t = sec.cards[i - 1]; sec.cards[i - 1] = sec.cards[i]; sec.cards[i] = t; draw(); }
        } else if ((b = e.target.closest("[data-down]"))) {
          var i2 = +b.dataset.down;
          if (i2 < sec.cards.length - 1) { var t2 = sec.cards[i2 + 1]; sec.cards[i2 + 1] = sec.cards[i2]; sec.cards[i2] = t2; draw(); }
        }
      });
      $("#addCon").addEventListener("click", function () {
        sec.cards.push({ id: uid("con"), icon: "•", label: "New card", value: "", link: "" });
        draw();
      });

      draw();
      bindFields($("#main"));
    },

    /* ---------------- FILES ---------------- */
    files: function () {
      $("#main").innerHTML = '<div class="panel"><h2>Media files</h2>' +
        '<p class="hint">Upload images here and copy their URL into any image field.</p>' +
        '<div class="upload-row" style="margin-bottom:16px">' +
          '<input type="file" id="bulkFile" accept="image/*" multiple>' +
          '<button class="btn btn-primary btn-sm" id="bulkUpload">Upload</button>' +
        "</div>" +
        '<div class="files-grid" id="filesGrid"></div></div>';

      function drawFiles() {
        var grid = $("#filesGrid");
        if (!UPLOADS_CACHE.length) {
          grid.innerHTML = '<p class="hint">No files uploaded yet.</p>';
          return;
        }
        grid.innerHTML = UPLOADS_CACHE.map(function (f) {
          var isImg = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name);
          return '<div class="file-card">' +
            (isImg ? '<img src="' + esc(f.url) + '" alt="">' : '<div class="file-ext">📄</div>') +
            '<div class="meta">' + esc(f.name) + "</div>" +
            '<div class="actions">' +
              '<button class="icon-btn" data-copy="' + esc(f.url) + '">Copy URL</button>' +
              '<button class="icon-btn danger" data-delfile="' + esc(f.name) + '">Delete</button>' +
            "</div></div>";
        }).join("");
      }

      function loadFiles() {
        api("/api/files").then(function (j) {
          UPLOADS_CACHE = j.files || [];
          drawFiles();
        }).catch(function (err) { toast(err.message, true); });
      }

      $("#bulkUpload").addEventListener("click", function () {
        var files = $("#bulkFile").files;
        if (!files.length) return toast("Choose file(s) first", true);
        var done = 0, total = files.length;
        Array.prototype.forEach.call(files, function (file) {
          var fd = new FormData();
          fd.append("file", file);
          fetch("/api/upload", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: fd })
            .then(function (r) { return r.json(); })
            .then(function () {
              if (++done === total) { toast("Uploaded " + total + " file(s)"); loadFiles(); }
            });
        });
      });

      $("#filesGrid").addEventListener("click", function (e) {
        var copy = e.target.closest("[data-copy]");
        if (copy) {
          var url = location.origin + "/" + copy.dataset.copy;
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(function () { toast("URL copied"); })
            .catch(function () { toast(url, true); });
          return;
        }
        var del = e.target.closest("[data-delfile]");
        if (del) {
          if (!confirm("Delete " + del.dataset.delfile + "?")) return;
          api("/api/files?name=" + encodeURIComponent(del.dataset.delfile), { method: "DELETE" })
            .then(function () { toast("Deleted"); loadFiles(); })
            .catch(function (err) { toast(err.message, true); });
        }
      });

      loadFiles();
    }
  };

  function renderTab() {
    (renderers[TAB] || renderers.hero)();
  }

  // debug handle (used by automated tests)
  window.__ADMIN_DEBUG__ = { getData: function () { return DATA; }, setTab: function (t) { TAB = t; renderTab(); }, getTab: function () { return TAB; } };

  /* ---------------- boot ---------------- */
  function boot() {
    showApp();
    api("/api/content").then(function (data) {
      DATA = data;
      $$("#sideNav button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.tab === TAB);
      });
      renderTab();
    }).catch(function (err) {
      toast(err.message, true);
    });
  }

  if (TOKEN) {
    // validate stored token by fetching content
    api("/api/content").then(boot).catch(showLogin);
  } else {
    showLogin();
  }
})();
