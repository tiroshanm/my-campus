/* Analytics (ANA-01..03) and administration screens */
(function (A) {
  "use strict";
  const esc = A.esc, S = () => A.state();
  const ui = () => (S().ui = S().ui || {});

  /* ---------------- analytics ---------------- */
  let anTab = "desc";
  A.route("an", {
    roles: ["exam", "hod", "dean", "coord"], title: "Academic analytics", nav: "Analytics", group: "Insight",
    desc: "Sample figures. In the real system these come from the reporting database, refreshed nightly.", req: ["ANA-01", "ANA-02", "ANA-03"],
    render(el) {
      el.innerHTML = `${A.tabs("an-tabs", [["desc", "Descriptive"], ["diag", "Diagnostic"], ["pred", "Predictive"]], anTab)}<div id="an-body" class="stack"></div>`;
      const b = A.$("#an-body");
      if (anTab === "desc") {
        const sh = S().sheets.find((s) => s.state === "Released") || S().sheets[2];
        const dist = {}; sh.roster.forEach((_, i) => { const g = A.computeRow(sh, i).final; if (g) dist[g] = (dist[g] || 0) + 1; });
        const att = [92, 88, 85, 90, 79, 83, 87, 76, 81, 84].map((v, i) => ({ k: "W" + (i + 1), v }));
        b.innerHTML = `<div class="grid g4">${A.stat("2.94", "Faculty mean GPA", "2025/26")}${A.stat("86%", "Pass rate at C or better", "all modules")}${A.stat("84%", "Mean lecture attendance", "Semester II")}${A.stat("71", "Mean CA mark", "Semester II")}</div>
          <div class="grid g2"><section class="card"><header><h2>Grade distribution · ${esc(sh.code)}</h2></header>${A.barChart(A.GRADES.map((g) => ({ k: g[1], v: dist[g[1]] || 0 })), { h: 230 })}</section>
          <section class="card"><header><h2>Attendance by week · COSC 21063</h2></header>${A.barChart(att, { h: 230, color: "var(--info)", max: 100, fmt: (v) => v + "%" })}</section></div>`;
      } else if (anTab === "diag") {
        const mods = [["COSC 12043", 91], ["PHYS 12542", 78], ["PMAT 12253", 64], ["STAT 12643", 82], ["CHEM 12642", 74], ["ZOOL 12703", 88], ["MIBI 12514", 85], ["SENG 12213", 93]];
        const gpaBands = [["< 2.0", 6], ["2.0–2.5", 18], ["2.5–3.0", 31], ["3.0–3.3", 22], ["3.3–3.7", 15], ["≥ 3.7", 8]];
        b.innerHTML = `<div class="grid g2"><section class="card"><header><h2>Pass rate (C or better) by module</h2></header>${A.barChart(mods.map(([k, v]) => ({ k: k.split(" ")[0], v, color: v < 70 ? "var(--bad)" : v < 80 ? "var(--warn)" : "var(--ok)" })), { h: 240, max: 100, fmt: (v) => v + "%" })}<p class="small muted" style="margin:0">PMAT 12253 is well below the Faculty average. Worth checking with the department.</p></section>
          <section class="card"><header><h2>GPA distribution · Year 2 Physical Science</h2></header>${A.barChart(gpaBands.map(([k, v]) => ({ k, v })), { h: 240, color: "var(--accent)", fmt: (v) => v + "%" })}</section></div>
          <section class="card flush"><header><h2>Results comparison · this year vs last year</h2></header>${A.table([{ label: "Module", code: true, key: "m" }, { label: "2024/25 mean", num: true, key: "a" }, { label: "2025/26 mean", num: true, key: "b" }, { label: "Change", num: true, render: (r) => `<b style="color:var(${r.b >= r.a ? "--ok" : "--bad"})">${r.b >= r.a ? "+" : ""}${(r.b - r.a).toFixed(1)}</b>` }], mods.map(([m], i) => ({ m, a: 55 + i * 2.1, b: 55 + i * 2.1 + ((i % 3) - 1) * 3.4 })))}</section>`;
      } else {
        const yrs = ["2022", "2023", "2024", "2025", "2026", "2027", "2028"];
        b.innerHTML = `<div class="grid g2"><section class="card"><header><h2>Mean GPA by intake, with forecast</h2></header>${A.lineChart([{ name: "Physical", color: "var(--accent)", values: [2.81, 2.86, 2.9, 2.93, 2.95, 2.97, 2.99] }, { name: "Biological", color: "var(--ok)", values: [2.88, 2.9, 2.87, 2.94, 2.96, 2.98, 3.0] }], yrs, { min: 2.6, max: 3.1, dashedFrom: 4, fmt: (v) => v.toFixed(2) })}${A.legend([["var(--accent)", "Physical Science"], ["var(--ok)", "Biological Science"]])}</section>
          <section class="card"><header><h2>Enrolment, with forecast</h2></header>${A.lineChart([{ name: "Total intake", color: "var(--info)", values: [1020, 1065, 1090, 1130, 1150, 1185, 1210] }], yrs, { min: 900, max: 1300, dashedFrom: 4 })}</section></div>
          <section class="card flush"><header><h2>Students who may need support (early warning)</h2></header>${A.table([{ label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "GPA", num: true, render: (s) => s.gpa.toFixed(2) }, { label: "Signal", render: (s) => A.pill(s.gpa < 2.2 ? "GPA below 2.20" : "Falling GPA", "warn") }], S().students.filter((s) => s.gpa < 2.35).slice(0, 8))}</section>`;
      }
      A.$$("#an-tabs [data-tab]").forEach((x) => x.onclick = () => { anTab = x.dataset.tab; A.rerender(); });
    },
  });

  /* ---------------- admin: catalogue ---------------- */
  A.route("a-cat", {
    roles: ["admin"], title: "Course catalogue", nav: "Course catalogue", group: "Administration",
    desc: "Course units, credits and requisites for the 2023/24 edition, loaded from the Student Handbook.", req: ["REG-03", "REG-15"],
    render(el) {
      const q = (ui().cq || "PHYS 3").toUpperCase(); const U = window.CATALOG.UNITS, PQ = window.CATALOG.PREQ;
      const list = Object.keys(U).filter((k) => (k + U[k][0]).toUpperCase().includes(q.replace(" ", ""))).slice(0, 60).map((k) => k.slice(0, 4) + " " + k.slice(4));
      el.innerHTML = `<section class="card flush"><header><h2>${Object.keys(U).length} course units</h2><div class="sp"><input class="search" id="cq" value="${esc(ui().cq || "PHYS 3")}" placeholder="Search code or title" aria-label="Search units">${A.pill("Edition 2023/24 · published", "acc")}</div></header>
        ${A.table([{ label: "Code", code: true, render: (c) => c }, { label: "Title", render: (c) => esc(A.unitInfo(c).title) }, { label: "Level", num: true, render: (c) => c[5] }, { label: "Credits", num: true, render: (c) => c[9] }, { label: "Prerequisites", render: (c) => `<span class="small">${esc((PQ[c] || [])[0] || "—")}</span>` }, { label: "Co-requisites", render: (c) => `<span class="small">${esc((PQ[c] || [])[1] || "—")}</span>` }, { label: "Handbook", render: (c) => (PQ[c] || [])[2] ? `p.${PQ[c][2]}` : "" }], list)}</section>`;
      A.$("#cq").oninput = (e) => { ui().cq = e.target.value; clearTimeout(ui()._t); ui()._t = setTimeout(() => { A.rerender(); const s = A.$("#cq"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); };
    },
  });

  /* ---------------- admin: rule sets ---------------- */
  const RULES = {
    "gate.hons.zoology": `ruleset: gate.hons.zoology\nedition: 2023/24\nallOf:\n  - gpaAtLeast: { scope: all.y1-2, value: 3.00 }\n  - unitsAtLeast: { scope: subject(ZOOL).compulsory.y1-2, grade: C }\n  - maxCredits: { scope: all.y1-2, grades: [D, D+, C-], max: 8 }\n  - noGrade: { scope: all.y1-2, grade: E }\n  - minCredits:\n      scope: union(subject(ZOOL).compulsory.y1-2, units[BIOL 11552, BIOL 11512, BIOL 11522])\n      gradeAtLeast: B\n      min: 20`,
    "award.bsc": `ruleset: award.bsc\nedition: 2023/24\nallOf:\n  - minCredits: { scope: all.y1-2, gradeAtLeast: D, min: 60 }\n  - minCredits: { scope: all.y1-3, gradeAtLeast: D, min: 90 }\n  - perPeriod: { by: year, minCredits: 30 }\n  - minCredits: { scope: all.y1-3, gradeAtLeast: C, min: 72 }\n  - twoSubjects: { gradeAtLeast: C, eachMin: 24, totalMin: 48, onePractical: true }\n  - gpaAtLeast: { scope: all.y1-3, value: 2.00 }\n  - withinYears: 5`,
    "class.bsc.first": `ruleset: class.bsc.first\nallOf:\n  - minCredits: { scope: award, gradeAtLeast: C, min: 90 }\n  - shareAtLeast: { scope: award, gradeAtLeast: A, fraction: 0.5 }\n  - gpaAtLeast: { scope: award, value: 3.70 }\n  - withinYears: 3`,
    "registration.credit-load": `ruleset: registration.credit-load\nallOf:\n  - minCredits: { scope: registration.year, min: 30, severity: warning }\n  - maxCredits: { scope: registration.otherFaculty.semester, max: 2 }\n  - maxCredits: { scope: registration.otherFaculty.y1-3, max: 6 }`,
    "grade.repeat": `ruleset: grade.repeat\n# §2.3 a re-sit can earn at most C; a lower re-sit grade never replaces the previous grade\nresult: max(previous, min(C, resit))`,
  };
  A.route("a-rules", {
    roles: ["admin"], title: "Regulations (rule sets)", nav: "Rule sets", group: "Administration",
    desc: "Degree, class, gate and registration rules written as data. They are versioned with the handbook edition and tested before publishing.", req: ["EXM-10", "SEL-03", "REG-09"],
    render(el) {
      const k = ui().rule || "gate.hons.zoology";
      el.innerHTML = `<div class="grid g-side" style="grid-template-columns:280px minmax(0,1fr)"><section class="card"><header><h2>Edition 2023/24</h2></header><div class="stack">${Object.keys(RULES).map((r) => `<button class="btn ${r === k ? "primary" : ""}" style="justify-content:flex-start" type="button" data-rule="${r}">${r}</button>`).join("")}</div></section>
        <section class="card"><header><h2>${esc(k)}</h2><div class="sp">${A.pill("Published", "ok")}${A.pill("12 golden tests passing", "acc")}</div></header><pre style="margin:0;padding:12px;background:var(--raise);border:1px solid var(--line);border-radius:8px;overflow:auto;font:13px/1.55 var(--f-mono)">${esc(RULES[k])}</pre>
          ${A.alert("info", "Editing rules is out of scope for the prototype. In the system, a new handbook edition is cloned, edited, tested against sample students and published.")}</section></div>`;
      A.$$("[data-rule]", el).forEach((b) => b.onclick = () => { ui().rule = b.dataset.rule; A.rerender(); });
    },
  });

  /* ---------------- admin: users & roles ---------------- */
  A.route("a-users", {
    roles: ["admin"], title: "Users & roles", nav: "Users & roles", group: "Administration",
    desc: "Who can do what, and where. A role is always granted for a scope: a department, programme, module or exam session.", req: ["REG-14", "PS-04"],
    render(el) {
      const rows = [["Dr. A. Lecturer (sample)", "Lecturer", "Statistics & Computer Science"], ["Dr. A. Lecturer (sample)", "1st examiner", "COSC 12043 · 2025/26 S2"], ["Dr. A. Lecturer (sample)", "2nd examiner", "COSC 12033 · 2025/26 S2"], ["Prof. H. Head (sample)", "Head of Department", "Statistics & Computer Science"], ["Prof. D. Dean (sample)", "Dean", "Faculty of Science"], ["Ms. E. Officer (sample)", "Exam Branch", "Faculty of Science"], ["Dr. P. Coordinator (sample)", "Programme Coordinator", "BSc Physical Science"], ["Mr. S. Admin (sample)", "System Administrator", "Faculty of Science"]];
      el.innerHTML = `<section class="card flush"><header><h2>Role grants</h2><div class="sp"><button class="btn sm primary" type="button" id="grant">Grant role</button></div></header>${A.table([{ label: "Person", key: 0 }, { label: "Role", key: 1 }, { label: "Scope", key: 2 }, { label: "Sign-in", render: () => A.pill("KLN single sign-on", "acc") }, { label: "MFA", render: (r) => /Dean|Head|Exam|Admin/.test(r[1]) ? A.pill("Required", "ok") : A.pill("Optional") }], rows)}</section>`;
      A.$("#grant").onclick = () => A.toast("Granting roles is shown for illustration only.");
    },
  });

  /* ---------------- admin: audit log ---------------- */
  A.route("a-audit", {
    roles: ["admin", "exam"], title: "Audit log", nav: "Audit log", group: "Administration",
    desc: "Every change made in this demo session: marks, approvals, status changes, registrations and requests.", req: ["REG-08", "REG-12", "EXM-05"],
    render(el) {
      el.innerHTML = `<section class="card flush">${A.table([{ label: "When", render: (a) => A.fmtDT(a.at) }, { label: "Who", key: "by" }, { label: "Acting as", key: "role" }, { label: "Action", key: "action" }, { label: "Detail", render: (a) => `<span class="small">${esc(a.detail)}</span>` }], S().audit, { empty: "No changes yet. Try registering, entering marks or approving a sheet, then come back." })}</section>`;
    },
  });

  A.nav("admin", [{ title: "Administration", items: ["a-cat", "a-rules", "a-users", "a-audit"] }, { title: "Faculty Office", items: ["o-students", "o-cal"] }]);
})(window.App);
