/* Lecturer / examiner, Head of Department and Dean screens: the result sheet workflow (EXM-05) */
(function (A) {
  "use strict";
  const esc = A.esc, S = () => A.state();
  const FLOW = ["Draft", "FirstEntered", "SecondVerified", "HoDRecommended", "DeanApproved", "Released"];
  const FLOW_LABEL = { Draft: "1st examiner entering", FirstEntered: "With 2nd examiner", SecondVerified: "Awaiting HoD", HoDRecommended: "Awaiting Dean", DeanApproved: "Ready to release", Released: "Released" };
  const stateKind = (s) => (s === "Released" ? "ok" : s === "Draft" ? "warn" : "info");
  const overdue = (sh) => sh.state !== "Released" && sh.state !== "DeanApproved" && sh.due < A.TODAY;
  A.FLOW_LABEL = FLOW_LABEL; A.sheetOverdue = overdue;
  const ui = () => (S().ui = S().ui || {});

  /* ---- grade computation for a sheet row ---- */
  function computeRow(sh, i) {
    const m = sh.marks[i] || {}, st = sh.roster[i], w = sh.scheme;
    if (m.absent) return { total: null, raw: "AB", final: "E", note: "Absent: 0 grade points" };
    if ([m.ca, m.pr, m.fe].some((v) => v == null || v === "")) return { total: null, raw: "", final: "", note: "" };
    const total = Math.round((m.ca * w.ca + m.pr * w.pr + m.fe * w.fe) / 100);
    const raw = A.gradeOf(total); let fin = raw; const notes = [];
    const capped = A.labCap(fin, st.labPct); if (capped !== fin) { notes.push(`Lab attendance ${st.labPct}%: capped at ${capped}`); fin = capped; }
    if (st.repeat) { const prev = "D+"; const r = A.repeatGrade(prev, fin); if (r !== fin) notes.push(`Repeat: max C, previous ${prev}`); fin = r; }
    return { total, raw, final: fin, note: notes.join(" · ") };
  }
  A.computeRow = computeRow;

  /* ---- shared mark sheet screen ---- */
  A.route("sheet", {
    roles: ["lecturer", "hod", "dean", "exam"], title: "Result sheet", group: "Examinations",
    desc: "Marks are entered by the 1st examiner, checked by the 2nd examiner, recommended by the Head of Department and approved by the Dean before release.",
    req: ["EXM-05", "EXM-01", "EXM-13", "EXM-16", "EXM-18", "PS-04"],
    render(el) {
      const sh = S().sheets.find((x) => x.id === ui().sheet) || S().sheets[0]; const role = S().role;
      const canFirst = role === "lecturer" && sh.mine === "lecturer-first" && sh.state === "Draft";
      const canSecond = role === "lecturer" && sh.mine === "lecturer-second" && sh.state === "FirstEntered";
      const editable = canFirst || canSecond;
      const info = A.unitInfo(sh.code);
      const rows = sh.roster.map((s, i) => Object.assign({ i }, s, sh.marks[i] || {}, { c: computeRow(sh, i) }));
      const filled = rows.filter((r) => r.c.final).length;
      const dist = {}; rows.forEach((r) => { if (r.c.final) dist[r.c.final] = (dist[r.c.final] || 0) + 1; });
      const num = (r, k) => editable ? `<input type="number" min="0" max="100" data-i="${r.i}" data-k="${k}" value="${r[k] ?? ""}" ${r.absent ? "disabled" : ""} aria-label="${k} mark for ${esc(r.regNo)}">` : (r.absent ? "—" : (r[k] ?? "—"));
      const actions = [];
      if (canFirst) actions.push(`<button class="btn" type="button" data-act="demo">Fill sample marks (demo)</button><label class="btn" for="csv-up">Upload CSV<input type="file" id="csv-up" accept=".csv,text/csv" hidden></label><button class="btn" type="button" data-act="save">Save draft</button><button class="btn primary" type="button" data-act="submit1">Submit to 2nd examiner</button>`);
      if (canSecond) actions.push(`<button class="btn" type="button" data-act="return1">Return to 1st examiner</button><button class="btn primary" type="button" data-act="verify">Verify marks</button>`);
      if (role === "hod" && sh.state === "SecondVerified") actions.push(`<button class="btn" type="button" data-act="return1">Return</button><button class="btn primary" type="button" data-act="recommend">Recommend for approval</button>`);
      if (role === "dean" && sh.state === "HoDRecommended") actions.push(`<button class="btn" type="button" data-act="returnHod">Return to HoD</button><button class="btn primary" type="button" data-act="approve">Approve</button>`);
      if ((role === "dean" || role === "exam") && sh.state === "DeanApproved") actions.push(`<button class="btn primary" type="button" data-act="release">Release results to students</button>`);
      A.setActions(`<button class="btn" type="button" data-act="print">Print mark sheet</button>${actions.join("")}`, (a) => {
        A.$$("[data-act]", a).forEach((b) => b.onclick = () => act(b.dataset.act, sh));
        const up = A.$("#csv-up", a);
        if (up) up.onchange = () => { const f = up.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => importCSV(sh, String(rd.result)); rd.readAsText(f); };
      });
      el.innerHTML = `<section class="card"><header><h2>${esc(sh.code)} · ${esc(info.title)}</h2><div class="sp">${A.pill(FLOW_LABEL[sh.state], stateKind(sh.state))}${overdue(sh) ? A.pill("Overdue", "bad") : ""}</div></header>
          ${A.steps(["1st examiner", "2nd examiner", "Head of Department", "Dean", "Released"], Math.min(FLOW.indexOf(sh.state), 4) + (sh.state === "Released" ? 1 : 0))}
          <dl class="kv"><dt>Session</dt><dd>${esc(sh.session)} · exam held ${A.fmtDate(sh.examDate)}</dd><dt>Department</dt><dd>${esc(sh.deptName)}</dd><dt>Examiners</dt><dd>1st: ${esc(sh.first)} · 2nd: ${esc(sh.second)}</dd><dt>Due</dt><dd>${A.fmtDate(sh.due)}</dd>
          <dt>Mark criteria</dt><dd>${editable && canFirst ? `CA <input class="search" style="width:64px" type="number" id="w-ca" value="${sh.scheme.ca}" aria-label="CA weight">% · Practical <input class="search" style="width:64px" type="number" id="w-pr" value="${sh.scheme.pr}" aria-label="Practical weight">% · Final exam <input class="search" style="width:64px" type="number" id="w-fe" value="${sh.scheme.fe}" aria-label="Final exam weight">%` : `CA ${sh.scheme.ca}% · Practical ${sh.scheme.pr}% · Final exam ${sh.scheme.fe}%`}</dd></dl>
          <div class="row small">${A.GRADES.map((g) => `<span class="pill">${g[1]}: ${dist[g[1]] || 0}</span>`).join("")}<span class="muted">${filled}/${rows.length} graded</span></div>
        </section>
        <section class="card flush"><header><h2>Marks</h2><div class="sp small muted">Grades include the lab-attendance cap (§1.8) and the repeat cap at C (§2.3).</div></header>
        ${A.table([{ label: "#", num: true, render: (r) => r.i + 1 }, { label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", render: (r) => esc(r.name) + (r.repeat ? ` ${A.pill("Repeat", "warn")}` : "") },
          { label: "Lab att.", num: true, render: (r) => `${r.labPct}%` }, { label: "Absent", render: (r) => editable ? `<input type="checkbox" data-i="${r.i}" data-k="absent" ${r.absent ? "checked" : ""} aria-label="Absent ${esc(r.regNo)}">` : r.absent ? "AB" : "" },
          { label: `CA ${sh.scheme.ca}%`, num: true, render: (r) => num(r, "ca") }, { label: `Prac ${sh.scheme.pr}%`, num: true, render: (r) => num(r, "pr") }, { label: `Final ${sh.scheme.fe}%`, num: true, render: (r) => num(r, "fe") },
          { label: "Total", num: true, render: (r) => r.c.total ?? "" }, { label: "Grade", render: (r) => r.c.final ? A.pill(r.c.final, A.atLeast(r.c.final, "C") ? "ok" : A.atLeast(r.c.final, "D") ? "warn" : "bad") : "" }, { label: "Note", render: (r) => `<span class="tiny muted">${esc(r.c.note)}</span>` }], rows)}</section>
        <section class="card"><header><h2>History</h2></header>${A.table([{ label: "When", render: (h) => A.fmtDT(h.at) }, { label: "Who", key: "who" }, { label: "What", key: "what" }], sh.history.slice().reverse())}</section>`;
      if (editable) {
        A.$$("input[data-i]", el).forEach((inp) => inp.addEventListener("change", () => {
          const i = +inp.dataset.i, k = inp.dataset.k; sh.marks[i] = sh.marks[i] || {};
          if (k === "absent") sh.marks[i].absent = inp.checked; else { const v = inp.value === "" ? null : Math.max(0, Math.min(100, +inp.value)); sh.marks[i][k] = v; }
          A.save(); A.rerender();
        }));
        ["ca", "pr", "fe"].forEach((k) => { const w = A.$("#w-" + k); if (w) w.addEventListener("change", () => { sh.scheme[k] = +w.value; A.save(); A.rerender(); }); });
      }
    },
  });

  function act(a, sh) {
    const who = A.currentUser().name; const log = (what) => sh.history.push({ at: new Date().toISOString(), who, what });
    const go = (stt, what, msg) => { sh.state = stt; log(what); A.audit(what, sh.code); A.save(); A.rerender(); A.toast(msg); };
    if (a === "print") return window.print();
    if (a === "save") { log("Draft saved"); A.save(); return A.toast("Draft saved"); }
    if (a === "demo") { sh.roster.forEach((_, i) => { sh.marks[i] = i === 9 ? { absent: true } : { ca: 45 + ((i * 17) % 50), pr: 40 + ((i * 23) % 55), fe: 28 + ((i * 31) % 66) }; }); log("Sample marks filled (demo)"); A.save(); A.rerender(); return A.toast("Sample marks filled. Check the grades, then submit."); }
    if (a === "submit1") {
      const missing = sh.roster.filter((_, i) => { const m = sh.marks[i] || {}; return !m.absent && [m.ca, m.pr, m.fe].some((v) => v == null || v === ""); }).length;
      const sum = sh.scheme.ca + sh.scheme.pr + sh.scheme.fe;
      if (sum !== 100) return A.toast(`Mark criteria add up to ${sum}%. They must add up to 100%.`);
      if (missing) return A.toast(`${missing} students have no marks. Enter marks or mark them absent.`);
      return A.confirm("Submit to 2nd examiner", `The 2nd examiner (${esc(sh.second)}) will be emailed and has 1 week to verify.`, "Submit", () => go("FirstEntered", "Submitted by 1st examiner", "Sent to the 2nd examiner"));
    }
    if (a === "verify") return go("SecondVerified", "Verified by 2nd examiner", "Verified. The Head of Department has been notified.");
    if (a === "return1") return A.modal({ title: "Return with comments", body: `<label class="field"><span>Comment for the 1st examiner</span><textarea id="ret-c">Please recheck marks for rows 4 and 12.</textarea></label>`, actions: [{ label: "Cancel" }, { label: "Return", kind: "primary", onClick: (m) => go("Draft", "Returned: " + A.$("#ret-c", m).value, "Returned to the 1st examiner") }] });
    if (a === "recommend") return go("HoDRecommended", "Recommended by HoD", "Recommended. Sent to the Dean.");
    if (a === "returnHod") return go("SecondVerified", "Returned to HoD by Dean", "Returned to the Head of Department");
    if (a === "approve") return go("DeanApproved", "Approved by Dean", "Approved. Ready to release.");
    if (a === "release") return A.confirm("Release results", "Students will see their grades immediately and results are sent to the University examination system.", "Release", () => go("Released", "Released to students and exam system", "Results released"));
  }
  /* CSV upload (EXM-18): columns RegNo,CA,Practical,Final  (use AB in Final for absent) */
  function importCSV(sh, text) {
    let n = 0, bad = 0;
    text.split(/\r?\n/).forEach((line) => {
      const [reg, ca, pr, fe] = line.split(",").map((x) => (x || "").trim()); const i = sh.roster.findIndex((s) => s.regNo === reg);
      if (i < 0) { if (reg && !/reg/i.test(reg)) bad++; return; }
      sh.marks[i] = /^ab$/i.test(fe) ? { absent: true } : { ca: +ca, pr: +pr, fe: +fe }; n++;
    });
    sh.history.push({ at: new Date().toISOString(), who: A.currentUser().name, what: `Marks uploaded from CSV (${n} rows)` });
    A.save(); A.rerender(); A.toast(`${n} rows imported${bad ? `, ${bad} registration numbers not found` : ""}.`);
  }
  A.openSheet = (id) => { ui().sheet = id; A.save(); if (A.current() === "sheet") A.rerender(); else A.go("sheet"); };

  const sheetCols = (extra = []) => [{ label: "Code", code: true, key: "code" }, { label: "Course unit", render: (s) => esc(A.unitInfo(s.code).title) }, { label: "Department", render: (s) => `<span class="small">${esc(s.deptName.replace("Department of ", ""))}</span>` },
    { label: "Status", render: (s) => A.pill(FLOW_LABEL[s.state], stateKind(s.state)) + (overdue(s) ? " " + A.pill("Overdue", "bad") : "") }, { label: "Due", render: (s) => A.fmtDate(s.due) }].concat(extra, [{ label: "", render: (s) => `<button class="btn sm" type="button" data-sheet="${s.id}">Open</button>` }]);
  const bindOpen = (el) => A.$$("[data-sheet]", el).forEach((b) => b.onclick = () => A.openSheet(b.dataset.sheet));

  /* ---- lecturer ---- */
  A.route("l-home", {
    roles: ["lecturer"], title: "My modules", nav: "My modules", group: "Teaching",
    desc: "Modules you teach this semester and the result sheets you examine.", req: ["EXM-02", "PS-04", "REG-17"],
    count: () => S().sheets.filter((s) => (s.mine === "lecturer-first" && s.state === "Draft") || (s.mine === "lecturer-second" && s.state === "FirstEntered")).length,
    render(el) {
      const mine = S().sheets.filter((s) => s.mine);
      el.innerHTML = `${A.alert("warn", `<b>COSC 12043 marks are due on ${A.fmtDate("2026-11-21")}.</b> You are the 1st examiner. Reminders are sent weekly after the due date (EXM-17).`)}
        <div class="grid g3">${A.stat("2", "Modules this semester", "2026/27 Semester I")}${A.stat(S().lecRoll.length, "Students in COSC 21063")}${A.stat(mine.length, "Result sheets to examine")}</div>
        <section class="card flush"><header><h2>Teaching · 2026/27 Semester I</h2></header>${A.table([{ label: "Code", code: true, key: "c" }, { label: "Course unit", render: (r) => esc(A.unitInfo(r.c).title) }, { label: "Registered", num: true, key: "n" }, { label: "Timetable", key: "slot" }, { label: "", render: () => `<a class="btn sm" href="#l-att">Class roll & attendance</a>` }], [{ c: "COSC 21063", n: S().lecRoll.length, slot: "Tue 10:00–12:00" }, { c: "COSC 21052", n: 141, slot: "Thu 08:00–10:00" }])}</section>
        <section class="card flush"><header><h2>Examiner duties · 2025/26 Semester II</h2></header>${A.table(sheetCols([{ label: "My role", render: (s) => s.mine === "lecturer-first" ? "1st examiner" : "2nd examiner" }]), mine)}</section>`;
      bindOpen(el);
    },
  });
  A.route("l-att", {
    roles: ["lecturer"], title: "Class roll & attendance", nav: "Class roll & attendance", group: "Teaching",
    desc: "COSC 21063 · tick attendance per session. Lab attendance below 80% caps the grade at C; below 50% at D.", req: ["REG-17", "REG-18"],
    render(el) {
      const roll = S().lecRoll;
      A.setActions(`<button class="btn" type="button" onclick="window.print()">Print class roll</button><button class="btn" type="button" id="att-csv">Export CSV</button>`, (a) => A.$("#att-csv", a).onclick = () => A.download("COSC21063-attendance.csv", A.toCSV([{ label: "Reg No", key: "regNo" }, { label: "Name", key: "name" }, { label: "Attendance %", csv: (s) => pct(s) }], roll), "text/csv"));
      const pct = (s) => Math.round((s.att.filter(Boolean).length / s.att.length) * 100);
      el.innerHTML = `<section class="card flush"><header><h2>COSC 21063 · ${esc(A.unitInfo("COSC 21063").title)}</h2><div class="sp small muted">10 sessions so far</div></header>
        ${A.table([{ label: "#", num: true, render: (_, i) => i + 1 }, { label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }].concat(Array.from({ length: 10 }, (_, w) => ({ label: `W${w + 1}`, render: (s) => `<input type="checkbox" data-s="${s.sid}" data-w="${w}" ${s.att[w] ? "checked" : ""} aria-label="Week ${w + 1} ${esc(s.regNo)}">` })), [{ label: "%", num: true, render: (s) => { const p = pct(s); return `<b style="color:var(${p < 50 ? "--bad" : p < 80 ? "--warn" : "--ok"})">${p}%</b>`; } }]), roll, { rowClass: (s) => pct(s) < 80 ? "flag" : "" })}</section>`;
      A.$$("input[data-s]", el).forEach((cb) => cb.onchange = () => { const s = roll.find((x) => x.sid === cb.dataset.s); s.att[+cb.dataset.w] = cb.checked; A.save(); A.rerender(); });
    },
  });
  A.route("l-marks", {
    roles: ["lecturer"], title: "Mark entry", nav: "Mark entry", group: "Examinations",
    desc: "Open a result sheet to enter or verify marks.", req: ["EXM-05", "EXM-18"],
    render(el) { el.innerHTML = `<section class="card flush"><header><h2>My result sheets</h2></header>${A.table(sheetCols([{ label: "My role", render: (s) => s.mine === "lecturer-first" ? "1st examiner" : "2nd examiner" }]), S().sheets.filter((s) => s.mine))}</section>`; bindOpen(el); },
  });

  /* ---- Head of Department ---- */
  A.route("h-approve", {
    roles: ["hod"], title: "Results awaiting my recommendation", nav: "Approvals", group: "Department",
    desc: "Sheets verified by both examiners in your department. Recommend them to the Dean or return them with comments.", req: ["EXM-05", "EXM-04"],
    count: () => S().sheets.filter((s) => s.dept === "STAT" && s.state === "SecondVerified").length,
    render(el) {
      const dept = S().sheets.filter((s) => s.dept === "STAT");
      el.innerHTML = `<section class="card flush"><header><h2>Awaiting recommendation</h2></header>${A.table(sheetCols(), dept.filter((s) => s.state === "SecondVerified"), { empty: "Nothing waiting for you." })}</section>
        <section class="card flush"><header><h2>All result sheets · Statistics & Computer Science</h2><div class="sp"><button class="btn sm" type="button" id="remind">Remind overdue examiners</button></div></header>${A.table(sheetCols([{ label: "1st examiner", key: "first" }]), dept)}</section>`;
      bindOpen(el);
      A.$("#remind").onclick = () => A.toast(`Reminder emails sent to ${dept.filter(overdue).length || "no"} examiners with overdue sheets.`);
    },
  });

  /* ---- Dean ---- */
  A.route("d-approve", {
    roles: ["dean"], title: "Results awaiting approval", nav: "Approvals", group: "Faculty",
    desc: "Sheets recommended by Heads of Department. Approve them, then release them to students.", req: ["EXM-05"],
    count: () => S().sheets.filter((s) => s.state === "HoDRecommended" || s.state === "DeanApproved").length,
    render(el) {
      el.innerHTML = `<section class="card flush"><header><h2>Awaiting your approval</h2></header>${A.table(sheetCols(), S().sheets.filter((s) => s.state === "HoDRecommended"), { empty: "Nothing waiting for approval." })}</section>
        <section class="card flush"><header><h2>Approved, ready to release</h2></header>${A.table(sheetCols(), S().sheets.filter((s) => s.state === "DeanApproved"), { empty: "Nothing ready to release." })}</section>
        <section class="card flush"><header><h2>Appeals awaiting the Dean</h2></header>${A.table([{ label: "Ref", code: true, key: "id" }, { label: "Type", key: "type" }, { label: "Student", render: (r) => `${esc(r.student)} <span class="mono tiny">${esc(r.regNo)}</span>` }, { label: "Reason", render: (r) => `<span class="small">${esc(r.reason || "")}</span>` }, { label: "", render: (r) => `<button class="btn sm primary" type="button" data-ok="${r.id}">Approve</button> <button class="btn sm" type="button" data-no="${r.id}">Reject</button>` }], S().requests.filter((r) => r.state === "Awaiting Dean"), { empty: "No appeals waiting." })}</section>`;
      bindOpen(el);
      A.$$("[data-ok],[data-no]", el).forEach((b) => b.onclick = () => { const r = S().requests.find((x) => x.id === (b.dataset.ok || b.dataset.no)); r.state = b.dataset.ok ? "Approved" : "Rejected"; A.audit(`Appeal ${r.state.toLowerCase()}`, r.id); A.save(); A.rerender(); A.toast(`${r.id} ${r.state.toLowerCase()}. The student has been notified.`); });
    },
  });

  A.nav("lecturer", [{ title: "Teaching", items: ["l-home", "l-att"] }, { title: "Examinations", items: ["l-marks", "sheet"] }]);
  A.nav("hod", [{ title: "Department", items: ["h-approve", "sheet", "o-results"] }, { title: "Insight", items: ["an", "o-reports"] }]);
  A.nav("dean", [{ title: "Faculty", items: ["d-approve", "sheet", "o-results", "o-pass"] }, { title: "Insight", items: ["an", "o-reports"] }]);
})(window.App);
