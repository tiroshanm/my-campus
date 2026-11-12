/* Core runtime for the SIS prototype: state, routing, helpers, academic rules, charts, feedback.
   Classic script (no modules) so the prototype also works when opened straight from disk. */
window.App = (function () {
  "use strict";
  const A = {};

  /* ---------- small helpers ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.esc = esc;
  A.$ = (sel, root) => (root || document).querySelector(sel);
  A.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  A.on = (root, sel, ev, fn) => A.$$(sel, root).forEach((el) => el.addEventListener(ev, (e) => fn(e, el)));
  A.fmtDate = (d) => { if (!d) return "—"; const x = new Date(d + (d.length === 10 ? "T00:00:00" : "")); return x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
  A.fmtDT = (d) => { const x = new Date(d); return x.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + x.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
  A.money = (n) => "LKR " + Number(n).toLocaleString("en-LK");
  A.uid = () => Math.random().toString(36).slice(2, 9);
  A.TODAY = "2026-11-12"; // fixed "today" so the demo always shows the same situation

  /* ---------- persisted demo state ---------- */
  const KEY = "fos-sis-proto-state-v1";
  let state = null;
  A.state = () => state;
  A.save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  A.load = (seedFn) => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.version === 1) { state = s; return; } } catch (e) {}
    state = seedFn(); A.save();
  };
  A.reset = (seedFn) => { try { localStorage.removeItem(KEY); } catch (e) {} state = seedFn(); A.save(); };
  A.audit = (action, detail) => { state.audit.unshift({ at: new Date().toISOString(), by: A.currentUser().name, role: A.role().label, action, detail }); };

  /* ---------- roles ---------- */
  A.ROLES = {
    student: { label: "Student", user: "student" },
    lecturer: { label: "Lecturer / Examiner", user: "lecturer" },
    hod: { label: "Head of Department", user: "hod" },
    dean: { label: "Dean", user: "dean" },
    exam: { label: "Faculty Office / Exam Branch", user: "exam" },
    coord: { label: "Programme Coordinator", user: "coord" },
    admin: { label: "System Administrator", user: "admin" },
  };
  A.role = () => Object.assign({ id: state.role }, A.ROLES[state.role]);
  A.currentUser = () => state.users[A.ROLES[state.role].user];

  /* ---------- routing ---------- */
  const routes = {}; const nav = {};
  A.route = (id, def) => { routes[id] = Object.assign({ id }, def); };
  A.nav = (role, groups) => { nav[role] = groups; };
  A.go = (id) => { if (location.hash !== "#" + id) location.hash = id; else render(); };
  A.current = () => (location.hash || "").slice(1);

  function allowed(id) { const r = routes[id]; return r && (!r.roles || r.roles.includes(state.role)); }
  function firstRoute() { return nav[state.role][0].items[0]; }

  function render() {
    let id = A.current();
    if (!allowed(id)) { id = firstRoute(); history.replaceState(null, "", "#" + id); }
    const r = routes[id];
    renderShell(id);
    const main = A.$("#main");
    const ctx = { id, params: {} };
    main.innerHTML = `<div class="page">${pageHead(r)}<div id="view"></div></div>`;
    const view = A.$("#view");
    try { r.render(view, ctx); } catch (e) { console.error(e); view.innerHTML = `<div class="alert bad"><b>Screen error.</b> ${esc(e.message)}</div>`; }
    document.title = `${r.title} · FoS SIS prototype`;
    A.$("#main").focus({ preventScroll: true });
    window.scrollTo(0, 0);
    A.Feedback.refresh(r);
  }
  A.render = render;
  A.rerender = () => { const r = routes[A.current()]; const view = A.$("#view"); if (r && view) r.render(view, { id: r.id }); A.renderNavCounts(); };

  function pageHead(r) {
    return `<header class="pagehead"><div><div class="crumb">${esc(r.group || "")}</div><h1>${esc(r.title)}</h1>${r.desc ? `<p>${r.desc}</p>` : ""}
      ${r.req && r.req.length ? `<div class="reqs" title="Requirements this screen demonstrates">${r.req.map((x) => `<span class="req">${esc(x)}</span>`).join("")}</div>` : ""}</div>
      <div class="actions" id="page-actions"></div></header>`;
  }

  function renderShell(active) {
    const groups = nav[state.role];
    A.$("#nav-groups").innerHTML = groups.map((g) => `<div class="navgroup"><h4>${esc(g.title)}</h4>${g.items.map((id) => {
      const r = routes[id]; return `<a href="#${id}" data-route="${id}" ${id === active ? 'aria-current="page"' : ""}>${esc(r.nav || r.title)}<span class="count" data-count="${id}" hidden></span></a>`;
    }).join("")}</div>`).join("");
    const u = A.currentUser();
    A.$("#who-name").textContent = u.name;
    A.$("#who-sub").textContent = u.sub;
    A.$("#avatar").textContent = u.name.replace(/^(Dr|Prof|Mr|Ms)\.?\s+/i, "").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
    A.$("#role-select").value = state.role;
    A.renderNavCounts();
  }
  A.renderNavCounts = () => {
    A.$$("[data-count]").forEach((el) => { const r = routes[el.dataset.count]; const n = r && r.count ? r.count() : 0; el.hidden = !n; el.textContent = n; });
  };
  A.setActions = (html, bind) => { const a = A.$("#page-actions"); if (!a) return; a.innerHTML = html; if (bind) bind(a); };

  /* ---------- UI components ---------- */
  A.pill = (text, kind) => `<span class="pill ${kind || ""}">${esc(text)}</span>`;
  A.st = (s) => `<span class="st ${s}" title="${({ C: "Compulsory", O: "Optional", A: "Auxiliary" })[s] || ""}">${s}</span>`;
  A.table = (cols, rows, opts = {}) => {
    const head = cols.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("");
    const body = rows.length ? rows.map((r, i) => {
      if (r.__sub) return `<tr class="sub"><td colspan="${cols.length}">${esc(r.__sub)}</td></tr>`;
      return `<tr class="${opts.rowClass ? opts.rowClass(r, i) : ""}">${cols.map((c) => `<td class="${c.num ? "num" : ""} ${c.code ? "code" : ""}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join("")}</tr>`;
    }).join("") : `<tr><td colspan="${cols.length}" class="muted">${esc(opts.empty || "Nothing to show.")}</td></tr>`;
    return `<div class="tw"><table class="t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  };
  A.stat = (value, label, note) => `<div class="card stat"><b>${value}</b><span>${label}</span>${note ? `<em>${note}</em>` : ""}</div>`;
  A.alert = (kind, html) => `<div class="alert ${kind}"><div class="grow">${html}</div></div>`;
  A.steps = (labels, current) => `<ol class="steps">${labels.map((l, i) => `<li class="${i < current ? "done" : i === current ? "now" : ""}">${esc(l)}</li>`).join("")}</ol>`;
  A.tabs = (id, items, active) => `<div class="tabs" role="tablist" id="${id}">${items.map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === active}">${esc(l)}</button>`).join("")}</div>`;

  A.toast = (msg) => {
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    A.$("#toasts").appendChild(t); setTimeout(() => t.remove(), 3600);
  };
  A.modal = ({ title, body, actions = [], wide }) => {
    const bg = document.createElement("div"); bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${wide ? "max-width:900px" : ""}"><header><h2>${esc(title)}</h2><button class="btn ghost sm x" type="button" data-x>Close</button></header>
      <div class="body">${body}</div>${actions.length ? `<footer>${actions.map((a, i) => `<button class="btn ${a.kind || ""}" type="button" data-a="${i}">${esc(a.label)}</button>`).join("")}</footer>` : ""}</div>`;
    const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); if (last) last.focus(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const last = document.activeElement;
    document.body.appendChild(bg); document.addEventListener("keydown", onKey);
    bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
    A.$("[data-x]", bg).addEventListener("click", close);
    A.$$("[data-a]", bg).forEach((b) => b.addEventListener("click", () => { const a = actions[+b.dataset.a]; if (!a.onClick || a.onClick(bg) !== false) close(); }));
    const f = A.$("input,select,textarea,button.primary", bg) || A.$("[data-x]", bg); f.focus();
    return bg;
  };
  A.confirm = (title, text, label, fn, kind) => A.modal({ title, body: `<p>${text}</p>`, actions: [{ label: "Cancel" }, { label, kind: kind || "primary", onClick: fn }] });

  A.download = (name, text, type) => {
    const blob = new Blob([text], { type: type || "text/plain" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  A.toCSV = (cols, rows) => {
    const q = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.map((c) => q(c.label)).join(",")].concat(rows.filter((r) => !r.__sub).map((r) => cols.map((c) => q(c.csv ? c.csv(r) : r[c.key])).join(","))).join("\n");
  };
  A.payment = (item, amount, onPaid) => A.modal({
    title: "Online payment (simulated)",
    body: `<div class="alert info"><div class="grow">In the real system this hands over to the University's payment gateway. Nothing is charged in the prototype.</div></div>
      <dl class="kv"><dt>Item</dt><dd>${esc(item)}</dd><dt>Amount</dt><dd><b>${A.money(amount)}</b></dd><dt>Reference</dt><dd class="mono">PAY-${A.uid().toUpperCase()}</dd></dl>
      <div class="formgrid"><label class="field"><span>Card number</span><input value="4111 1111 1111 1111" inputmode="numeric" aria-label="Card number"></label><label class="field"><span>Expiry</span><input value="12/29" aria-label="Expiry"></label></div>`,
    actions: [{ label: "Cancel" }, { label: `Pay ${A.money(amount)}`, kind: "primary", onClick: () => { onPaid(); A.toast("Payment received. Receipt sent to your email."); } }],
  });

  /* ---------- academic rules (handbook 2023/24) ---------- */
  const GRADES = [[85, "A+", 4.0], [70, "A", 4.0], [65, "A-", 3.7], [60, "B+", 3.3], [55, "B", 3.0], [50, "B-", 2.7], [45, "C+", 2.3], [40, "C", 2.0], [35, "C-", 1.7], [30, "D+", 1.3], [25, "D", 1.0], [0, "E", 0.0]];
  A.GRADES = GRADES;
  A.gradeOf = (mark) => { if (mark == null || mark === "" || isNaN(mark)) return null; const g = GRADES.find((x) => mark >= x[0]); return g[1]; };
  A.gp = (g) => { const x = GRADES.find((y) => y[1] === g); return x ? x[2] : 0; };
  A.atLeast = (g, min) => A.gp(g) >= A.gp(min);
  A.unitInfo = (code) => {
    const k = code.replace(" ", ""); const u = window.CATALOG.UNITS[k] || A.EXTRA_UNITS[k];
    return { code, title: u ? u[0] : "Title not listed in handbook", level: +code[5], sem: +code[6], credits: +code[9] };
  };
  A.EXTRA_UNITS = {}; // other-faculty units added by mock data
  A.NONGPA = new Set(["ACLT 11013", "ACLT 12022", "ACLT 21032", "MGMT 11022", "CHEM 11601", "GNCT 13212", "GNCT 23212", "BIOC 44761", "CHEM 44811"]);
  A.isGPA = (code) => !A.NONGPA.has(code) && !code.startsWith("CMSK");
  /* Repeat rule (§2.3): best obtainable on a re-sit is C; a lower re-sit grade never replaces the earlier grade. */
  A.repeatGrade = (prev, fresh) => { const capped = A.gp(fresh) > A.gp("C") ? "C" : fresh; return A.gp(capped) >= A.gp(prev) ? capped : prev; };
  /* Lab attendance cap (§1.8): 50–79% -> best C, <50% -> best D */
  A.labCap = (grade, pct) => { if (pct == null) return grade; const cap = pct < 50 ? "D" : pct < 80 ? "C" : null; return cap && A.gp(grade) > A.gp(cap) ? cap : grade; };
  A.gpa = (results) => {
    let cr = 0, pts = 0;
    results.forEach((r) => { if (!r.grade || !A.isGPA(r.code)) return; const c = A.unitInfo(r.code).credits; cr += c; pts += c * A.gp(r.grade); });
    return cr ? Math.round((pts / cr) * 100) / 100 : 0;
  };
  A.classFor = (gpa) => gpa >= 3.7 ? "First Class" : gpa >= 3.3 ? "Second Class (Upper)" : gpa >= 3.0 ? "Second Class (Lower)" : gpa >= 2.0 ? "Pass" : "Not eligible";

  /* ---------- charts (inline SVG, drawn to scale) ---------- */
  A.barChart = (data, { h = 220, color = "var(--accent)", max, fmt = (v) => v, labelEvery = 1 } = {}) => {
    const w = 640, pad = { l: 40, r: 10, t: 12, b: 32 }; const m = max || Math.max(...data.map((d) => d.v)) * 1.1 || 1;
    const nice = niceMax(m); const bw = (w - pad.l - pad.r) / data.length;
    const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / nice);
    let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">`;
    for (let i = 0; i <= 4; i++) { const v = (nice / 4) * i; s += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v * 10) / 10)}</text>`; }
    data.forEach((d, i) => { const x = pad.l + i * bw + bw * 0.15, bh = h - pad.b - y(d.v);
      s += `<rect x="${x}" y="${y(d.v)}" width="${bw * 0.7}" height="${Math.max(0, bh)}" rx="2" fill="${d.color || color}"><title>${esc(d.k)}: ${fmt(d.v)}</title></rect>`;
      if (i % labelEvery === 0) s += `<text x="${x + bw * 0.35}" y="${h - pad.b + 16}" text-anchor="middle">${esc(d.k)}</text>`; });
    return s + `<line class="axis" x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}"/></svg>`;
  };
  A.lineChart = (series, labels, { h = 230, min = 0, max, fmt = (v) => v, dashedFrom } = {}) => {
    const w = 640, pad = { l: 44, r: 12, t: 12, b: 32 }; const all = series.flatMap((s) => s.values.filter((v) => v != null));
    const hi = niceMax(max || Math.max(...all) * 1.08), lo = min;
    const x = (i) => pad.l + (w - pad.l - pad.r) * (i / (labels.length - 1)); const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
    let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">`;
    for (let i = 0; i <= 4; i++) { const v = lo + ((hi - lo) / 4) * i; s += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v * 100) / 100)}</text>`; }
    labels.forEach((l, i) => { s += `<text x="${x(i)}" y="${h - pad.b + 16}" text-anchor="middle">${esc(l)}</text>`; });
    if (dashedFrom != null) s += `<rect x="${x(dashedFrom)}" y="${pad.t}" width="${w - pad.r - x(dashedFrom)}" height="${h - pad.t - pad.b}" fill="var(--sunk)" opacity=".6"/><text x="${x(dashedFrom) + 6}" y="${pad.t + 12}">forecast</text>`;
    series.forEach((se) => {
      const pts = se.values.map((v, i) => v == null ? null : [x(i), y(v)]);
      const solid = pts.filter((p, i) => p && (dashedFrom == null || i <= dashedFrom)); const dash = pts.filter((p, i) => p && dashedFrom != null && i >= dashedFrom);
      if (solid.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.2" points="${solid.map((p) => p.join(",")).join(" ")}"/>`;
      if (dash.length > 1) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.2" stroke-dasharray="5 5" points="${dash.map((p) => p.join(",")).join(" ")}"/>`;
      pts.forEach((p, i) => { if (p) s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${se.color}"><title>${esc(se.name)} ${esc(labels[i])}: ${fmt(se.values[i])}</title></circle>`; });
    });
    return s + `<line class="axis" x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}"/></svg>`;
  };
  A.legend = (items) => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join("")}</div>`;
  function niceMax(m) { if (m <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

  /* ---------- feedback: saved in this browser, sent to the team's Google Sheet when configured ---------- */
  A.Feedback = (function () {
    const FK = "fos-sis-proto-feedback-v1"; let cur = null; let syncing = false; let lastError = "";
    const CFG = window.SIS_PROTO_CONFIG || {};
    const endpoint = () => (CFG.feedbackEndpoint || "").trim();
    const all = () => { try { return JSON.parse(localStorage.getItem(FK) || "[]"); } catch (e) { return []; } };
    const put = (list) => { try { localStorage.setItem(FK, JSON.stringify(list)); } catch (e) {} };
    const session = (() => { try { let s = sessionStorage.getItem(FK + "-session"); if (!s) { s = "S-" + Date.now().toString(36).toUpperCase(); sessionStorage.setItem(FK + "-session", s); } return s; } catch (e) { return "S-unknown"; } })();
    // give older items an id so they can be sent and de-duplicated
    (function migrate() { const l = all(); let ch = false; l.forEach((x) => { if (!x.id) { x.id = "FB-" + Date.parse(x.at).toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6); x.sent = false; ch = true; } }); if (ch) put(l); })();
    const pending = () => all().filter((x) => !x.sent);

    /* POST as text/plain so the browser sends a "simple" request (no CORS preflight), which Apps Script web apps accept */
    async function sendOne(item) {
      const body = JSON.stringify(Object.assign({ token: CFG.feedbackToken || "", prototypeVersion: CFG.version || "", browser: navigator.userAgent.slice(0, 180), session }, item));
      const res = await fetch(endpoint(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, redirect: "follow" });
      let data = null; try { data = await res.json(); } catch (e) {}
      if (!res.ok || !data || !data.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    }
    async function sync() {
      if (!endpoint() || syncing || !navigator.onLine) return;
      const todo = pending(); if (!todo.length) return;
      syncing = true; lastError = ""; let sentNow = 0;
      for (const item of todo) {
        try { await sendOne(item); const l = all(); const x = l.find((y) => y.id === item.id); if (x) { x.sent = true; x.sentAt = new Date().toISOString(); } put(l); sentNow++; }
        catch (e) { lastError = e.message || "Could not reach the feedback sheet"; break; }
      }
      syncing = false;
      if (sentNow) A.toast(`${sentNow} feedback item${sentNow > 1 ? "s" : ""} sent to the project team.`);
      if (!A.$("#fb-panel").hidden) open(true);
    }
    function statusHTML() {
      const p = pending().length;
      if (!endpoint()) return `<div class="alert warn"><div class="grow">Feedback is saved in this browser only. Use <b>Export</b> below and email the file to the project team.</div></div>`;
      if (syncing) return `<div class="alert info"><div class="grow">Sending feedback to the project team…</div></div>`;
      if (!p) return `<div class="alert ok"><div class="grow">All your feedback has reached the project team's sheet.</div></div>`;
      return `<div class="alert ${lastError ? "bad" : "warn"}"><div class="grow"><b>${p} item${p > 1 ? "s" : ""} not sent yet.</b> ${lastError ? `Last attempt failed: ${esc(lastError)}.` : navigator.onLine ? "" : "You are offline."} They stay saved here and are sent automatically. <button class="btn sm" type="button" id="fb-retry">Send now</button></div></div>`;
    }
    function panelHTML() {
      const list = all(); const mine = list.filter((x) => x.screen === cur.id);
      return `<h3>Feedback on this screen</h3>
        <p class="small muted" style="margin:0"><b>${esc(cur.title)}</b> · viewed as ${esc(A.role().label)}${cur.req ? ` · ${esc(cur.req.join(", "))}` : ""}</p>
        <div class="seg" role="radiogroup" aria-label="Overall">
          <label><input type="radio" name="fb-r" value="Works as needed" checked> Works as needed</label>
          <label><input type="radio" name="fb-r" value="Needs changes"> Needs changes</label>
          <label><input type="radio" name="fb-r" value="Something is missing"> Something is missing</label>
          <label><input type="radio" name="fb-r" value="Not needed"> Not needed</label></div>
        <label class="field"><span>What should change? Be specific (field, step, rule).</span><textarea id="fb-text" placeholder="e.g. Repeat students should also see the exam date before paying"></textarea></label>
        <div class="formgrid"><label class="field"><span>Your name (optional)</span><input id="fb-name" autocomplete="name"></label>
        <label class="field"><span>Your role / department</span><input id="fb-dept" placeholder="e.g. HoD, Zoology"></label></div>
        <div class="row"><button class="btn primary" type="button" id="fb-save">Save feedback</button><button class="btn ghost" type="button" id="fb-close">Close</button></div>
        <hr class="sep">${statusHTML()}<div class="row small"><span class="muted">${list.length} saved in this browser${mine.length ? ` (${mine.length} on this screen)` : ""}</span>
        <span style="margin-left:auto" class="row"><button class="btn sm" type="button" id="fb-csv" ${list.length ? "" : "disabled"}>Export CSV</button><button class="btn sm" type="button" id="fb-json" ${list.length ? "" : "disabled"}>Export JSON</button></span></div>
        ${mine.length ? `<div class="stack small">${mine.slice(-3).reverse().map((m) => `<div class="alert info"><div class="grow"><b>${esc(m.rating)}</b> · ${esc(m.text || "(no comment)")}<div class="tiny">${esc(m.name || "Anonymous")} · ${A.fmtDT(m.at)} · ${m.sent ? "sent" : "not sent yet"}</div></div></div>`).join("")}</div>` : ""}`;
    }
    function open(keepDraft) {
      const p = A.$("#fb-panel");
      const draft = keepDraft && A.$("#fb-text") ? { t: A.$("#fb-text").value, r: (A.$("input[name=fb-r]:checked") || {}).value } : null;
      p.innerHTML = panelHTML(); p.hidden = false;
      if (draft) { A.$("#fb-text").value = draft.t; const rb = A.$(`input[name=fb-r][value="${draft.r}"]`); if (rb) rb.checked = true; } else A.$("#fb-text").focus();
      A.$("#fb-close").onclick = close;
      A.$("#fb-save").onclick = () => {
        const text = A.$("#fb-text").value.trim(), rating = (A.$("input[name=fb-r]:checked") || {}).value;
        if (!text && rating !== "Works as needed") { A.toast("Add a short comment so the team knows what to change."); A.$("#fb-text").focus(); return; }
        const list = all(); const nm = A.$("#fb-name").value.trim(), dp = A.$("#fb-dept").value.trim();
        try { localStorage.setItem(FK + "-who", JSON.stringify({ nm, dp })); } catch (e) {}
        list.push({ id: "FB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), screen: cur.id, title: cur.title, requirements: (cur.req || []).join(" "), viewedAs: A.role().label, rating, text, name: nm, dept: dp, sent: false });
        put(list); A.toast(endpoint() ? "Feedback saved. Sending it to the project team…" : "Feedback saved. Export it from this panel to send it to the team."); open(); sync();
      };
      const rt = A.$("#fb-retry"); if (rt) rt.onclick = () => { lastError = ""; sync(); };
      try { const w = JSON.parse(localStorage.getItem(FK + "-who") || "null"); if (w) { A.$("#fb-name").value = w.nm || ""; A.$("#fb-dept").value = w.dp || ""; } } catch (e) {}
      const cols = ["id", "at", "screen", "title", "requirements", "viewedAs", "rating", "text", "name", "dept", "sent"].map((k) => ({ key: k, label: k }));
      A.$("#fb-csv").onclick = () => A.download("sis-prototype-feedback.csv", A.toCSV(cols, all()), "text/csv");
      A.$("#fb-json").onclick = () => A.download("sis-prototype-feedback.json", JSON.stringify(all(), null, 2), "application/json");
    }
    function close() { A.$("#fb-panel").hidden = true; A.$("#fb-btn").focus(); }
    window.addEventListener("online", () => sync());
    return { refresh(r) { cur = r; if (!A.$("#fb-panel").hidden) open(true); }, open, close, toggle() { A.$("#fb-panel").hidden ? open() : close(); }, count: () => all().length, sync, pending };
  })();

  /* ---------- boot ---------- */
  A.boot = (seedFn) => {
    A.load(seedFn);
    try { const qr = new URLSearchParams(location.search).get("role"); if (qr && A.ROLES[qr]) { state.role = qr; A.save(); } } catch (e) {}
    try { const t = localStorage.getItem("fos-sis-proto-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    try { if (localStorage.getItem("fos-sis-proto-reqs") === "hide") document.body.classList.add("hide-reqs"); } catch (e) {}
    const sel = A.$("#role-select");
    sel.innerHTML = Object.entries(A.ROLES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("");
    sel.addEventListener("change", () => { state.role = sel.value; A.save(); location.hash = firstRoute(); render(); A.toast(`Now viewing as ${A.role().label}`); });
    A.$("#fb-btn").addEventListener("click", A.Feedback.toggle);
    A.$("#menu-btn").addEventListener("click", () => A.$("nav.side").classList.toggle("open"));
    A.$("nav.side").addEventListener("click", (e) => { if (e.target.closest("a")) A.$("nav.side").classList.remove("open"); });
    A.$("#reset-demo").addEventListener("click", () => A.confirm("Reset demo data", "This puts every screen back to its starting sample data. Saved feedback is kept.", "Reset", () => { A.reset(seedFn); render(); A.toast("Demo data reset"); }, "danger"));
    A.$("#toggle-reqs").addEventListener("click", () => { const h = document.body.classList.toggle("hide-reqs"); try { localStorage.setItem("fos-sis-proto-reqs", h ? "hide" : "show"); } catch (e) {} });
    A.$("#toggle-theme").addEventListener("click", () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem("fos-sis-proto-theme", r.dataset.theme); } catch (e) {} });
    window.addEventListener("hashchange", render);
    render();
    setTimeout(() => A.Feedback.sync(), 1500); // send anything saved while offline or before the sheet was connected
  };
  return A;
})();
