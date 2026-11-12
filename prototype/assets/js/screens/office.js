/* Faculty Office / Exam Branch and Programme Coordinator screens */
(function (A) {
  "use strict";
  const esc = A.esc, S = () => A.state();
  const ui = () => (S().ui = S().ui || {});
  const STREAM = (code) => /^(COSC|PHYS|PMAT|AMAT|STAT|ELEC|CHEM)/.test(code) ? "Physical Science" : /^(ZOOL|MIBI|BIOC|PLBL|MBBT)/.test(code) ? "Biological Science" : /^SENG/.test(code) ? "Software Engineering" : /^COST/.test(code) ? "Physical & Biological" : "Other";

  /* ---------------- office dashboard ---------------- */
  A.route("o-home", {
    roles: ["exam"], title: "Faculty Office overview", nav: "Overview", group: "Faculty Office",
    desc: "Registration, results and requests that need action across the Faculty.", req: ["EXM-03", "EXM-04", "SCH-05", "SCH-07"],
    render(el) {
      const st = S(), sh = st.sheets, od = sh.filter(A.sheetOverdue);
      const holds = st.students.filter((s) => !s.adminRegistered).length;
      const byState = Object.keys(A.FLOW_LABEL).map((k) => ({ k: A.FLOW_LABEL[k].replace(" examiner", ""), v: sh.filter((s) => s.state === k).length }));
      const byYear = [1, 2, 3, 4].map((y) => ({ k: "Year " + y, v: st.students.filter((s) => s.year === y).length }));
      el.innerHTML = `<div class="grid g4">${A.stat(st.students.length, "Students on record", "sample cohort")}${A.stat(od.length, "Result sheets overdue", `<a href="#o-results">Review</a>`)}${A.stat(holds, "Exam admissions on hold", "University registration incomplete")}${A.stat(st.requests.filter((r) => !/Issued|Approved|Rejected/.test(r.state)).length, "Open student requests", `<a href="#o-req">Open queue</a>`)}</div>
        <div class="grid g2"><section class="card"><header><h2>Result sheets by stage</h2></header>${A.barChart(byState, { h: 220 })}</section>
        <section class="card"><header><h2>Students by year of study</h2></header>${A.barChart(byYear, { h: 220, color: "var(--info)" })}</section></div>
        <section class="card flush"><header><h2>Overdue result sheets</h2><div class="sp"><button class="btn sm" type="button" id="remind-all">Send reminders now</button></div></header>${A.table([{ label: "Code", code: true, key: "code" }, { label: "Department", key: "deptName" }, { label: "Stage", render: (s) => A.pill(A.FLOW_LABEL[s.state], "warn") }, { label: "Due", render: (s) => A.fmtDate(s.due) }, { label: "Days late", num: true, render: (s) => Math.round((new Date(A.TODAY) - new Date(s.due)) / 864e5) }], od, { empty: "No overdue sheets." })}</section>`;
      A.$("#remind-all").onclick = () => { A.audit("Reminders sent", od.map((s) => s.code).join(", ")); A.toast(`Reminder emails sent for ${od.length} overdue sheets. Weekly reminders continue automatically.`); };
    },
  });

  /* ---------------- students (REG-06, REG-08, REG-11, REG-12, REG-16, EXM-06, EXM-12) ---------------- */
  A.route("o-students", {
    roles: ["exam", "admin"], title: "Students", nav: "Students", group: "Faculty Office",
    desc: "Search students, change status, move results to a new registration number and manage holds. Every change is audited.",
    req: ["REG-06", "REG-08", "REG-11", "REG-12", "REG-16", "EXM-06", "EXM-09", "EXM-12", "SCH-07"],
    render(el) {
      const q = (ui().sq || "").toLowerCase(), pf = ui().sp || "", stf = ui().ss || "";
      const list = S().students.filter((s) => (!q || (s.name + s.regNo).toLowerCase().includes(q)) && (!pf || s.programme === pf) && (!stf || s.status === stf));
      el.innerHTML = `<section class="card flush"><header><h2>${list.length} students</h2><div class="sp">
          <input class="search" id="sq" placeholder="Search name or reg. no." value="${esc(ui().sq || "")}" aria-label="Search students">
          <select class="search" id="sp" aria-label="Programme" style="width:auto"><option value="">All programmes</option>${window.Mock.PROGRAMMES.map((p) => `<option value="${p.id}" ${pf === p.id ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select>
          <select class="search" id="ss" aria-label="Status" style="width:auto"><option value="">Any status</option>${["Active", "Suspended", "Results withheld", "Deferred", "Cancelled"].map((x) => `<option ${stf === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></header>
        ${A.table([{ label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "Gender", key: "gender" }, { label: "Programme", render: (s) => `<span class="small">${esc(s.programmeLabel)}</span>` }, { label: "Year", num: true, key: "year" }, { label: "GPA", num: true, render: (s) => s.gpa.toFixed(2) },
          { label: "Status", render: (s) => A.pill(s.status, s.status === "Active" ? "ok" : "bad") + (s.adminRegistered ? "" : " " + A.pill("Admission hold", "warn")) }, { label: "", render: (s) => `<button class="btn sm" type="button" data-st="${s.id}">Manage</button>` }], list.slice(0, 80))}</section>`;
      const upd = () => A.rerender();
      A.$("#sq").oninput = (e) => { ui().sq = e.target.value; clearTimeout(ui()._t); ui()._t = setTimeout(() => { upd(); const s = A.$("#sq"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); };
      A.$("#sp").onchange = (e) => { ui().sp = e.target.value; upd(); };
      A.$("#ss").onchange = (e) => { ui().ss = e.target.value; upd(); };
      A.$$("[data-st]", el).forEach((b) => b.onclick = () => manage(S().students.find((s) => s.id === b.dataset.st)));
    },
  });
  function manage(s) {
    A.modal({
      title: `${s.name} · ${s.regNo}`, wide: true,
      body: `<dl class="kv"><dt>Programme</dt><dd>${esc(s.programmeLabel)} · Year ${s.year} · intake ${esc(s.intake)}</dd><dt>Email</dt><dd>${esc(s.email)}</dd><dt>Status</dt><dd>${A.pill(s.status, s.status === "Active" ? "ok" : "bad")}</dd><dt>University registration</dt><dd>${s.adminRegistered ? "Complete" : "Incomplete: exam admission held"}</dd></dl>
        <div class="formgrid"><label class="field"><span>Change status</span><select id="m-status">${["Active", "Suspended", "Results withheld", "Deferred", "Cancelled"].map((x) => `<option ${x === s.status ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <label class="field"><span>Reason / authority (required)</span><input id="m-reason" placeholder="e.g. Faculty Board decision 2026/11/04"></label></div>
        <label class="check"><input type="checkbox" id="m-adm" ${s.adminRegistered ? "checked" : ""}> University administrative registration completed (removes exam admission hold)</label>
        <hr class="sep"><h3 style="font-size:.95rem">Move results to a new registration number</h3>
        <p class="small muted" style="margin:0">All results, registrations, payments and documents move with the student. The old number stays searchable as an alias.</p>
        <div class="formgrid"><label class="field"><span>New registration number</span><input id="m-newreg" placeholder="e.g. PS/2025/141"></label></div>`,
      actions: [{ label: "Cancel" }, { label: "Save changes", kind: "primary", onClick: (m) => {
        const st = A.$("#m-status", m).value, why = A.$("#m-reason", m).value.trim(), nr = A.$("#m-newreg", m).value.trim(), adm = A.$("#m-adm", m).checked;
        if ((st !== s.status || nr) && !why) { A.toast("Enter the reason or authority for this change."); return false; }
        if (st !== s.status) { A.audit(`Status ${s.status} → ${st}`, `${s.regNo}: ${why}`); s.status = st; }
        if (adm !== s.adminRegistered) { s.adminRegistered = adm; A.audit(adm ? "Admission hold removed" : "Admission hold set", s.regNo); }
        if (nr) { A.audit("Registration number changed", `${s.regNo} → ${nr}: ${why}`); s.alias = s.regNo; s.regNo = nr; }
        A.save(); A.rerender(); A.toast("Student record updated");
      } }],
    });
  }

  /* ---------------- calendar & windows (PS-02, PS-03) ---------------- */
  A.route("o-cal", {
    roles: ["exam", "coord", "admin"], title: "Academic calendar & windows", nav: "Calendar & windows", group: "Faculty Office",
    desc: "Open and close dates for registration, add/drop, repeat registration, mark entry and selections. Students only see actions while a window is open.",
    req: ["PS-02", "PS-03", "REG-01", "REG-04"],
    render(el) {
      el.innerHTML = `<section class="card flush"><header><h2>Windows · 2026/27</h2><div class="sp"><button class="btn sm primary" type="button" id="add-w">Add window</button></div></header>
        ${A.table([{ label: "Type", render: (w) => `<b>${esc(w.type)}</b><div class="tiny muted">${esc(w.note || "")}</div>` }, { label: "Applies to", key: "scope" }, { label: "Opens", render: (w) => `<input type="date" data-w="${w.id}" data-k="open" value="${w.open}" aria-label="Opens">` }, { label: "Closes", render: (w) => `<input type="date" data-w="${w.id}" data-k="close" value="${w.close}" aria-label="Closes">` },
          { label: "Now", render: (w) => A.TODAY >= w.open && A.TODAY <= w.close ? A.pill("Open", "ok") : A.TODAY < w.open ? A.pill("Upcoming", "info") : A.pill("Closed") }], S().windows)}</section>`;
      A.$$("input[data-w]", el).forEach((i) => i.onchange = () => { const w = S().windows.find((x) => x.id === i.dataset.w); w[i.dataset.k] = i.value; A.audit("Window changed", `${w.type} ${i.dataset.k} ${i.value}`); A.save(); A.rerender(); A.toast("Window updated"); });
      A.$("#add-w").onclick = () => { S().windows.push({ id: "w" + A.uid(), type: "Add / drop", scope: "Year 3 · Semester II", open: "2027-04-01", close: "2027-04-14", note: "New window" }); A.save(); A.rerender(); };
    },
  });

  /* ---------------- offerings (REG-05, REG-17, EXM-02, PS-04) ---------------- */
  A.route("o-off", {
    roles: ["exam", "coord"], title: "Course offerings & examiners", nav: "Offerings & examiners", group: "Faculty Office",
    desc: "Units running this semester, their capacity and examiners. Replace a unit to move its registered students to the new one.", req: ["REG-05", "REG-17", "EXM-02", "PS-04", "SCH-01", "SCH-06"],
    render(el) {
      const offs = Object.entries(S().offerings).filter(([c]) => !c.startsWith("ACLT")).map(([code, o]) => Object.assign({ code }, o));
      const staff = ["Dr. A. Lecturer (sample)", "Dr. B. Examiner (sample)", "Dr. C. Examiner (sample)", "Dr. M. Moderator (sample)", "Prof. N. Moderator (sample)"];
      el.innerHTML = `<section class="card flush"><header><h2>2026/27 Semester I · Physical Science Year 2 (sample)</h2></header>
        ${A.table([{ label: "Code", code: true, key: "code" }, { label: "Course unit", render: (o) => esc(A.unitInfo(o.code).title) + (o.faculty ? `<div class="tiny muted">${esc(o.faculty)}</div>` : "") }, { label: "Timetable", key: "slot" }, { label: "Registered", num: true, render: (o) => `${o.enrolled}/${o.capacity}` },
          { label: "1st examiner", render: (o) => `<select data-ex="${o.code}" data-k="first" aria-label="First examiner">${staff.map((s, i) => `<option ${((o.first || staff[0]) === s) ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` },
          { label: "2nd examiner", render: (o) => `<select data-ex="${o.code}" data-k="second" aria-label="Second examiner">${staff.map((s) => `<option ${((o.second || staff[3]) === s) ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` },
          { label: "", render: (o) => `<button class="btn sm" type="button" data-roll="${o.code}">Class roll</button> <button class="btn sm" type="button" data-rep="${o.code}">Replace</button>` }], offs)}</section>`;
      A.$$("select[data-ex]", el).forEach((s) => s.onchange = () => { const o = S().offerings[s.dataset.ex]; o[s.dataset.k] = s.value; A.audit("Examiner assigned", `${s.dataset.ex} ${s.dataset.k}: ${s.value}`); A.save(); A.toast(`${s.value} can now enter marks for ${s.dataset.ex}`); });
      A.$$("[data-roll]", el).forEach((b) => b.onclick = () => A.toast(`Class roll for ${b.dataset.roll} generated (PDF and CSV).`));
      A.$$("[data-rep]", el).forEach((b) => b.onclick = () => A.modal({ title: `Replace ${b.dataset.rep}`, body: `<p class="small">All ${S().offerings[b.dataset.rep].enrolled} registered students move to the new unit and are notified. Their registration history keeps a record of the change.</p><label class="field"><span>Replacement unit code</span><input id="rep-code" placeholder="e.g. COSC 21053"></label><label class="field"><span>Reason</span><input id="rep-why" placeholder="e.g. Curriculum revision approved by Faculty Board"></label>`, actions: [{ label: "Cancel" }, { label: "Move students", kind: "primary", onClick: (m) => { const nc = A.$("#rep-code", m).value.trim(); if (!/^[A-Z]{4} \d{5}$/.test(nc)) { A.toast("Enter a code like COSC 21053."); return false; } A.audit("Module replaced", `${b.dataset.rep} → ${nc}`); A.toast(`${S().offerings[b.dataset.rep].enrolled} students moved to ${nc} and notified.`); } }] }));
    },
  });

  /* ---------------- results tracker (EXM-02, EXM-03, EXM-04, EXM-17) ---------------- */
  A.route("o-results", {
    roles: ["exam", "hod", "dean"], title: "Results release tracker", nav: "Results tracker", group: "Examinations",
    desc: "Where every result sheet is in the approval process, by department and by degree programme.", req: ["EXM-02", "EXM-03", "EXM-04", "EXM-17"],
    render(el) {
      const sh = S().sheets; const depts = [...new Set(sh.map((s) => s.deptName))];
      const sum = (groups, key) => groups.map((g) => { const l = sh.filter((s) => key(s) === g); return { g, total: l.length, released: l.filter((s) => s.state === "Released").length, pending: l.filter((s) => s.state !== "Released").length, overdue: l.filter(A.sheetOverdue).length }; });
      const sumCols = [{ label: "Group", key: "g" }, { label: "Sheets", num: true, key: "total" }, { label: "Released", num: true, key: "released" }, { label: "Not released", num: true, key: "pending" }, { label: "Overdue", num: true, render: (r) => r.overdue ? `<b style="color:var(--bad)">${r.overdue}</b>` : 0 }];
      el.innerHTML = `<div class="grid g2"><section class="card flush"><header><h2>Unreleased results by department</h2></header>${A.table(sumCols, sum(depts, (s) => s.deptName))}</section>
          <section class="card flush"><header><h2>Unreleased results by degree programme</h2></header>${A.table(sumCols, sum([...new Set(sh.map((s) => STREAM(s.code)))], (s) => STREAM(s.code)))}</section></div>
        <section class="card flush"><header><h2>All result sheets · 2025/26 Semester II</h2><div class="sp"><button class="btn sm" type="button" id="exp">Export CSV</button></div></header>
        ${A.table([{ label: "Code", code: true, key: "code" }, { label: "Department", render: (s) => `<span class="small">${esc(s.deptName.replace("Department of ", ""))}</span>` }, { label: "Exam held", render: (s) => A.fmtDate(s.examDate) }, { label: "Due", render: (s) => A.fmtDate(s.due) }, { label: "Stage", render: (s) => A.pill(A.FLOW_LABEL[s.state], s.state === "Released" ? "ok" : "info") + (A.sheetOverdue(s) ? " " + A.pill("Overdue", "bad") : "") },
          { label: "Days since exam", num: true, render: (s) => Math.round((new Date(A.TODAY) - new Date(s.examDate)) / 864e5) }, { label: "", render: (s) => `<button class="btn sm" type="button" data-sheet="${s.id}">Open</button>` + (A.sheetOverdue(s) ? ` <button class="btn sm" type="button" data-rem="${s.id}">Remind</button>` : "") }], sh)}</section>`;
      A.$$("[data-sheet]", el).forEach((b) => b.onclick = () => A.openSheet(b.dataset.sheet));
      A.$$("[data-rem]", el).forEach((b) => b.onclick = () => { const s = sh.find((x) => x.id === b.dataset.rem); A.audit("Reminder sent", s.code); A.toast(`Reminder sent to ${s.state === "Draft" ? s.first : s.second}`); });
      A.$("#exp").onclick = () => A.download("result-sheets.csv", A.toCSV([{ label: "Code", key: "code" }, { label: "Department", key: "deptName" }, { label: "Stage", csv: (s) => A.FLOW_LABEL[s.state] }, { label: "Due", key: "due" }], sh), "text/csv");
    },
  });

  /* ---------------- examinations (EXM-07, EXM-08, EXM-13, EXM-14) ---------------- */
  let exTab = "tt";
  A.route("o-exams", {
    roles: ["exam"], title: "Examination session", nav: "Exam timetable & halls", group: "Examinations",
    desc: "Build the timetable, check clashes, allocate halls by student count and generate duty lists.", req: ["EXM-07", "EXM-08", "EXM-13", "EXM-14", "SCH-03"],
    render(el) {
      const ex = S().exams;
      const clashes = ex.slots.filter((s) => s.clashNote && ex.slots.some((o) => o !== s && o.date === s.date && o.time === s.time));
      const allocated = ex.slots.every((s) => s.halls.length);
      el.innerHTML = `<section class="card"><header><h2>${esc(ex.session)}</h2><div class="sp">${A.pill(ex.status, "info")}</div></header>
          ${A.steps(["Timetable", "Clash check", "Hall allocation", "Duty roster", "Publish"], !clashes.length ? (allocated ? (ex.slots[0].duties.length ? 4 : 3) : 2) : 1)}
          ${clashes.length ? A.alert("bad", `<b>${clashes.length} clash found.</b> ${clashes.map((c) => `${c.code} (${A.fmtDate(c.date)} ${c.time}): ${esc(c.clashNote)}`).join("; ")}. Move one of the exams.`) : A.alert("ok", "No clashes for students registered in these units.")}</section>
        ${A.tabs("ex-tabs", [["tt", "Timetable"], ["halls", "Hall allocation"], ["duty", "Duty roster"], ["docs", "Exam documents"]], exTab)}
        <div id="ex-body"></div>`;
      const body = A.$("#ex-body");
      if (exTab === "tt") body.innerHTML = `<section class="card flush">${A.table([{ label: "Date", render: (s) => `<input type="date" data-sd="${s.id}" value="${s.date}" aria-label="Date">` }, { label: "Time", render: (s) => `<select data-stime="${s.id}" aria-label="Time"><option ${s.time === "09:00–12:00" ? "selected" : ""}>09:00–12:00</option><option ${s.time === "13:30–16:30" ? "selected" : ""}>13:30–16:30</option></select>` }, { label: "Code", code: true, key: "code" }, { label: "Course unit", render: (s) => esc(A.unitInfo(s.code).title) }, { label: "Candidates", num: true, key: "count" }, { label: "", render: (s) => clashes.includes(s) ? A.pill("Clash", "bad") : "" }], ex.slots, { rowClass: (s) => clashes.includes(s) ? "flag" : "" })}</section>`;
      if (exTab === "halls") body.innerHTML = `<section class="card flush"><header><h2>Halls</h2><div class="sp"><button class="btn sm primary" type="button" id="alloc">Allocate halls automatically</button></div></header>${A.table([{ label: "Date", render: (s) => A.fmtDate(s.date) }, { label: "Time", key: "time" }, { label: "Code", code: true, key: "code" }, { label: "Candidates", num: true, key: "count" }, { label: "Halls", render: (s) => s.halls.length ? s.halls.map((h) => `${esc(h.name)} <span class="muted">(${h.seats})</span>`).join(", ") : `<span class="muted">Not allocated</span>` }, { label: "Seats", num: true, render: (s) => s.halls.reduce((a, h) => a + h.seats, 0) || "" }], ex.slots)}</section>
        <section class="card flush"><header><h2>Venues (sample)</h2></header>${A.table([{ label: "Venue", key: "name" }, { label: "Exam capacity", num: true, key: "cap" }], ex.halls)}</section>`;
      if (exTab === "duty") body.innerHTML = `<section class="card flush"><header><h2>Supervisors, invigilators and hall attendants</h2><div class="sp"><button class="btn sm primary" type="button" id="duty" ${allocated ? "" : "disabled"}>Generate duty roster</button></div></header>${allocated ? "" : `<p class="small muted" style="margin:0 16px 12px">Allocate halls first.</p>`}
        ${A.table([{ label: "Date / time", render: (s) => `${A.fmtDate(s.date)} ${s.time}` }, { label: "Code", code: true, key: "code" }, { label: "Hall", render: (s) => s.duties.map((d) => esc(d.hall)).join("<br>") }, { label: "Supervisor", render: (s) => s.duties.map((d) => esc(d.sup)).join("<br>") }, { label: "Invigilators", render: (s) => s.duties.map((d) => esc(d.inv.join(", "))).join("<br>") }, { label: "Hall attendant", render: (s) => s.duties.map((d) => esc(d.att)).join("<br>") }], ex.slots.filter((s) => s.duties.length), { empty: "No roster generated yet." })}
        ${ex.slots[0].duties.length ? `<section class="card flush" style="margin:0;border:0;border-top:1px solid var(--line);border-radius:0"><header><h2>Duty load per staff member</h2></header>${A.table([{ label: "Staff", key: "name" }, { label: "Role", key: "role" }, { label: "Duties", num: true, key: "load" }], ex.staff.filter((x) => x.load))}</section>` : ""}</section>`;
      if (exTab === "docs") body.innerHTML = `<section class="card flush"><header><h2>Document pack per examination (EXM-13)</h2></header>${A.table([{ label: "Code", code: true, key: "code" }, { label: "Date", render: (s) => A.fmtDate(s.date) }, { label: "Documents", render: (s) => ["Attendance sheet", "Mark sheet", "1st examiner sheet", "2nd examiner sheet", "Moderation sheet"].map((d) => `<button class="btn sm" type="button" data-doc="${esc(d)}" data-code="${s.code}">${d}</button>`).join(" ") }], ex.slots)}</section>`;
      A.$$("#ex-tabs [data-tab]").forEach((b) => b.onclick = () => { exTab = b.dataset.tab; A.rerender(); });
      A.$$("[data-sd]", el).forEach((i) => i.onchange = () => { const s = ex.slots.find((x) => x.id === i.dataset.sd); s.date = i.value; s.halls = []; s.duties = []; A.save(); A.rerender(); });
      A.$$("[data-stime]", el).forEach((i) => i.onchange = () => { const s = ex.slots.find((x) => x.id === i.dataset.stime); s.time = i.value; s.halls = []; s.duties = []; A.save(); A.rerender(); });
      const al = A.$("#alloc"); if (al) al.onclick = () => { allocate(ex); A.audit("Halls allocated", ex.session); A.save(); A.rerender(); A.toast("Halls allocated by candidate count"); };
      const du = A.$("#duty"); if (du) du.onclick = () => { roster(ex); A.audit("Duty roster generated", ex.session); A.save(); A.rerender(); A.toast("Duty roster generated with balanced load"); };
      A.$$("[data-doc]", el).forEach((b) => b.onclick = () => A.modal({ title: `${b.dataset.doc} · ${b.dataset.code}`, wide: true, body: examDoc(b.dataset.doc, ex.slots.find((s) => s.code === b.dataset.code)), actions: [{ label: "Print", kind: "primary", onClick: () => { window.print(); return false; } }] }));
    },
  });
  function allocate(ex) {
    const used = {};
    ex.slots.slice().sort((a, b) => b.count - a.count).forEach((s) => {
      const key = s.date + s.time; used[key] = used[key] || new Set(); let need = s.count; s.halls = [];
      ex.halls.slice().sort((a, b) => b.cap - a.cap).forEach((h) => { if (need <= 0 || used[key].has(h.id)) return; const seats = Math.min(h.cap, need); s.halls.push({ id: h.id, name: h.name, seats }); used[key].add(h.id); need -= seats; });
      s.unseated = Math.max(0, need);
    });
  }
  function roster(ex) {
    ex.staff.forEach((x) => (x.load = 0));
    const take = (role) => { const p = ex.staff.filter((x) => x.role === role).sort((a, b) => a.load - b.load)[0]; p.load++; return p.name; };
    ex.slots.forEach((s) => { s.duties = s.halls.map((h) => ({ hall: h.name, sup: take("Supervisor"), inv: Array.from({ length: Math.max(1, Math.ceil(h.seats / 40)) }, () => take("Invigilator")), att: take("Hall attendant") })); });
  }
  function examDoc(kind, s) {
    const rows = Array.from({ length: 12 }, (_, i) => `<tr><td>${i + 1}</td><td>S25${String(100 + i).padStart(3, "0")}</td><td></td><td></td>${/Mark|examiner|Moderation/.test(kind) ? "<td></td><td></td>" : ""}</tr>`).join("");
    return `<div class="doc"><div class="center tiny">UNIVERSITY OF KELANIYA · FACULTY OF SCIENCE</div><h2>${esc(kind)}</h2><div class="center small">${esc(s.code)} · ${esc(A.unitInfo(s.code).title)}</div>
      <table><tr><th>Date</th><td>${A.fmtDate(s.date)}</td><th>Time</th><td>${s.time}</td></tr><tr><th>Venue</th><td colspan="3">${esc(s.halls.map((h) => h.name).join(", ") || "To be allocated")}</td></tr></table>
      <table><tr><th>#</th><th>Index No.</th><th>${/Attendance/.test(kind) ? "Signature" : "Name"}</th><th>${/Attendance/.test(kind) ? "Present / Absent" : "Marks"}</th>${/Mark|examiner|Moderation/.test(kind) ? "<th>Grade</th><th>Remarks</th>" : ""}</tr>${rows}</table><p class="tiny">Showing the first 12 of ${s.count} candidates.</p></div>`;
  }

  /* ---------------- requests queue ---------------- */
  A.route("o-req", {
    roles: ["exam"], title: "Student requests & appeals", nav: "Requests & appeals", group: "Student services",
    desc: "Appeals, medical submissions, letters and paid documents from students.", req: ["REQ-01", "REQ-02", "REQ-03", "REQ-05", "REQ-06"],
    count: () => S().requests.filter((r) => !/Issued|Approved|Rejected|Awaiting Dean|Awaiting payment/.test(r.state)).length,
    render(el) {
      el.innerHTML = `<section class="card flush">${A.table([{ label: "Ref", code: true, key: "id" }, { label: "Type", key: "type" }, { label: "Student", render: (r) => `${esc(r.student)}<div class="mono tiny">${esc(r.regNo)}</div>` }, { label: "Submitted", render: (r) => A.fmtDate(r.submitted) }, { label: "Fee", num: true, render: (r) => r.fee ? `${A.money(r.fee)} ${r.paid ? A.pill("Paid", "ok") : A.pill("Unpaid", "warn")}` : "Free" },
        { label: "Status", render: (r) => A.pill(r.state, /Issued|Approved/.test(r.state) ? "ok" : /Rejected/.test(r.state) ? "bad" : "info") }, { label: "", render: (r) => /Issued|Approved|Rejected/.test(r.state) ? "" : /Awaiting Dean/.test(r.state) ? `<span class="tiny muted">With the Dean</span>` : `<button class="btn sm primary" type="button" data-next="${r.id}" ${r.paid ? "" : "disabled"}>${/letter|sheet|Transcript/i.test(r.type) ? "Issue document" : /appeal/i.test(r.type) ? "Forward to Dean" : "Approve"}</button>` }], S().requests)}</section>`;
      A.$$("[data-next]", el).forEach((b) => b.onclick = () => { const r = S().requests.find((x) => x.id === b.dataset.next); r.state = /letter|sheet|Transcript/i.test(r.type) ? "Issued" : /appeal/i.test(r.type) ? "Awaiting Dean" : "Approved"; A.audit("Request " + r.state.toLowerCase(), r.id); A.save(); A.rerender(); A.toast(`${r.id}: ${r.state}. The student has been emailed.`); });
    },
  });

  /* ---------------- pass list, final results sheet, Dean's list (EXM-10, EXM-11, REQ-04, SEL-04) ---------------- */
  let passTab = "pass";
  A.route("o-pass", {
    roles: ["exam", "dean"], title: "Final results, pass list & Dean's list", nav: "Pass list & Dean's list", group: "Awards",
    desc: "Degree eligibility and class are worked out from the handbook rules. The Board of Examiners and the Senate confirm them before anything is issued.", req: ["EXM-10", "EXM-11", "REQ-04", "SEL-04"],
    render(el) {
      const fin = S().finalists.map((f) => { const eligible = f.credits >= 90 && f.gpa >= 2; const cls = !eligible ? "Not eligible" : f.years > 3 ? "Pass (class needs 3 years)" : A.classFor(f.gpa); return Object.assign({}, f, { eligible, cls, why: f.credits < 90 ? `${90 - f.credits} credits short` : f.gpa < 2 ? "GPA below 2.00" : "" }); });
      const counts = {}; fin.forEach((f) => (counts[f.cls] = (counts[f.cls] || 0) + 1));
      const dl = S().students.filter((s) => s.gpa >= 3.7 && s.status === "Active").sort((a, b) => b.gpa - a.gpa);
      el.innerHTML = `${A.tabs("pass-tabs", [["pass", "Final results & pass list"], ["dean", "Dean's list"]], passTab)}<div id="pass-body"></div>`;
      const body = A.$("#pass-body");
      if (passTab === "pass") {
        body.innerHTML = `<div class="grid g4">${["First Class", "Second Class (Upper)", "Second Class (Lower)", "Pass"].map((c) => A.stat(counts[c] || 0, c)).join("")}</div>
          ${A.alert("info", "Two students need a Board of Examiners decision: one is short of credits, one took four years and is not eligible for a class.")}
          <section class="card flush"><header><h2>BSc 2025/26 graduating cohort (sample)</h2><div class="sp"><button class="btn sm" type="button" id="pl-csv">Download pass list (CSV)</button><button class="btn sm" type="button" onclick="window.print()">Print</button><button class="btn sm primary" type="button" id="pl-board">Send to Board of Examiners</button></div></header>
          ${A.table([{ label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "Degree", key: "programme" }, { label: "Credits", num: true, key: "credits" }, { label: "GPA", num: true, render: (f) => f.gpa.toFixed(2) }, { label: "Years", num: true, key: "years" }, { label: "Class", render: (f) => A.pill(f.cls, f.eligible ? (f.cls === "First Class" ? "acc" : "ok") : "bad") }, { label: "Note", render: (f) => `<span class="tiny muted">${esc(f.why)}</span>` }], fin.sort((a, b) => b.gpa - a.gpa), { rowClass: (f) => f.eligible ? "" : "flag" })}</section>`;
        A.$("#pl-csv").onclick = () => A.download("pass-list.csv", A.toCSV([{ label: "Reg No", key: "regNo" }, { label: "Name", key: "name" }, { label: "Degree", key: "programme" }, { label: "Class", key: "cls" }, { label: "GPA", csv: (f) => f.gpa.toFixed(2) }], fin), "text/csv");
        A.$("#pl-board").onclick = () => { A.audit("Pass list sent to Board", "BSc 2025/26"); A.toast("Sent to the Board of Examiners. After the Board, it goes to the Senate for confirmation."); };
      } else {
        body.innerHTML = `${A.alert("warn", "<b>Criteria not yet defined.</b> The handbook and the requirements do not define the Dean's list. This prototype uses GPA ≥ 3.70 and Active status as a placeholder (open question Q4).")}
          <section class="card flush"><header><h2>Dean's list 2025/26 (draft, ${dl.length} students)</h2><div class="sp"><button class="btn sm" type="button" id="dl-csv">Download</button><button class="btn sm primary" type="button" id="dl-pub" ${S().deansList ? "disabled" : ""}>${S().deansList ? "Published" : "Publish"}</button></div></header>
          ${A.table([{ label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "Programme", render: (s) => `<span class="small">${esc(s.programmeLabel)}</span>` }, { label: "Year", num: true, key: "year" }, { label: "GPA", num: true, render: (s) => s.gpa.toFixed(2) }], dl)}</section>`;
        A.$("#dl-csv").onclick = () => A.download("deans-list.csv", A.toCSV([{ label: "Reg No", key: "regNo" }, { label: "Name", key: "name" }, { label: "GPA", csv: (s) => s.gpa.toFixed(2) }], dl), "text/csv");
        A.$("#dl-pub").onclick = () => { S().deansList = { at: A.TODAY, n: dl.length }; A.audit("Dean's list published", `${dl.length} students`); A.save(); A.rerender(); A.toast("Published. Students on the list can now request a Dean's list letter."); };
      }
      A.$$("#pass-tabs [data-tab]").forEach((b) => b.onclick = () => { passTab = b.dataset.tab; A.rerender(); });
    },
  });

  /* ---------------- reports (SCH-01..08) ---------------- */
  const REPORTS = [
    ["SCH-01", "Registered students per module (proper and repeat)"], ["SCH-02", "Registered students per module with pathway"], ["SCH-03", "Students with clashing modules"], ["SCH-04", "Student academic record by year"],
    ["SCH-05", "Proper vs repeat registrations"], ["SCH-06", "Module registrations by year of study"], ["SCH-07", "Students per year of study"], ["SCH-08", "Students by pathway and degree"],
  ];
  A.route("o-reports", {
    roles: ["exam", "coord", "hod", "dean"], title: "Reports & schedules", nav: "Reports", group: "Insight",
    desc: "Standard lists and summaries. Every report can be downloaded as CSV.", req: REPORTS.map((r) => r[0]),
    render(el) {
      const k = ui().rep || "SCH-01"; const { cols, rows } = report(k);
      el.innerHTML = `<div class="grid g-side" style="grid-template-columns:280px minmax(0,1fr)"><section class="card"><header><h2>Reports</h2></header><div class="stack">${REPORTS.map(([id, t]) => `<button class="btn ${id === k ? "primary" : ""}" style="justify-content:flex-start;white-space:normal;text-align:left" type="button" data-rep="${id}"><span class="mono tiny">${id}</span> ${esc(t)}</button>`).join("")}</div></section>
        <section class="card flush"><header><h2>${esc(REPORTS.find((r) => r[0] === k)[1])}</h2><div class="sp"><button class="btn sm" type="button" id="rep-csv">Download CSV</button></div></header>${A.table(cols, rows)}</section></div>`;
      A.$$("[data-rep]", el).forEach((b) => b.onclick = () => { ui().rep = b.dataset.rep; A.rerender(); });
      A.$("#rep-csv").onclick = () => A.download(`${k}.csv`, A.toCSV(cols.map((c) => Object.assign({ csv: (r) => (c.key ? r[c.key] : String(c.render(r)).replace(/<[^>]+>/g, "")) }, c)), rows), "text/csv");
    },
  });
  function report(k) {
    const st = S(), offs = Object.entries(st.offerings).map(([code, o]) => ({ code, title: A.unitInfo(code).title, proper: o.enrolled, repeat: Math.round(o.enrolled * 0.06), year: +code[5] }));
    const T = (cols, rows) => ({ cols, rows });
    if (k === "SCH-01") return T([{ label: "Code", code: true, key: "code" }, { label: "Course unit", key: "title" }, { label: "Proper", num: true, key: "proper" }, { label: "Repeat", num: true, key: "repeat" }, { label: "Total", num: true, render: (r) => r.proper + r.repeat }], offs);
    if (k === "SCH-02") return T([{ label: "Code", code: true, key: "code" }, { label: "PS 1", num: true, render: (r) => Math.round(r.proper * 0.2) }, { label: "PS 2", num: true, render: (r) => Math.round(r.proper * 0.35) }, { label: "PS 4", num: true, render: (r) => Math.round(r.proper * 0.25) }, { label: "PS 5", num: true, render: (r) => Math.round(r.proper * 0.2) }], offs.filter((o) => o.code.startsWith("COSC")));
    if (k === "SCH-03") return T([{ label: "Reg. No.", code: true, key: "r" }, { label: "Name", key: "n" }, { label: "Clash", key: "c" }], st.students.slice(3, 7).map((s) => ({ r: s.regNo, n: s.name, c: "MAPS 22603 and PHYS 22533 (Mon 08:00–10:00)" })));
    if (k === "SCH-04") return T([{ label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "Year", num: true, key: "year" }, { label: "Registered units", num: true, render: (s) => 10 + (s.name.length % 5) }, { label: "Repeat/medical", num: true, render: (s) => s.name.length % 3 === 0 ? 1 : 0 }, { label: "Credits", num: true, render: (s) => 30 * (s.year - 1) + 31 }, { label: "GPA", num: true, render: (s) => s.gpa.toFixed(2) }], st.students.slice(0, 40));
    if (k === "SCH-05") return T([{ label: "Year of study", key: "y" }, { label: "Proper", num: true, key: "p" }, { label: "Repeat", num: true, key: "r" }, { label: "Medical", num: true, key: "m" }], [1, 2, 3, 4].map((y) => ({ y: "Year " + y, p: 640 - y * 70, r: 30 + y * 6, m: 6 + y })));
    if (k === "SCH-06") return T([{ label: "Year", num: true, key: "year" }, { label: "Code", code: true, key: "code" }, { label: "Course unit", key: "title" }, { label: "Students", num: true, key: "proper" }], offs.sort((a, b) => a.year - b.year));
    if (k === "SCH-07") return T([{ label: "Year", key: "y" }, { label: "Students", num: true, key: "n" }, { label: "Female", num: true, key: "f" }, { label: "Male", num: true, key: "m" }], [1, 2, 3, 4].map((y) => { const l = st.students.filter((s) => s.year === y); return { y: "Year " + y, n: l.length, f: l.filter((s) => s.gender === "Female").length, m: l.filter((s) => s.gender === "Male").length }; }));
    return T([{ label: "Programme", key: "p" }, { label: "Students", num: true, key: "n" }], window.Mock.PROGRAMMES.map((p) => ({ p: p.label, n: st.students.filter((s) => s.programme === p.id).length })));
  }

  /* ---------------- selection rounds (SEL-01..06) ---------------- */
  A.route("c-sel", {
    roles: ["coord", "exam"], title: "Selection rounds", nav: "Selection rounds", group: "Programmes",
    desc: "Honours, pathway and specialisation selections. The system checks each applicant against the handbook gate, ranks by GPA and fills places in preference order.",
    req: ["SEL-01", "SEL-02", "SEL-03", "SEL-05", "SEL-06", "PS-06", "PS-08"],
    render(el) {
      const rd = S().selection.rounds.find((r) => r.id === (ui().round || "hons-ps"));
      const gate = (a, k) => { const why = []; if (a.gpa < 3) why.push("GPA below 3.00"); if (a.weak > 8) why.push(`${a.weak} weak credits`); if (a.eGrade) why.push("E grade"); if (!a.subjectC[k]) why.push(`below C in a ${k} unit`); return why; };
      const alloc = rd.allocation;
      el.innerHTML = `<div class="row">${S().selection.rounds.map((r) => `<button class="btn ${r.id === rd.id ? "primary" : ""}" type="button" data-round="${r.id}">${esc(r.name)}</button>`).join("")}</div>
        <section class="card"><header><h2>${esc(rd.name)}</h2><div class="sp">${A.pill(rd.state, alloc ? "ok" : "info")}</div></header>
          ${A.steps(["Configure", "Collect preferences", "Check eligibility", "Allocate", "Approve & publish"], rd.state === "Published" ? 5 : alloc ? 4 : rd.applicants.length ? 1 : 0)}
          <dl class="kv"><dt>Ranking</dt><dd>${esc(rd.ranking)}</dd><dt>Applicants</dt><dd>${rd.applicants.length}</dd><dt>Gate</dt><dd>GPA ≥ 3.00 · C or better in the subject's compulsory units · ≤ 8 credits of D/D+/C− · no E (§1.5.2)</dd></dl>
          ${A.table([{ label: "Programme", key: "label" }, { label: "Places", num: true, render: (o) => `<input type="number" min="0" data-cap="${o.k}" value="${o.cap}" aria-label="Places for ${esc(o.label)}" ${alloc ? "disabled" : ""}>` }, { label: "1st choice", num: true, render: (o) => rd.applicants.filter((a) => a.prefs[0] === o.k).length }, { label: "Allocated", num: true, render: (o) => alloc ? alloc.filter((x) => x.placed === o.label).length : "—" }], rd.options)}
          <div class="row">${rd.applicants.length ? (alloc ? `<button class="btn" type="button" id="undo">Undo allocation</button>${rd.state !== "Published" ? `<button class="btn primary" type="button" id="publish">Approve & publish</button>` : ""}` : `<button class="btn primary" type="button" id="run">Run eligibility check & allocation</button>`) : A.alert("info", "This round has not opened yet. Applicants appear once the window opens.")}</div>
        </section>
        ${rd.applicants.length ? `<section class="card flush"><header><h2>${alloc ? "Allocation result" : "Applicants"}</h2><div class="sp"><button class="btn sm" type="button" id="sel-csv">Download</button></div></header>
          ${A.table([{ label: "Rank", num: true, render: (a, i) => i + 1 }, { label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", key: "name" }, { label: "GPA", num: true, render: (a) => a.gpa.toFixed(2) }, { label: "Weak cr.", num: true, key: "weak" }, { label: "Preferences", render: (a) => a.prefs.map((k, i) => { const w = gate(a, k); return `<span class="pill ${w.length ? "bad" : "ok"}" title="${esc(w.join(", ") || "Eligible")}">${i + 1}. ${k}</span>`; }).join(" ") },
            { label: alloc ? "Placed in" : "Eligible for", render: (a) => alloc ? (a.placed ? A.pill(a.placed, "ok") : `${A.pill("Not placed", "bad")}<div class="tiny muted">${esc(a.reason)}</div>`) : `<span class="small">${rd.options.filter((o) => !gate(a, o.k).length).map((o) => o.k).join(", ") || "None"}</span>` }],
            (alloc || rd.applicants.slice().sort((x, y) => y.gpa - x.gpa || x.weak - y.weak)), { rowClass: (a) => a.sid === S().me.id ? "flag" : "" })}</section>` : ""}`;
      A.$$("[data-round]", el).forEach((b) => b.onclick = () => { ui().round = b.dataset.round; A.rerender(); });
      A.$$("[data-cap]", el).forEach((i) => i.onchange = () => { rd.options.find((o) => o.k === i.dataset.cap).cap = +i.value; A.save(); });
      const run = A.$("#run"); if (run) run.onclick = () => {
        const left = Object.fromEntries(rd.options.map((o) => [o.k, o.cap]));
        rd.allocation = rd.applicants.slice().sort((x, y) => y.gpa - x.gpa || x.weak - y.weak).map((a) => {
          const ok = a.prefs.find((k) => !gate(a, k).length && left[k] > 0);
          if (ok) { left[ok]--; return Object.assign({}, a, { placed: rd.options.find((o) => o.k === ok).label }); }
          const elig = a.prefs.filter((k) => !gate(a, k).length);
          return Object.assign({}, a, { placed: null, reason: elig.length ? "Eligible but preferred programmes were full" : gate(a, a.prefs[0]).join(", ") });
        });
        rd.state = "Allocated · awaiting approval"; A.audit("Selection allocated", rd.name); A.save(); A.rerender(); A.toast("Allocation done. Review it, then approve and publish.");
      };
      const un = A.$("#undo"); if (un) un.onclick = () => { rd.allocation = null; rd.state = "Collecting preferences"; A.save(); A.rerender(); };
      const pub = A.$("#publish"); if (pub) pub.onclick = () => A.confirm("Approve & publish", "Students are notified of their allocation and their study plans switch to the Honours structure.", "Publish", () => { rd.state = "Published"; A.audit("Selection published", rd.name); A.save(); A.rerender(); A.toast("Published. Students have been notified."); });
      const csv = A.$("#sel-csv"); if (csv) csv.onclick = () => A.download("selection.csv", A.toCSV([{ label: "Reg No", key: "regNo" }, { label: "Name", key: "name" }, { label: "GPA", key: "gpa" }, { label: "Placed", key: "placed" }], alloc || rd.applicants), "text/csv");
    },
  });

  A.nav("exam", [
    { title: "Faculty Office", items: ["o-home", "o-students", "o-cal", "o-off"] },
    { title: "Examinations", items: ["o-results", "o-exams", "sheet"] },
    { title: "Student services", items: ["o-req", "c-sel", "o-pass"] },
    { title: "Insight", items: ["o-reports", "an"] },
  ]);
  A.nav("coord", [{ title: "Programmes", items: ["c-sel", "o-off", "o-cal"] }, { title: "Insight", items: ["o-reports", "an"] }]);
})(window.App);
