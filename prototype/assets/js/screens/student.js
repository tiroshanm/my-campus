/* Student portal screens */
(function (A) {
  "use strict";
  const esc = A.esc;
  const S = () => A.state();
  const P = (code) => window.CATALOG.PREQ[code] || ["", "", 0];
  const codesIn = (t) => [...new Set([...(t || "").matchAll(/([A-Z]{4})\s?(\d{5})/g)].map((m) => m[1] + " " + m[2]))];
  const daysLeft = (d) => Math.ceil((new Date(d + "T23:59:59") - new Date(A.TODAY + "T12:00:00")) / 864e5);
  const windowOpen = (w) => A.TODAY >= w.open && A.TODAY <= w.close;
  const best = (code) => { const rs = S().myResults.filter((r) => r.code === code && r.released); if (!rs.length) return null; return rs.reduce((a, b) => (A.gp(b.grade) > A.gp(a.grade) ? b : a)).grade; };

  /* ---------------- registration validation (REG-03, REG-07, REG-09, REG-15) ---------------- */
  /* A prerequisite is met if passed (D or better, to be confirmed), or "planned" if it is selected in this
     registration and runs in an earlier semester of the same year. */
  function preStatus(p, unit, sel) {
    const g = best(p); if (g && A.atLeast(g, "D")) return "met";
    const pu = A.unitInfo(p), uu = A.unitInfo(unit);
    if (sel.has(p) && pu.level === uu.level && pu.sem === 1 && uu.sem === 2) return "planned";
    return "missing";
  }
  function structY2() { return window.Mock.structUnits(S().me.combination).filter((u) => u.code[5] === "2"); }
  function validate(selected) {
    const issues = []; const per = {};
    const sel = new Set(selected);
    // prerequisites
    selected.forEach((c) => {
      const pre = codesIn(P(c)[0]);
      pre.forEach((p) => { const s = preStatus(p, c, sel); if (s === "missing") { const g = best(p); issues.push({ kind: "bad", code: c, text: `${c} needs ${p} completed first${g ? ` (you have ${g})` : ""}.` }); } });
      codesIn(P(c)[1]).forEach((co) => { if (S().offerings[co] && !sel.has(co)) issues.push({ kind: "bad", code: c, text: `${c} must be taken together with its co-requisite ${co}.` }); });
    });
    // clashes: same timetable slot in the same semester (semester code 3 = both, 4 = either)
    const bySlot = {};
    selected.forEach((c) => { const o = S().offerings[c]; if (!o) return; const sm = A.unitInfo(c).sem; (sm === 3 || sm === 4 ? [1, 2] : [sm]).forEach((x) => { const k = x + "|" + o.slot; (bySlot[k] = bySlot[k] || []).push(c); }); });
    Object.entries(bySlot).forEach(([k, cs]) => { if (cs.length > 1) { const [sm, slot] = k.split("|"); issues.push({ kind: "bad", code: cs[1], text: `Timetable clash in Semester ${sm === "1" ? "I" : "II"}, ${slot}: ${cs.join(" and ")}.` }); } });
    // credits
    let gpaCr = 0, other = { 1: 0, 2: 0 };
    selected.forEach((c) => { const u = A.unitInfo(c); if (A.isGPA(c)) gpaCr += u.credits; if (S().offerings[c] && S().offerings[c].faculty) other[u.sem === 2 ? 2 : 1] += u.credits; });
    if (gpaCr < 30) issues.push({ kind: "warn", text: `Only ${gpaCr} credits selected. The handbook requires at least 30 credits in each academic year (§1.4).` });
    [1, 2].forEach((s) => { if (other[s] > 2) issues.push({ kind: "bad", text: `${other[s]} credits from other faculties in Semester ${s === 1 ? "I" : "II"}. The limit is 2 credits per semester (6 in total).` }); });
    per.gpaCr = gpaCr; per.other = other;
    return { issues, per };
  }

  /* ---------------- dashboard ---------------- */
  A.route("s-home", {
    roles: ["student"], title: "My dashboard", nav: "Dashboard", group: "Student portal",
    desc: "What needs your attention this semester.", req: ["REG-09", "REG-10", "REG-14", "EXM-15"],
    render(el) {
      const st = S(), me = st.me, gpa = A.gpa(st.myResults);
      const earned = st.myResults.filter((r) => A.isGPA(r.code) && A.atLeast(r.grade, "D")).reduce((a, r) => a + A.unitInfo(r.code).credits, 0);
      const regW = st.windows.find((w) => w.id === "w1"), repW = st.windows.find((w) => w.id === "w3");
      const rep = st.registration.repeats.filter((x) => !x.registered);
      const alerts = [];
      if (st.registration.status !== "Submitted" && windowOpen(regW)) alerts.push(["warn", `<b>Course registration for 2026/27 closes in ${daysLeft(regW.close)} days.</b> Your registration is still a draft. <a href="#s-reg">Finish registration</a>`]);
      if (st.registration.status === "Submitted") alerts.push(["ok", `<b>Registration submitted.</b> ${st.registration.selected.length} units for 2026/27. You can add or drop optional units from 25 Nov to 8 Dec.`]);
      if (rep.length) alerts.push(["warn", `<b>${rep.length} repeat unit to register:</b> ${rep.map((x) => x.code).join(", ")}. The best grade you can get on a repeat is C. Register and pay by ${A.fmtDate(repW.close)}. <a href="#s-reg">Open repeats</a>`]);
      alerts.push(["info", `<b>Honours selection opens on 1 Dec.</b> Check which Honours programmes you can still reach. <a href="#s-audit">Degree progress</a>`]);
      el.innerHTML = `<div class="stack">${alerts.map(([k, h]) => A.alert(k, h)).join("")}</div>
        <div class="grid g4">${A.stat(gpa.toFixed(2), "Cumulative GPA", "Year 1 · 2025/26")}${A.stat(earned, "GPA credits earned", "of 90 for the BSc")}${A.stat("Year 2", "Year of study", esc(me.combinationLabel.split(" · ")[0]))}${A.stat(esc(me.status), "Academic status", me.adminRegistered ? "University registration complete" : "University registration pending")}</div>
        <div class="grid g-side">
          <section class="card"><header><h2>Upcoming dates</h2></header>
            ${A.table([{ label: "What", render: (w) => `<b>${esc(w.type)}</b><div class="tiny muted">${esc(w.scope)}</div>` }, { label: "Opens", render: (w) => A.fmtDate(w.open) }, { label: "Closes", render: (w) => A.fmtDate(w.close) }, { label: "", render: (w) => windowOpen(w) ? A.pill("Open now", "ok") : A.TODAY < w.open ? A.pill("Upcoming", "info") : A.pill("Closed") }],
              st.windows.filter((w) => !/Mark entry/.test(w.type)))}
          </section>
          <section class="card"><header><h2>Notifications</h2></header><div class="stack">${st.notifications.map((n) => `<div class="alert ${n.kind}"><div class="grow">${esc(n.text)}<div class="tiny">${A.fmtDT(n.at)}</div></div></div>`).join("")}</div></section>
        </div>`;
    },
  });

  /* ---------------- course registration ---------------- */
  let regTab = "units";
  A.route("s-reg", {
    roles: ["student"], title: "Course registration 2026/27", nav: "Course registration", group: "Student portal",
    desc: "Choose your Year 2 course units. Compulsory units are already selected. The checks on the right update as you choose.",
    req: ["REG-01", "REG-03", "REG-04", "REG-07", "REG-09", "REG-10", "REG-15", "PS-03"],
    count: () => (S().registration.status === "Submitted" ? 0 : 1) + S().registration.repeats.filter((r) => !r.registered).length,
    render(el) {
      const st = S(), reg = st.registration, locked = reg.status === "Submitted";
      const units = structY2(); const v = validate(reg.selected);
      const unitRows = (list) => list.map((u) => {
        const info = A.unitInfo(u.code), o = st.offerings[u.code] || {}, on = reg.selected.includes(u.code);
        const pre = codesIn(P(u.code)[0]), co = codesIn(P(u.code)[1]);
        const selSet = new Set(reg.selected);
        const pst = pre.map((p) => preStatus(p, u.code, selSet));
        const preOk = pst.every((s) => s !== "missing"), prePlanned = pst.includes("planned");
        const preTxt = P(u.code)[0];
        const bad = v.issues.some((i) => i.code === u.code && i.kind === "bad");
        return { u, info, o, on, pre, co, preOk, prePlanned, preTxt, bad };
      });
      const rowsMain = unitRows(units);
      const rowsOther = unitRows(window.Mock.OTHER.map(([c]) => ({ code: c, st: "A" })));
      const cols = [
        { label: "", render: (r) => `<input type="checkbox" aria-label="Select ${r.u.code}" data-unit="${r.u.code}" ${r.on ? "checked" : ""} ${r.u.st === "C" || locked ? "disabled" : ""}>` },
        { label: "Code", code: true, render: (r) => esc(r.u.code) },
        { label: "Course unit", render: (r) => `${esc(r.info.title)}${r.o.faculty ? `<div class="tiny muted">${esc(r.o.faculty)}</div>` : ""}` },
        { label: "Status", render: (r) => A.st(r.u.st) },
        { label: "Credits", num: true, render: (r) => r.info.credits + (A.isGPA(r.u.code) ? "" : `<div class="tiny muted">non-GPA</div>`) },
        { label: "Semester", render: (r) => ({ 1: "I", 2: "II", 3: "I & II", 4: "I or II" })[r.info.sem] || "—" },
        { label: "Timetable", render: (r) => `<span class="small">${esc(r.o.slot || "—")}</span>` },
        { label: "Requisites", render: (r) => (r.pre.length ? (!r.preOk ? A.pill("Prerequisite missing", "bad") : r.prePlanned ? `${A.pill("Planned in Semester I", "info")}<div class="tiny muted">${esc(r.pre.join(", "))}</div>` : A.pill("Prerequisites met", "ok")) : /A\/L/.test(r.preTxt) ? A.pill(r.preTxt.replace(/G\.?C\.?E\.?\s*/, ""), "") : `<span class="muted small">None</span>`) + (r.co.length ? `<div class="tiny muted">Take with ${esc(r.co.join(", "))}</div>` : "") },
      ];
      const rowCls = (r) => (r.bad && r.on ? "flag" : r.on ? "" : "dim");
      const issues = v.issues;
      const sem = (n) => reg.selected.filter((c) => A.unitInfo(c).sem === n && A.isGPA(c)).reduce((a, c) => a + A.unitInfo(c).credits, 0);
      el.innerHTML = `
        ${locked ? A.alert("ok", `<b>Registration submitted on ${A.fmtDate(reg.submittedOn || A.TODAY)}.</b> Changes to optional units are allowed only in the add/drop period (25 Nov – 8 Dec).`) : ""}
        ${A.tabs("reg-tabs", [["units", `Year 2 units (${units.length})`], ["repeat", `Repeat & medical (${reg.repeats.length})`], ["other", "Other faculties"]], regTab)}
        <div class="grid g-side">
          <div class="stack">
            ${regTab === "units" ? `<section class="card flush"><header><h2>Units in your study plan</h2><div class="sp"><span class="small muted">Edition 2023/24 · ${esc(st.me.combinationLabel)}</span></div></header>${A.table(cols, rowsMain, { rowClass: rowCls })}</section>` : ""}
            ${regTab === "other" ? `<section class="card flush"><header><h2>Auxiliary units offered by other faculties</h2></header><p class="small muted" style="margin:0 16px">Shown separately (REG-15). At most 2 credits per semester and 6 credits across Years 1–3 count towards your degree.</p>${A.table(cols, rowsOther, { rowClass: rowCls })}</section>` : ""}
            ${regTab === "repeat" ? repeatsHTML(reg) : ""}
          </div>
          <aside class="stack">
            <section class="card"><header><h2>Checks</h2></header>
              <dl class="kv"><dt>GPA credits selected</dt><dd><b>${v.per.gpaCr}</b> <span class="muted">(minimum 30)</span></dd><dt>Semester I / II</dt><dd>${sem(1) + sem(3) / 2} / ${sem(2) + sem(3) / 2}</dd><dt>Other faculties</dt><dd>${v.per.other[1]} / ${v.per.other[2]} credits <span class="muted">(max 2 each)</span></dd></dl>
              <div class="bar ${v.per.gpaCr >= 30 ? "ok" : "warn"}"><i style="width:${Math.min(100, (v.per.gpaCr / 30) * 100)}%"></i></div>
              ${issues.length ? issues.map((i) => A.alert(i.kind, esc(i.text))).join("") : A.alert("ok", "<b>All checks pass.</b> No clashes, all prerequisites and co-requisites met, credit load is within limits.")}
            </section>
            <section class="card"><header><h2>Repeat units</h2></header>
              <p class="small muted" style="margin:0">Shown separately from this year's units. They count towards the credits you still need (REG-10).</p>
              ${reg.repeats.map((x) => `<div class="row"><span class="mono">${x.code}</span><span class="small">${esc(A.unitInfo(x.code).title)}</span>${x.registered ? A.pill("Registered", "ok") : A.pill("Not registered", "warn")}</div>`).join("")}
            </section>
            ${locked ? "" : `<button class="btn primary" type="button" id="submit-reg" ${issues.some((i) => i.kind === "bad") ? "disabled" : ""}>Submit registration</button>
            <p class="tiny muted" style="margin:0">${issues.some((i) => i.kind === "bad") ? "Fix the problems above to submit." : "Your advisor and the Faculty Office will see your registration once you submit."}</p>`}
          </aside>
        </div>`;
      A.$$("#reg-tabs [data-tab]").forEach((b) => b.addEventListener("click", () => { regTab = b.dataset.tab; A.rerender(); }));
      A.$$("input[data-unit]", el).forEach((cb) => cb.addEventListener("change", () => {
        const c = cb.dataset.unit; reg.selected = cb.checked ? reg.selected.concat(c) : reg.selected.filter((x) => x !== c); A.save(); A.rerender();
      }));
      const sub = A.$("#submit-reg");
      if (sub) sub.addEventListener("click", () => A.confirm("Submit registration", `You are registering for <b>${reg.selected.length} units</b> (${v.per.gpaCr} GPA credits) for 2026/27.`, "Submit", () => {
        reg.status = "Submitted"; reg.submittedOn = A.TODAY; A.audit("Registration submitted", `${reg.selected.length} units, ${v.per.gpaCr} credits`); A.save(); A.rerender(); A.toast("Registration submitted. A confirmation email has been sent.");
      }));
      A.$$("[data-repeat]", el).forEach((b) => b.addEventListener("click", () => {
        const x = reg.repeats.find((r) => r.code === b.dataset.repeat);
        A.payment(`Repeat examination registration · ${x.code}`, x.fee, () => { x.paid = true; x.registered = true; A.audit("Repeat registered", x.code); A.save(); A.rerender(); });
      }));
    },
  });
  function repeatsHTML(reg) {
    return `<section class="card"><header><h2>Repeat and medical examinations</h2></header>
      ${A.alert("info", "A repeat attempt can earn <b>at most a C</b>. If you score lower than your previous grade, the previous grade stays (§2.3). Medical attempts approved by the Faculty are graded as first attempts.")}
      ${A.table([{ label: "Code", code: true, key: "code" }, { label: "Course unit", render: (x) => esc(A.unitInfo(x.code).title) }, { label: "Previous", render: (x) => A.pill(S().myResults.find((r) => r.code === x.code).grade, "warn") }, { label: "Attempt", render: () => "Repeat" }, { label: "Fee", num: true, render: (x) => A.money(x.fee) },
        { label: "", render: (x) => x.registered ? A.pill("Registered & paid", "ok") : `<button class="btn primary sm" type="button" data-repeat="${x.code}">Register & pay</button>` }], reg.repeats)}
      <p class="small muted" style="margin:0">Medical attempts: submit the medical certificate within 14 days of the absence from <a href="#s-req">Requests & documents</a>.</p></section>`;
  }

  /* ---------------- results ---------------- */
  A.route("s-results", {
    roles: ["student"], title: "My results", nav: "Results", group: "Student portal",
    desc: "Released results only. Results under review by examiners, the Head of Department or the Dean are not shown until released.",
    req: ["REG-14", "EXM-05", "REQ-03", "SCH-04"],
    render(el) {
      const rs = S().myResults.slice().sort((a, b) => a.sem - b.sem || a.code.localeCompare(b.code));
      const rows = []; [1, 2].forEach((s) => { rows.push({ __sub: `2025/26 · Year 1 · Semester ${s === 1 ? "I" : "II"}` }); rs.filter((r) => r.sem === s).forEach((r) => rows.push(r)); });
      const gpa = A.gpa(rs), cr = rs.filter((r) => A.isGPA(r.code)).reduce((a, r) => a + A.unitInfo(r.code).credits, 0);
      el.innerHTML = `<div class="grid g4">${A.stat(gpa.toFixed(2), "Cumulative GPA")}${A.stat(cr, "GPA credits attempted")}${A.stat(rs.filter((r) => A.atLeast(r.grade, "C")).length + "/" + rs.length, "Units at C or better")}${A.stat(A.classFor(gpa), "Current standing", "if the BSc rules were applied today")}</div>
        <section class="card flush"><header><h2>Course unit results</h2><div class="sp"><button class="btn sm" type="button" id="req-interim">Request interim results sheet</button><button class="btn sm" type="button" id="req-trans">Request transcript</button></div></header>
        ${A.table([{ label: "Code", code: true, key: "code" }, { label: "Course unit", render: (r) => esc(A.unitInfo(r.code).title) }, { label: "Credits", num: true, render: (r) => A.unitInfo(r.code).credits }, { label: "Grade", render: (r) => A.pill(r.grade, A.atLeast(r.grade, "C") ? "ok" : A.atLeast(r.grade, "D") ? "warn" : "bad") }, { label: "Grade point", num: true, render: (r) => A.isGPA(r.code) ? A.gp(r.grade).toFixed(1) : "—" }, { label: "Attempt", key: "attempt" }, { label: "Note", render: (r) => !A.isGPA(r.code) ? `<span class="tiny muted">Not counted for GPA</span>` : !A.atLeast(r.grade, "C") ? `<span class="tiny">Repeat allowed (max grade C)</span>` : "" }], rows)}</section>
        <section class="card"><header><h2>Grading scale (handbook §2.2)</h2></header><div class="tw"><table class="t"><tr><th>Grade</th>${A.GRADES.map((g) => `<th class="num">${g[1]}</th>`).join("")}</tr><tr><td>Marks from</td>${A.GRADES.map((g) => `<td class="num">${g[0]}</td>`).join("")}</tr><tr><td>Points</td>${A.GRADES.map((g) => `<td class="num">${g[2].toFixed(1)}</td>`).join("")}</tr></table></div></section>`;
      A.$("#req-interim").onclick = () => A.go("s-req");
      A.$("#req-trans").onclick = () => A.go("s-req");
    },
  });

  /* ---------------- degree audit (EXM-10) ---------------- */
  let auditSubj = "COSC";
  A.route("s-audit", {
    roles: ["student"], title: "Degree progress", nav: "Degree progress", group: "Student portal",
    desc: "How far you are towards your degree, checked against the 2023/24 handbook rules. Pending items depend on results you have not received yet.",
    req: ["EXM-10", "SEL-03"],
    render(el) {
      const rs = S().myResults.filter((r) => A.isGPA(r.code)); const gpa = A.gpa(rs);
      const cr = (min) => rs.filter((r) => A.atLeast(r.grade, min)).reduce((a, r) => a + A.unitInfo(r.code).credits, 0);
      const subj = (s, min) => rs.filter((r) => r.code.startsWith(s) && A.atLeast(r.grade, min)).reduce((a, r) => a + A.unitInfo(r.code).credits, 0);
      const node = (state, text, val, have, need) => `<li class="${state}"><span class="ic">${state === "pass" ? "✓" : state === "fail" ? "✗" : "…"}</span><div>${text}${need ? `<div class="bar ${state === "pass" ? "ok" : state === "fail" ? "bad" : "warn"}"><i style="width:${Math.min(100, (have / need) * 100)}%"></i></div>` : ""}</div><span class="val">${val}</span></li>`;
      const two = ["COSC", "PHYS", "PMAT"].map((s) => [s, subj(s, "C")]).sort((a, b) => b[1] - a[1]);
      const bsc = [
        node(cr("D") >= 90 ? "pass" : "pend", "At least 90 credits at D or better over three years, including 60 in Years 1–2", `${cr("D")} / 90`, cr("D"), 90),
        node("pend", "At least 30 credits in each academic year", "Year 1 ✓ · Years 2–3 pending"),
        node(cr("C") >= 72 ? "pass" : "pend", "At least 72 credits at C or better", `${cr("C")} / 72`, cr("C"), 72),
        node(two[0][1] >= 24 && two[1][1] >= 24 ? "pass" : "pend", `48 of those from two subjects, at least 24 each (one with practicals)`, `${two[0][0]} ${two[0][1]} · ${two[1][0]} ${two[1][1]}`, Math.min(two[0][1], 24) + Math.min(two[1][1], 24), 48),
        node(gpa >= 2 ? "pass" : "fail", "GPA of 2.00 or more", gpa.toFixed(2)),
        node("pass", "Complete within five consecutive academic years", "Deadline 2029/30"),
      ].join("");
      const OPT = { COSC: "Computer Science", PHYS: "Physics", PMAT: "Mathematics (Pure + Applied)" };
      const comp = window.Mock.structUnits(S().me.combination).filter((u) => u.st === "C" && u.code.startsWith(auditSubj) && +u.code[5] <= 2);
      const done = comp.filter((u) => rs.find((r) => r.code === u.code)); const todo = comp.length - done.length;
      const cOk = done.every((u) => A.atLeast(rs.find((r) => r.code === u.code).grade, "C"));
      const weak = rs.filter((r) => ["C-", "D+", "D"].includes(r.grade)).reduce((a, r) => a + A.unitInfo(r.code).credits, 0);
      const gate = [
        node(gpa >= 3 ? "pass" : "fail", "GPA of 3.00 or higher (Years 1–2)", `${gpa.toFixed(2)} so far`),
        node(!cOk ? "fail" : todo ? "pend" : "pass", `C or better in every ${OPT[auditSubj]} compulsory unit in Years 1–2`, `${done.length}/${comp.length} done${todo ? `, ${todo} in Year 2` : ""}`),
        node(weak <= 8 ? (weak ? "pend" : "pass") : "fail", "No more than 8 credits of D, D+ or C− in Years 1–2", `${weak} / 8 used`),
        node(rs.some((r) => r.grade === "E") ? "fail" : "pend", "No E grade in Years 1–2", "None so far"),
        auditSubj === "PMAT" ? node("fail", "Applied Mathematics compulsory units (18 credits) at C or better", "AMAT not in your combination") : "",
      ].join("");
      el.innerHTML = `<div class="grid g2">
        <section class="card"><header><h2>BSc (3-year) award</h2><div class="sp">${A.pill("Edition 2023/24", "acc")}</div></header><ul class="tree">${bsc}</ul>
          <p class="small muted" style="margin:0">Class if the rules were applied to today's GPA: <b>${A.classFor(gpa)}</b>. Classes need completion within three consecutive years.</p></section>
        <section class="card"><header><h2>Honours eligibility · what-if</h2><div class="sp"><label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>Honours in</span><select id="aud-subj">${Object.entries(OPT).map(([k, l]) => `<option value="${k}" ${k === auditSubj ? "selected" : ""}>${l}</option>`).join("")}</select></label></div></header>
          <ul class="tree">${gate}</ul>
          ${A.alert("info", "Applications open on 1 Dec. Departments cap the number of places and rank applicants by GPA, so meeting the rules does not guarantee a place.")}</section></div>`;
      A.$("#aud-subj").addEventListener("change", (e) => { auditSubj = e.target.value; A.rerender(); });
    },
  });

  /* ---------------- selections (student) ---------------- */
  A.route("s-sel", {
    roles: ["student"], title: "Honours & pathway selection", nav: "Selections", group: "Student portal",
    desc: "Rank the programmes you want. The Faculty checks eligibility, ranks applicants and publishes allocations after the window closes.",
    req: ["SEL-01", "SEL-02", "SEL-03"],
    render(el) {
      const rd = S().selection.rounds[0], me = rd.applicants.find((a) => a.sid === S().me.id), w = S().windows.find((x) => x.id === rd.window);
      const elig = (k) => me.gpa >= 3 && me.weak <= 8 && !me.eGrade && me.subjectC[k];
      el.innerHTML = `${A.alert("info", `<b>${esc(rd.name)}</b> · preferences can be changed from ${A.fmtDate(w.open)} to ${A.fmtDate(w.close)}. In this prototype you can try it now.`)}
        ${A.steps(["Window opens", "Rank preferences", "Eligibility check", "Ranking & allocation", "HoD / Coordinator approval", "Published"], rd.allocation ? 5 : 1)}
        <div class="grid g2"><section class="card"><header><h2>Your preferences</h2></header>
          <ol class="stack" style="margin:0;padding-left:18px">${me.prefs.map((k, i) => { const o = rd.options.find((x) => x.k === k); return `<li><div class="row"><b>${esc(o.label)}</b>${elig(k) ? A.pill("Eligible on current results", "ok") : A.pill("Not eligible yet", "warn")}<span style="margin-left:auto" class="row"><button class="btn sm" type="button" data-up="${i}" ${i ? "" : "disabled"} aria-label="Move ${esc(o.label)} up">↑</button><button class="btn sm" type="button" data-rm="${i}" aria-label="Remove ${esc(o.label)}">Remove</button></span></div></li>`; }).join("")}</ol>
          <div class="row"><select id="add-pref" aria-label="Add a programme">${rd.options.filter((o) => !me.prefs.includes(o.k)).map((o) => `<option value="${o.k}">${esc(o.label)}</option>`).join("")}</select><button class="btn" type="button" id="add-btn" ${me.prefs.length >= 3 ? "disabled" : ""}>Add</button><span class="tiny muted">Up to 3 choices</span></div>
        </section>
        <section class="card"><header><h2>Places available</h2></header>${A.table([{ label: "Honours programme", key: "label" }, { label: "Places", num: true, key: "cap" }, { label: "Applicants so far", num: true, render: (o) => rd.applicants.filter((a) => a.prefs[0] === o.k).length }], rd.options)}
          ${rd.allocation ? A.alert("ok", `<b>Allocation published:</b> ${esc((rd.allocation.find((x) => x.sid === me.sid) || {}).placed || "Not placed")}`) : ""}</section></div>`;
      A.$$("[data-up]", el).forEach((b) => b.onclick = () => { const i = +b.dataset.up; [me.prefs[i - 1], me.prefs[i]] = [me.prefs[i], me.prefs[i - 1]]; A.save(); A.rerender(); });
      A.$$("[data-rm]", el).forEach((b) => b.onclick = () => { me.prefs.splice(+b.dataset.rm, 1); A.save(); A.rerender(); });
      const add = A.$("#add-btn"); if (add) add.onclick = () => { const v = A.$("#add-pref").value; if (v && me.prefs.length < 3) { me.prefs.push(v); A.save(); A.rerender(); A.toast("Preference saved"); } };
    },
  });

  /* ---------------- exam admission (EXM-06, EXM-15) ---------------- */
  A.route("s-adm", {
    roles: ["student"], title: "Examination admission", nav: "Exam admission", group: "Student portal",
    desc: "Your admission card for the next examination session. Bring it with your student ID to every exam.",
    req: ["EXM-06", "EXM-15", "REG-14"],
    render(el) {
      const st = S(), me = st.me, slots = st.exams.slots.filter((s) => st.registration.selected.includes(s.code));
      if (!me.adminRegistered) { el.innerHTML = A.alert("bad", "<b>Admission on hold.</b> Complete your University administrative registration at the Student Affairs office, then the hold is removed automatically."); return; }
      A.setActions(`<button class="btn primary" type="button" onclick="window.print()">Print admission card</button>`);
      el.innerHTML = `${st.registration.status !== "Submitted" ? A.alert("warn", "Your 2026/27 registration is still a draft. The card below lists the units you have selected so far.") : ""}
        <div class="doc"><div class="center tiny">UNIVERSITY OF KELANIYA · FACULTY OF SCIENCE</div><h2>Examination Admission Card</h2><div class="center small">${esc(st.exams.session)}</div>
          <table><tr><th>Name</th><td>${esc(me.name)}</td><th>Index No.</th><td>${esc(me.indexNo)}</td></tr><tr><th>Registration No.</th><td>${esc(me.regNo)}</td><th>Programme</th><td>${esc(me.programmeLabel)}</td></tr></table>
          <table><tr><th>Code</th><th>Course unit</th><th>Date</th><th>Time</th><th>Venue</th><th>Invigilator</th></tr>
          ${slots.map((s) => `<tr><td>${s.code}</td><td>${esc(A.unitInfo(s.code).title)}</td><td>${A.fmtDate(s.date)}</td><td>${s.time}</td><td>${esc(s.halls.map((h) => h.name).join(", ") || "To be announced")}</td><td></td></tr>`).join("") || `<tr><td colspan="6">No examinations scheduled yet.</td></tr>`}</table>
          <p class="tiny">Candidates must be seated 15 minutes before the start. This card is valid only with the student identity card. Generated ${A.fmtDate(A.TODAY)} · verification code ${me.indexNo}-${st.registration.selected.length}</p></div>`;
    },
  });

  /* ---------------- requests & documents (REQ-01..06) ---------------- */
  const REQ_TYPES = [
    { k: "Exam deferment appeal", fee: 0, note: "Defer an examination to the next sitting. Attach supporting evidence.", fields: ["reason", "file"] },
    { k: "Medical submission", fee: 0, note: "Submit within 14 days of the absence (§1.8). Certificates not from the University Medical Centre need extra checks.", fields: ["absent", "reason", "file"] },
    { k: "Medium of Instruction letter", fee: 0, note: "Confirms that your programme is taught in English.", fields: [] },
    { k: "Interim results sheet", fee: 300, note: "Results released so far, signed and verifiable by QR code.", fields: [] },
    { k: "Detailed results sheet", fee: 500, note: "All attempts including repeats.", fields: [] },
    { k: "Transcript", fee: 1000, note: "Official transcript for graduates and leavers.", fields: [] },
    { k: "Dean's list letter", fee: 0, note: "Available if you appear on a published Dean's list.", fields: [] },
    { k: "Early exit (BSc MIT / IT after Year 3)", fee: 0, note: "Only for BSc Hons MIT / IT students.", fields: ["reason"], disabled: "Only for MIT / IT students" },
    { k: "Fallback exit (Higher Diploma)", fee: 0, note: "Only for BSc Hons MIT / IT students.", fields: ["reason"], disabled: "Only for MIT / IT students" },
    { k: "Revert to BSc", fee: 0, note: "Honours students: during Year 4 or within 14 days of Year 4 results.", fields: ["reason"], disabled: "Only for Honours students in Year 4" },
    { k: "Other appeal", fee: 0, note: "Any other academic appeal to the Faculty.", fields: ["reason", "file"] },
  ];
  A.route("s-req", {
    roles: ["student"], title: "Requests & documents", nav: "Requests & documents", group: "Student services",
    desc: "Appeals, medical submissions, letters, results sheets and transcripts. Paid items are issued after online payment.",
    req: ["REQ-01", "REQ-02", "REQ-03", "REQ-05", "REQ-06", "SEL-04", "REG-13"],
    render(el) {
      const mine = S().requests.filter((r) => r.regNo === S().me.regNo);
      A.setActions(`<button class="btn primary" type="button" id="new-req">New request</button>`, (a) => A.$("#new-req", a).onclick = newReq);
      el.innerHTML = `<section class="card flush"><header><h2>My requests</h2></header>${A.table([{ label: "Reference", code: true, key: "id" }, { label: "Type", key: "type" }, { label: "Submitted", render: (r) => A.fmtDate(r.submitted) }, { label: "Fee", num: true, render: (r) => r.fee ? A.money(r.fee) : "Free" }, { label: "Status", render: (r) => A.pill(r.state, r.state === "Issued" ? "ok" : /payment/i.test(r.state) ? "warn" : "info") }, { label: "", render: (r) => r.state === "Issued" ? `<button class="btn sm" type="button" data-view="${r.id}">View document</button>` : "" }], mine, { empty: "No requests yet." })}</section>
        <section class="card"><header><h2>What you can request</h2></header>${A.table([{ label: "Request", render: (t) => `<b>${esc(t.k)}</b><div class="tiny muted">${esc(t.note)}</div>` }, { label: "Fee", num: true, render: (t) => t.fee ? A.money(t.fee) : "Free" }, { label: "", render: (t) => t.disabled ? `<span class="tiny muted">${esc(t.disabled)}</span>` : "" }], REQ_TYPES)}</section>`;
      A.$$("[data-view]", el).forEach((b) => b.onclick = () => A.modal({ title: "Interim results sheet", wide: true, body: interimDoc(), actions: [{ label: "Print", kind: "primary", onClick: () => { window.print(); return false; } }] }));
    },
  });
  function newReq() {
    A.modal({
      title: "New request",
      body: `<label class="field"><span>Request type</span><select id="rq-type">${REQ_TYPES.map((t) => `<option ${t.disabled ? "disabled" : ""}>${esc(t.k)}</option>`).join("")}</select></label><div id="rq-extra"></div>`,
      actions: [{ label: "Cancel" }, { label: "Submit", kind: "primary", onClick: (m) => {
        const t = REQ_TYPES.find((x) => x.k === A.$("#rq-type", m).value);
        const ab = A.$("#rq-absent", m);
        if (ab && ab.value) { const days = (new Date(A.TODAY) - new Date(ab.value)) / 864e5; if (days > 14) { A.toast("Medical submissions must be made within 14 days of the absence."); return false; } }
        const rq = { id: "RQ-" + (1100 + S().requests.length), type: t.k, student: S().me.name, regNo: S().me.regNo, submitted: A.TODAY, state: t.fee ? "Awaiting payment" : "Submitted", fee: t.fee, paid: !t.fee };
        S().requests.unshift(rq); A.audit("Request submitted", `${rq.id} ${rq.type}`); A.save();
        if (t.fee) A.payment(t.k, t.fee, () => { rq.paid = true; rq.state = "In review"; A.save(); A.rerender(); }); else A.toast(`${rq.id} submitted.`);
        A.rerender();
      } }],
    });
    const draw = () => { const t = REQ_TYPES.find((x) => x.k === A.$("#rq-type").value); A.$("#rq-extra").innerHTML = `<p class="small muted" style="margin:0">${esc(t.note)}${t.fee ? ` Fee: <b>${A.money(t.fee)}</b>, paid online.` : ""}</p>
      ${t.fields.includes("absent") ? `<label class="field"><span>Date of absence</span><input type="date" id="rq-absent" value="2026-11-03"></label>` : ""}
      ${t.fields.includes("reason") ? `<label class="field"><span>Reason</span><textarea id="rq-reason"></textarea></label>` : ""}
      ${t.fields.includes("file") ? `<label class="field"><span>Supporting document (PDF or image)</span><input type="file" id="rq-file" accept=".pdf,image/*"></label>` : ""}`; };
    A.$("#rq-type").addEventListener("change", draw); draw();
  }
  function interimDoc() {
    const me = S().me, rs = S().myResults;
    return `<div class="doc"><div class="center tiny">UNIVERSITY OF KELANIYA · FACULTY OF SCIENCE</div><h2>Interim Results Sheet</h2>
      <table><tr><th>Name</th><td>${esc(me.name)}</td><th>Reg. No.</th><td>${esc(me.regNo)}</td></tr></table>
      <table><tr><th>Code</th><th>Course unit</th><th>Credits</th><th>Grade</th></tr>${rs.map((r) => `<tr><td>${r.code}</td><td>${esc(A.unitInfo(r.code).title)}</td><td>${A.unitInfo(r.code).credits}</td><td>${r.grade}</td></tr>`).join("")}</table>
      <p class="small">GPA: <b>${A.gpa(rs).toFixed(2)}</b> · Issued ${A.fmtDate("2026-10-29")} · Verify at sis.example/verify · Code RQ-1042-7F3K</p></div>`;
  }

  /* ---------------- profile (REG-06) ---------------- */
  A.route("s-profile", {
    roles: ["student"], title: "My profile", nav: "Profile", group: "Student services",
    desc: "Keep your contact details up to date. Changes to your name, NIC or programme are made by the Faculty Office.",
    req: ["REG-06", "REG-14"],
    render(el) {
      const me = S().me;
      el.innerHTML = `<div class="grid g2"><section class="card"><header><h2>Academic record</h2></header><dl class="kv">
          <dt>Name</dt><dd>${esc(me.name)}</dd><dt>Gender</dt><dd>${esc(me.gender)}</dd><dt>Registration No.</dt><dd class="mono">${esc(me.regNo)}</dd><dt>Index No.</dt><dd class="mono">${esc(me.indexNo)}</dd>
          <dt>Programme</dt><dd>${esc(me.programmeLabel)}<div class="tiny muted">${esc(me.combinationLabel)}</div></dd><dt>Intake / edition</dt><dd>${esc(me.intake)} · handbook ${esc(me.edition)}</dd>
          <dt>Registered on</dt><dd>${A.fmtDate(me.regDate)}</dd><dt>Degree valid until</dt><dd>${A.fmtDate(me.validUntil)}</dd><dt>Valid academic year</dt><dd>2026/27</dd><dt>Academic advisor</dt><dd>${esc(me.advisor)}</dd>
          <dt>GCE A/L</dt><dd>${me.alResults.map(([s, g]) => `${esc(s)} ${g}`).join(" · ")} <span class="muted">(Z ${me.zScore})</span></dd><dt>Safety module</dt><dd>${me.safetyModule ? A.pill("Passed for 2026/27", "ok") : A.pill("Not done: labs blocked", "bad")}</dd></dl></section>
        <section class="card"><header><h2>Contact details</h2></header><form id="pf" class="stack">
          <div class="formgrid"><label class="field"><span>Mobile</span><input name="mobile" value="${esc(me.mobile)}" autocomplete="tel"></label><label class="field"><span>Land line</span><input name="land" value="${esc(me.land)}"></label>
          <label class="field"><span>Personal email</span><input name="personalEmail" type="email" value="${esc(me.personalEmail)}" autocomplete="email"></label><label class="field"><span>KLN email</span><input value="${esc(me.uniEmail)}" disabled></label></div>
          <label class="field"><span>Address</span><input name="address" value="${esc(me.address)}" autocomplete="street-address"></label>
          <div class="row"><button class="btn primary" type="submit">Save changes</button><span class="tiny muted">Changes are recorded in the audit log.</span></div></form></section></div>`;
      A.$("#pf").addEventListener("submit", (e) => { e.preventDefault(); const f = new FormData(e.target); ["mobile", "land", "personalEmail", "address"].forEach((k) => (me[k] = f.get(k))); A.audit("Profile updated", "Contact details"); A.save(); A.toast("Contact details saved"); });
    },
  });

  A.nav("student", [
    { title: "Student portal", items: ["s-home", "s-reg", "s-results", "s-audit", "s-sel", "s-adm"] },
    { title: "Student services", items: ["s-req", "s-profile"] },
  ]);
})(window.App);
