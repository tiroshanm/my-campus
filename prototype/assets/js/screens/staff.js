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
      if (editable) actions.push(`<label class="btn" for="xlsx-up" title="Upload the completed Excel mark sheet">Upload marks (Excel)<input type="file" id="xlsx-up" accept=".xlsx,.xls,.csv" hidden></label>`);
      if (canFirst) actions.push(`<button class="btn" type="button" data-act="demo">Fill sample marks (demo)</button><button class="btn" type="button" data-act="save">Save draft</button><button class="btn primary" type="button" data-act="submit1">Submit to 2nd examiner</button>`);
      if (canSecond) actions.push(`<button class="btn" type="button" data-act="return1">Return to 1st examiner</button><button class="btn primary" type="button" data-act="verify">Verify marks</button>`);
      if (role === "hod" && sh.state === "SecondVerified") actions.push(`<button class="btn" type="button" data-act="return1">Return</button><button class="btn primary" type="button" data-act="recommend">Recommend for approval</button>`);
      if (role === "dean" && sh.state === "HoDRecommended") actions.push(`<button class="btn" type="button" data-act="returnHod">Return to HoD</button><button class="btn primary" type="button" data-act="approve">Approve</button>`);
      if ((role === "dean" || role === "exam") && sh.state === "DeanApproved") actions.push(`<button class="btn primary" type="button" data-act="release">Release results to students</button>`);
      A.setActions(`<button class="btn" type="button" data-act="xlsx" title="${editable ? "Excel template with the class list, to enter marks offline" : "Excel copy of this result sheet"}">${editable ? "Download Excel template" : "Download Excel"}</button><button class="btn" type="button" data-act="print">Print mark sheet</button>${actions.join("")}`, (a) => {
        A.$$("[data-act]", a).forEach((b) => b.onclick = () => act(b.dataset.act, sh));
        const up = A.$("#xlsx-up", a);
        if (up) up.onchange = () => { const f = up.files[0]; up.value = ""; if (f) uploadMarks(sh, f); };
      });
      el.innerHTML = `<section class="card"><header><h2>${esc(sh.code)} · ${esc(info.title)}</h2><div class="sp">${A.pill(FLOW_LABEL[sh.state], stateKind(sh.state))}${overdue(sh) ? A.pill("Overdue", "bad") : ""}</div></header>
          ${A.steps(["1st examiner", "2nd examiner", "Head of Department", "Dean", "Released"], Math.min(FLOW.indexOf(sh.state), 4) + (sh.state === "Released" ? 1 : 0))}
          <dl class="kv"><dt>Session</dt><dd>${esc(sh.session)} · exam held ${A.fmtDate(sh.examDate)}</dd><dt>Department</dt><dd>${esc(sh.deptName)}</dd><dt>Examiners</dt><dd>1st: ${esc(sh.first)} · 2nd: ${esc(sh.second)}</dd><dt>Due</dt><dd>${A.fmtDate(sh.due)}</dd>
          <dt>Mark criteria</dt><dd>${editable && canFirst ? `CA <input class="search" style="width:64px" type="number" id="w-ca" value="${sh.scheme.ca}" aria-label="CA weight">% · Practical <input class="search" style="width:64px" type="number" id="w-pr" value="${sh.scheme.pr}" aria-label="Practical weight">% · Final exam <input class="search" style="width:64px" type="number" id="w-fe" value="${sh.scheme.fe}" aria-label="Final exam weight">%` : `CA ${sh.scheme.ca}% · Practical ${sh.scheme.pr}% · Final exam ${sh.scheme.fe}%`}</dd></dl>
          <div class="row small">${A.GRADES.map((g) => `<span class="pill">${g[1]}: ${dist[g[1]] || 0}</span>`).join("")}<span class="muted">${filled}/${rows.length} graded</span></div>
        </section>
        ${editable ? `<section class="card xl-card"><header><h2>Enter marks with Excel</h2><div class="sp small muted">Or type them directly in the table below</div></header>
          <ol class="xl-steps">
            <li><b>Download the template.</b> It lists all ${sh.roster.length} students with the mark weights${filled ? ` and the ${filled} marks already entered` : ""}.<div><button class="btn primary" type="button" id="xl-dl">Download Excel template</button></div></li>
            <li><b>Enter marks in Excel.</b> Fill CA, Practical and Final exam out of 100 (columns F–H). Type <b>Y</b> under Absent for absent students. Totals and provisional grades update as you type. Save as .xlsx.</li>
            <li><b>Upload the completed file.</b> You see a preview with any problems before marks are applied.<div><label class="btn" for="xl-up">Upload completed Excel<input type="file" id="xl-up" accept=".xlsx,.xls,.csv" hidden></label></div></li>
          </ol></section>` : ""}
        <section class="card flush"><header><h2>Marks</h2><div class="sp small muted">Grades include the lab-attendance cap (§1.8) and the repeat cap at C (§2.3).</div></header>
        ${A.table([{ label: "#", num: true, render: (r) => r.i + 1 }, { label: "Reg. No.", code: true, key: "regNo" }, { label: "Name", render: (r) => esc(r.name) + (r.repeat ? ` ${A.pill("Repeat", "warn")}` : "") },
          { label: "Lab att.", num: true, render: (r) => `${r.labPct}%` }, { label: "Absent", render: (r) => editable ? `<input type="checkbox" data-i="${r.i}" data-k="absent" ${r.absent ? "checked" : ""} aria-label="Absent ${esc(r.regNo)}">` : r.absent ? "AB" : "" },
          { label: `CA ${sh.scheme.ca}%`, num: true, render: (r) => num(r, "ca") }, { label: `Prac ${sh.scheme.pr}%`, num: true, render: (r) => num(r, "pr") }, { label: `Final ${sh.scheme.fe}%`, num: true, render: (r) => num(r, "fe") },
          { label: "Total", num: true, render: (r) => r.c.total ?? "" }, { label: "Grade", render: (r) => r.c.final ? A.pill(r.c.final, A.atLeast(r.c.final, "C") ? "ok" : A.atLeast(r.c.final, "D") ? "warn" : "bad") : "" }, { label: "Note", render: (r) => `<span class="tiny muted">${esc(r.c.note)}</span>` }], rows)}</section>
        <section class="card"><header><h2>History</h2></header>${A.table([{ label: "When", render: (h) => A.fmtDT(h.at) }, { label: "Who", key: "who" }, { label: "What", key: "what" }], sh.history.slice().reverse())}</section>`;
      if (editable) {
        A.$("#xl-dl").onclick = () => downloadMarks(sh);
        const xu = A.$("#xl-up"); xu.onchange = () => { const f = xu.files[0]; xu.value = ""; if (f) uploadMarks(sh, f); };
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
    if (a === "xlsx") return downloadMarks(sh);
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
  /* ---------- Excel mark sheets (EXM-13, EXM-18) ----------
     Layout of the "Marks" sheet (row numbers are 1-based):
       A4 "Sheet ID" / B4 sheet id   ·  B5..B7 weights (CA, Practical, Final %)
       row 10 = headers, data from row 11:  A No · B Reg. No. · C Name · D Repeat · E Lab att. % · F CA · G Practical · H Final · I Absent (Y) · J Total · K Provisional grade
     Totals and grades are Excel formulas so examiners see them while typing; the system recalculates with the
     repeat and lab-attendance caps when the file is uploaded. */
  const XL = { first: 11, head: 10 };
  const GRADE_LOOKUP = 'LOOKUP(J{r},{0,25,30,35,40,45,50,55,60,65,70,85},{"E","D","D+","C-","C","C+","B-","B","B+","A-","A","A+"})';
  function marksWorkbook(sh) {
    const X = window.XLSX, info = A.unitInfo(sh.code);
    const rows = [
      ["University of Kelaniya · Faculty of Science · Result sheet"],
      ["Course unit", `${sh.code} · ${info.title}`],
      ["Session", `${sh.session} (exam held ${sh.examDate})`],
      ["Sheet ID", sh.id, "Do not change this cell: it links the file to the right result sheet."],
      ["CA weight %", sh.scheme.ca],
      ["Practical weight %", sh.scheme.pr],
      ["Final exam weight %", sh.scheme.fe],
      ["How to fill", "Enter marks out of 100 in columns F, G and H. Type Y in column I for absent students. Do not change columns A to E."],
      [],
      ["No", "Reg. No.", "Name", "Repeat", "Lab attendance %", "CA (/100)", "Practical (/100)", "Final exam (/100)", "Absent (Y)", "Total", "Provisional grade"],
    ];
    sh.roster.forEach((s, i) => { const m = sh.marks[i] || {}; rows.push([i + 1, s.regNo, s.name, s.repeat ? "Yes" : "", s.labPct, m.absent ? null : m.ca ?? null, m.absent ? null : m.pr ?? null, m.absent ? null : m.fe ?? null, m.absent ? "Y" : ""]); });
    const ws = X.utils.aoa_to_sheet(rows);
    sh.roster.forEach((_, i) => {
      // formulas keep working while examiners type; cached values let previewers that don't calculate still show them
      const r = XL.first + i, m = sh.marks[i] || {}, w = sh.scheme;
      const done = !m.absent && [m.ca, m.pr, m.fe].every((v) => v != null && v !== "");
      const total = m.absent ? "AB" : done ? Math.round((m.ca * w.ca + m.pr * w.pr + m.fe * w.fe) / 100) : "";
      const grade = m.absent ? "AB" : done ? A.gradeOf(total) : "";
      ws["J" + r] = { t: typeof total === "number" ? "n" : "s", v: total, f: `IF(UPPER(I${r})="Y","AB",IF(COUNT(F${r}:H${r})<3,"",ROUND(F${r}*$B$5/100+G${r}*$B$6/100+H${r}*$B$7/100,0)))` };
      ws["K" + r] = { t: "s", v: grade, f: `IF(J${r}="AB","AB",IF(J${r}="","",${GRADE_LOOKUP.replace("{r}", r)}))` };
    });
    ws["!ref"] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: XL.first - 1 + sh.roster.length - 1, c: 10 } });
    ws["!cols"] = [{ wch: 19 }, { wch: 15 }, { wch: 26 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 11 }, { wch: 8 }, { wch: 17 }];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 7, c: 1 }, e: { r: 7, c: 10 } }];
    const notes = X.utils.aoa_to_sheet([
      ["Instructions"], [],
      ["1", "Fill in columns F (CA), G (Practical) and H (Final exam) with marks out of 100. Leave a cell empty if the mark is not available yet."],
      ["2", "Type Y in column I for a student who was absent. Leave F to H empty for that student."],
      ["3", "Columns J and K show a provisional total and grade. The system recalculates them on upload and applies the repeat cap (C) and the lab-attendance caps."],
      ["4", "Do not add, remove or reorder students, and do not change the Sheet ID. Students are matched by registration number."],
      ["5", "Save as .xlsx and upload it on the result sheet with 'Upload marks (Excel)'. You will see a preview before anything is changed."],
    ]);
    notes["!cols"] = [{ wch: 4 }, { wch: 120 }];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Marks");
    X.utils.book_append_sheet(wb, notes, "Instructions");
    wb.Props = { Title: `${sh.code} result sheet`, Subject: sh.session, Author: "FoS SIS prototype" };
    return wb;
  }
  function downloadMarks(sh) {
    if (!window.XLSX) return A.toast("The Excel library did not load. Check your connection and reload the page.");
    window.XLSX.writeFile(marksWorkbook(sh), `${sh.code.replace(" ", "")}_${sh.ay.replace("/", "-")}_S${sh.sem}_marks.xlsx`, { compression: true });
    sh.history.push({ at: new Date().toISOString(), who: A.currentUser().name, what: "Excel mark sheet downloaded" }); A.save();
  }

  /* Read an uploaded workbook (or CSV) into validated updates. Pure function: no state is changed here. */
  function parseMarks(sh, wb) {
    const X = window.XLSX, ws = wb.Sheets.Marks || wb.Sheets[wb.SheetNames[0]];
    const grid = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
    const res = { updates: [], issues: [], read: 0, absent: 0, partial: 0, blank: 0, sheetId: null, wrongSheet: false, missing: [] };
    const idRow = grid.find((r) => String(r[0] || "").trim().toLowerCase() === "sheet id");
    res.sheetId = idRow ? String(idRow[1] || "").trim() : null;
    if (res.sheetId && res.sheetId !== sh.id) res.wrongSheet = true;
    let h = grid.findIndex((r) => r.some((c) => /^reg\.?\s*no\.?$/i.test(String(c || "").trim()) || /^regno$/i.test(String(c || "").trim())));
    if (h < 0) { res.issues.push({ row: "-", reg: "", msg: "No 'Reg. No.' column found. Use the downloaded template." }); return res; }
    const head = grid[h].map((c) => String(c || "").toLowerCase());
    const col = (re, dflt) => { const i = head.findIndex((c) => re.test(c)); return i >= 0 ? i : dflt; };
    const cReg = col(/^reg/), cCA = col(/^ca/, 5), cPR = col(/^prac/, 6), cFE = col(/^final/, 7), cAB = col(/^absent/, 8);
    const seen = new Set();
    for (let k = h + 1; k < grid.length; k++) {
      const r = grid[k], rowNo = k + 1, reg = String(r[cReg] ?? "").trim();
      if (!reg) continue;
      res.read++;
      const i = sh.roster.findIndex((s) => s.regNo === reg);
      if (i < 0) { res.issues.push({ row: rowNo, reg, msg: "Registration number is not in this result sheet" }); continue; }
      if (seen.has(reg)) { res.issues.push({ row: rowNo, reg, msg: "Appears more than once" }); continue; }
      seen.add(reg);
      if (/^y(es)?$/i.test(String(r[cAB] ?? "").trim()) || /^ab$/i.test(String(r[cFE] ?? "").trim())) { res.updates.push({ i, mark: { absent: true } }); res.absent++; continue; }
      const val = (v, label) => {
        if (v === null || v === undefined || String(v).trim() === "") return { ok: true, v: null };
        const n = typeof v === "number" ? v : Number(String(v).trim());
        if (!isFinite(n) || n < 0 || n > 100) return { ok: false, msg: `${label} "${v}" is not a mark between 0 and 100` };
        return { ok: true, v: Math.round(n * 10) / 10 };
      };
      const ca = val(r[cCA], "CA"), pr = val(r[cPR], "Practical"), fe = val(r[cFE], "Final exam");
      const bad = [ca, pr, fe].filter((x) => !x.ok);
      if (bad.length) { res.issues.push({ row: rowNo, reg, msg: bad.map((b) => b.msg).join("; ") }); continue; }
      if ([ca, pr, fe].every((x) => x.v === null)) { res.blank++; continue; } // empty row: keep whatever is already entered
      if ([ca, pr, fe].some((x) => x.v === null)) res.partial++;
      res.updates.push({ i, mark: { ca: ca.v, pr: pr.v, fe: fe.v } });
    }
    res.missing = sh.roster.filter((s) => !seen.has(s.regNo)).map((s) => s.regNo);
    return res;
  }
  A._marksExcel = { marksWorkbook, parseMarks }; // exposed for tests

  function uploadMarks(sh, file) {
    if (!window.XLSX) return A.toast("The Excel library did not load. Check your connection and reload the page.");
    if (file.size > 5 * 1024 * 1024) return A.toast("That file is larger than 5 MB. Upload the mark sheet only.");
    const rd = new FileReader();
    rd.onerror = () => A.toast("The file could not be read.");
    rd.onload = () => {
      let wb; try { wb = window.XLSX.read(new Uint8Array(rd.result), { type: "array" }); } catch (e) { return A.toast("This file is not a readable Excel or CSV file."); }
      const res = parseMarks(sh, wb); const ok = res.updates.length;
      const changed = res.updates.filter((u) => JSON.stringify(sh.marks[u.i] || {}) !== JSON.stringify(u.mark)).length;
      A.modal({
        title: `Upload marks · ${file.name}`, wide: true,
        body: `${res.wrongSheet ? A.alert("bad", `<b>This file belongs to a different result sheet</b> (Sheet ID ${esc(res.sheetId)}, expected ${esc(sh.id)}). Download the template for ${esc(sh.code)} and try again.`) : ""}
          <div class="grid g4">${A.stat(res.read, "Rows read")}${A.stat(ok, "Valid rows", `${changed} change existing marks`)}${A.stat(res.absent, "Marked absent")}${A.stat(res.issues.length, "Rows with problems", res.issues.length ? "skipped" : "")}</div>
          ${res.partial ? A.alert("warn", `${res.partial} students have some marks missing. They stay ungraded until all three marks are entered.`) : ""}
          ${res.blank ? A.alert("info", `${res.blank} rows have no marks in the file. Those students keep the marks already entered in the system.`) : ""}
          ${res.missing.length ? A.alert("warn", `${res.missing.length} students in this sheet are not in the file and will keep their current marks: ${esc(res.missing.slice(0, 8).join(", "))}${res.missing.length > 8 ? " …" : ""}`) : ""}
          ${res.issues.length ? A.table([{ label: "Row", num: true, key: "row" }, { label: "Reg. No.", code: true, key: "reg" }, { label: "Problem", key: "msg" }], res.issues.slice(0, 20)) : A.alert("ok", "No problems found.")}
          <p class="small muted" style="margin:0">Grades are recalculated by the system with the repeat cap (C) and lab-attendance caps after upload.</p>`,
        actions: [{ label: "Cancel" }, { label: ok ? `Apply ${ok} valid row${ok > 1 ? "s" : ""}` : "Nothing to apply", kind: "primary", onClick: () => {
          if (res.wrongSheet || !ok) return false;
          res.updates.forEach((u) => { sh.marks[u.i] = u.mark; });
          sh.history.push({ at: new Date().toISOString(), who: A.currentUser().name, what: `Marks uploaded from Excel: ${file.name} (${ok} rows${res.issues.length ? `, ${res.issues.length} skipped` : ""})` });
          A.audit("Marks uploaded from Excel", `${sh.code}: ${ok} rows`); A.save(); A.rerender(); A.toast(`${ok} rows applied from ${file.name}.`);
        } }],
      });
    };
    rd.readAsArrayBuffer(file);
  }
  A.openSheet = (id) => { ui().sheet = id; A.save(); if (A.current() === "sheet") A.rerender(); else A.go("sheet"); };

  const sheetCols = (extra = []) => [{ label: "Code", code: true, key: "code" }, { label: "Course unit", render: (s) => esc(A.unitInfo(s.code).title) }, { label: "Department", render: (s) => `<span class="small">${esc(s.deptName.replace("Department of ", ""))}</span>` },
    { label: "Status", render: (s) => A.pill(FLOW_LABEL[s.state], stateKind(s.state)) + (overdue(s) ? " " + A.pill("Overdue", "bad") : "") }, { label: "Due", render: (s) => A.fmtDate(s.due) }].concat(extra, [{ label: "", render: (s) => `<button class="btn sm" type="button" data-sheet="${s.id}">Open</button>` }]);
  const bindOpen = (el) => {
    A.$$("[data-sheet]", el).forEach((b) => b.onclick = () => A.openSheet(b.dataset.sheet));
    A.$$("[data-xl]", el).forEach((b) => b.onclick = () => downloadMarks(S().sheets.find((s) => s.id === b.dataset.xl)));
  };
  // examiner lists: a direct "Excel template" download next to Open for sheets the lecturer still has to mark
  const xlCol = { label: "Excel", render: (s) => (s.mine === "lecturer-first" && s.state === "Draft") || (s.mine === "lecturer-second" && s.state === "FirstEntered") ? `<button class="btn sm" type="button" data-xl="${s.id}">Excel template</button>` : `<button class="btn sm ghost" type="button" data-xl="${s.id}">Excel</button>` };

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
        <section class="card flush"><header><h2>Examiner duties · 2025/26 Semester II</h2></header>${A.table(sheetCols([{ label: "My role", render: (s) => s.mine === "lecturer-first" ? "1st examiner" : "2nd examiner" }, xlCol]), mine)}</section>`;
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
    render(el) { el.innerHTML = `<section class="card flush"><header><h2>My result sheets</h2></header>${A.table(sheetCols([{ label: "My role", render: (s) => s.mine === "lecturer-first" ? "1st examiner" : "2nd examiner" }, xlCol]), S().sheets.filter((s) => s.mine))}</section>`; bindOpen(el); },
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
