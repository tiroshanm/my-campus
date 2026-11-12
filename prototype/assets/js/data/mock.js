/* Sample data for the prototype. Every person, number and mark here is fictional.
   Course units, credits, prerequisites and programme structures come from the 2023/24 handbook (catalog.js). */
window.Mock = (function () {
  "use strict";
  const C = window.CATALOG;

  /* deterministic random so every reset looks the same */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const FIRST_F = ["Nethmi", "Sanduni", "Tharushi", "Kavindi", "Dilini", "Hiruni", "Ishara", "Nadeesha", "Piumi", "Sachini", "Yasodha", "Amaya", "Chamodi", "Madhushani", "Rashmi", "Shehani"];
  const FIRST_M = ["Kasun", "Pasindu", "Chamath", "Dineth", "Isuru", "Ravindu", "Sahan", "Tharindu", "Nuwan", "Lahiru", "Supun", "Janith", "Hasitha", "Kavishka", "Yasiru", "Mohamed", "Arjun", "Thilina"];
  const LAST = ["Perera", "Fernando", "Silva", "Jayasinghe", "Wijesinghe", "Bandara", "Rathnayake", "Herath", "Gunasekara", "Dissanayake", "Karunaratne", "Wickramasinghe", "Senanayake", "Rajapaksha", "Ekanayake", "Abeysekara", "Kumara", "Liyanage", "Samarasinghe", "Weerasinghe", "Nizar", "Sivakumar", "Rasheed", "Pathirana"];

  const DEPARTMENTS = [
    { id: "CHEM", name: "Department of Chemistry", subjects: ["CHEM", "APCH", "BIOC"] },
    { id: "IMGT", name: "Department of Industrial Management", subjects: ["INTE", "MGTE", "IMGT", "GNCT"] },
    { id: "MATH", name: "Department of Mathematics", subjects: ["PMAT", "AMAT"] },
    { id: "MIBI", name: "Department of Microbiology", subjects: ["MIBI"] },
    { id: "PHYS", name: "Department of Physics and Electronics", subjects: ["PHYS", "ELEC", "BECS"] },
    { id: "PLBL", name: "Department of Plant and Molecular Biology", subjects: ["PLBL", "MBBT"] },
    { id: "STAT", name: "Department of Statistics and Computer Science", subjects: ["STAT", "COSC", "COST"] },
    { id: "ZOOL", name: "Department of Zoology and Environmental Management", subjects: ["ZOOL", "ENCM"] },
    { id: "SENG", name: "Software Engineering Teaching Unit", subjects: ["SENG"] },
    { id: "BSSS", name: "Sports and Exercise Science Unit", subjects: ["BSSS"] },
  ];
  const deptOf = (code) => (DEPARTMENTS.find((d) => d.subjects.includes(code.slice(0, 4))) || { id: "FAC", name: "Faculty" });

  const PROGRAMMES = [
    { id: "bs", label: "BSc · Biological Science stream", prefix: "BS", years: 3 },
    { id: "ps", label: "BSc · Physical Science stream", prefix: "PS", years: 3 },
    { id: "encm", label: "BSc · Environmental Conservation & Management", prefix: "EN", years: 3 },
    { id: "pe", label: "BSc · Physics & Electronics", prefix: "PE", years: 3 },
    { id: "apch", label: "BSc Hons · Applied Chemistry", prefix: "AC", years: 4 },
    { id: "bsss", label: "BSc Hons · Sports Science", prefix: "SS", years: 4 },
    { id: "mitit", label: "BSc Hons · Management & IT / IT", prefix: "IM", years: 4 },
    { id: "seng", label: "BSc Hons · Software Engineering", prefix: "SE", years: 4 },
    { id: "becs", label: "BSc Hons · Electronics & Computer Science", prefix: "EC", years: 4 },
  ];

  const structUnits = (key) => (C.STRUCT[key] || "").split(",").filter(Boolean).map((x) => { const [c, s] = x.split(":"); return { code: c.slice(0, 4) + " " + c.slice(4), st: s }; });

  /* other-faculty auxiliary units (handbook §6) */
  const OTHER = [["FREN 23342", "French: Grammar, Comprehension and Expression", "Faculty of Humanities"], ["JPNS 23354", "Japanese Language for Business Purposes II", "Faculty of Humanities"], ["GEHI 22282", "History of Sri Lanka", "Faculty of Social Sciences"], ["MGMT 22022", "Marketing Management", "Faculty of Commerce & Management Studies"]];
  OTHER.forEach(([c, t]) => { window.App.EXTRA_UNITS[c.replace(" ", "")] = [t, "A"]; });

  function seed() {
    const r = rng(20261112);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const person = (i, gender) => { const g = gender || (r() < 0.55 ? "F" : "M"); return { name: `${pick(g === "F" ? FIRST_F : FIRST_M)} ${pick(LAST)}`, gender: g === "F" ? "Female" : "Male" }; };

    /* ---- the signed-in student (Physical Science, combination PS 2: COSC + PHYS + PMAT, Year 2) ---- */
    const y1 = structUnits("ps2").filter((u) => u.code[5] === "1" && u.st === "C");
    const G = ["A", "B+", "A-", "B", "A", "B+", "A-", "B", "A+", "B+", "A-", "C+", "B", "A", "B+", "A-"];
    let gi = 0;
    const myResults = y1.map((u) => {
      const sem = u.code[6] === "2" ? 2 : 1;
      let grade = u.code === "PMAT 12253" ? "C-" : u.code === "ACLT 11013" ? "B" : G[gi++ % G.length];
      return { code: u.code, grade, ay: "2025/26", sem, attempt: "Proper", released: true };
    });
    const me = {
      id: "s041", regNo: "PS/2025/041", indexNo: "S25041", name: "Kavindi Senanayake", initials: "K. Senanayake", gender: "Female",
      programme: "ps", programmeLabel: "BSc (Physical Science)", combination: "ps2", combinationLabel: "PS 2 · Computer Science + Physics + Pure Mathematics",
      year: 2, intake: "2025/26", edition: "2023/24", status: "Active", adminRegistered: true, safetyModule: true,
      regDate: "2025-12-01", validUntil: "2030-11-30",
      mobile: "+94 77 123 4567", land: "+94 11 291 2345", personalEmail: "kavindi.s@example.com", uniEmail: "ps2025041@stu.example.ac.lk",
      address: "No. 12, Temple Road, Kiribathgoda", nic: "200412345678", alResults: [["Combined Mathematics", "A"], ["Physics", "B"], ["Chemistry", "B"]], zScore: "1.8432",
      advisor: "Dr. N. Advisor (sample)",
    };

    /* ---- Year 2 offerings for the student's registration ---- */
    const y2 = structUnits("ps2").filter((u) => u.code[5] === "2");
    const slots = ["Mon 08:00–10:00", "Mon 10:00–12:00", "Mon 13:00–16:00", "Tue 08:00–10:00", "Tue 10:00–12:00", "Tue 13:00–16:00", "Wed 08:00–10:00", "Wed 10:00–12:00", "Thu 08:00–10:00", "Thu 13:00–16:00", "Fri 08:00–10:00", "Fri 10:00–12:00"];
    const offerings = {};
    const semIdx = { 1: 0, 2: 0 };
    y2.forEach((u) => { const sm = u.code[6] === "2" ? 2 : 1; offerings[u.code] = { slot: slots[semIdx[sm]++ % slots.length], capacity: 400, enrolled: 120 + Math.floor(r() * 120) }; });
    offerings["MAPS 22603"] = Object.assign(offerings["MAPS 22603"] || {}, { slot: offerings[y2.find((u) => u.code.startsWith("PHYS 22"))?.code || y2[0].code].slot, capacity: 200, enrolled: 88 });
    OTHER.forEach(([c, t, f], i) => { offerings[c] = { slot: ["Wed 13:00–15:00", "Sat 09:00–12:00", "Thu 16:00–18:00", "Fri 14:00–16:00"][i], capacity: 40, enrolled: 25 + i * 4, faculty: f }; });

    const registration = {
      ay: "2026/27", status: "Draft",
      selected: y2.filter((u) => u.st === "C").map((u) => u.code),
      repeats: [{ code: "PMAT 12253", fee: 500, paid: false, registered: false }],
    };

    /* ---- staff users ---- */
    const users = {
      student: { name: me.name, sub: `${me.regNo} · Year 2 · Physical Science` },
      lecturer: { name: "Dr. A. Lecturer (sample)", sub: "Senior Lecturer · Statistics & Computer Science" },
      hod: { name: "Prof. H. Head (sample)", sub: "Head · Statistics & Computer Science" },
      dean: { name: "Prof. D. Dean (sample)", sub: "Dean · Faculty of Science" },
      exam: { name: "Ms. E. Officer (sample)", sub: "Assistant Registrar · Examinations" },
      coord: { name: "Dr. P. Coordinator (sample)", sub: "Programme Coordinator · Physical Science" },
      admin: { name: "Mr. S. Admin (sample)", sub: "System Administrator · Faculty IT" },
    };

    /* ---- student population ---- */
    const students = [];
    let n = 1;
    PROGRAMMES.forEach((p) => {
      const count = { bs: 14, ps: 18, encm: 6, pe: 6, apch: 5, bsss: 5, mitit: 10, seng: 8, becs: 6 }[p.id];
      for (let k = 0; k < count; k++) {
        const yr = 1 + Math.floor(r() * p.years); const intake = 2026 - yr + 1; const pr = person(n);
        const st = r() < 0.04 ? "Suspended" : r() < 0.04 ? "Results withheld" : r() < 0.03 ? "Deferred" : "Active";
        students.push({ id: "x" + n, regNo: `${p.prefix}/${intake}/${String(100 + n).padStart(3, "0")}`, name: pr.name, gender: pr.gender, programme: p.id, programmeLabel: p.label, year: yr, intake: `${intake}/${String(intake + 1).slice(2)}`, status: st, gpa: Math.round((2 + r() * 1.9) * 100) / 100, adminRegistered: r() > 0.07, email: `${p.prefix.toLowerCase()}${intake}${100 + n}@stu.example.ac.lk` });
        n++;
      }
    });
    students.unshift({ id: me.id, regNo: me.regNo, name: me.name, gender: me.gender, programme: "ps", programmeLabel: "BSc · Physical Science stream", year: 2, intake: "2025/26", status: "Active", gpa: window.App.gpa(myResults), adminRegistered: true, email: me.uniEmail });

    /* ---- result sheets (EXM-05 workflow) ---- */
    const roster = (k, size, gpaBias) => Array.from({ length: size }, (_, i) => { const p = person(1000 + k * 100 + i); return { sid: `r${k}-${i}`, regNo: `PS/2025/${String(200 + k * 50 + i).padStart(3, "0")}`, name: p.name, repeat: i === 3 || i === 11, labPct: i === 7 ? 72 : i === 15 ? 45 : 90 + Math.floor(r() * 10) }; });
    const mk = (size, filled) => { const m = {}; for (let i = 0; i < size; i++) { if (!filled) continue; const absent = i === 9; m[i] = absent ? { absent: true } : { ca: 40 + Math.floor(r() * 55), pr: 35 + Math.floor(r() * 60), fe: 25 + Math.floor(r() * 70) }; } return m; };
    const SHEET_DEF = [
      ["COSC 12043", "lecturer-first", "Draft", "2026-11-21", 28, false],
      ["COSC 12033", "lecturer-second", "FirstEntered", "2026-11-18", 26, true],
      ["COSC 11023", "", "SecondVerified", "2026-11-05", 30, true],
      ["STAT 12643", "", "SecondVerified", "2026-11-08", 24, true],
      ["COST 12043", "", "HoDRecommended", "2026-11-02", 20, true],
      ["PHYS 12542", "", "HoDRecommended", "2026-11-04", 26, true],
      ["CHEM 12642", "", "FirstEntered", "2026-10-30", 30, true],
      ["PMAT 12253", "", "Draft", "2026-10-28", 30, false],
      ["ZOOL 12703", "", "Draft", "2026-10-25", 22, false],
      ["MIBI 12514", "", "Released", "2026-10-20", 25, true],
      ["SENG 12213", "", "DeanApproved", "2026-11-01", 24, true],
      ["BIOC 12612", "", "FirstEntered", "2026-11-03", 22, true],
    ];
    const sheets = SHEET_DEF.map(([code, mine, stt, due, size, filled], k) => ({
      id: "rs" + k, code, ay: "2025/26", sem: 2, session: "2025/26 Semester II examinations", examDate: "2026-10-06",
      dept: deptOf(code).id, deptName: deptOf(code).name, state: stt, mine,
      first: mine === "lecturer-first" ? "Dr. A. Lecturer (sample)" : `Dr. ${String.fromCharCode(66 + k)}. Examiner (sample)`,
      second: mine === "lecturer-second" ? "Dr. A. Lecturer (sample)" : `Dr. ${String.fromCharCode(77 + k)}. Moderator (sample)`,
      due, scheme: { ca: 30, pr: 20, fe: 50 }, roster: roster(k, size), marks: mk(size, filled),
      history: [{ at: "2026-10-06T09:00:00", who: "System", what: "Sheet created when the exam was held" }],
    }));

    /* ---- class roll & attendance for the lecturer's current Year 2 module ---- */
    const lecRoll = roster(20, 32).map((s, i) => Object.assign(s, { att: Array.from({ length: 10 }, () => r() > (i === 5 ? 0.45 : 0.08)) }));

    /* ---- exam session ---- */
    const halls = [["Science Auditorium", 300], ["Exam Hall C", 200], ["Lecture Hall A1", 150], ["Lecture Hall A2", 150], ["B-Block LT1", 120], ["Computer Lab 1", 60], ["Computer Lab 2", 60]].map(([nm, cap], i) => ({ id: "h" + i, name: nm, cap }));
    const examUnits = structUnits("ps2").filter((u) => u.code[5] === "2" && u.code[6] === "1" && !u.code.startsWith("ACLT") && !u.code.startsWith("CMSK") && !u.code.startsWith("MAPS")).concat(structUnits("bs1").filter((u) => u.code[5] === "2" && u.code[6] === "1" && u.st === "C").slice(0, 5));
    const dates = ["2027-02-15", "2027-02-15", "2027-02-17", "2027-02-17", "2027-02-19", "2027-02-22", "2027-02-22", "2027-02-24", "2027-02-26", "2027-03-01", "2027-03-01", "2027-03-03", "2027-03-05", "2027-03-08", "2027-03-10"];
    const exams = { session: "2026/27 Semester I examinations", status: "Planning", slots: examUnits.slice(0, 14).map((u, i) => ({ id: "e" + i, code: u.code, date: dates[i], time: i % 2 ? "13:30–16:30" : "09:00–12:00", count: 90 + Math.floor(r() * 260), halls: [], duties: [] })), halls, staff: Array.from({ length: 30 }, (_, i) => ({ id: "st" + i, name: `Staff member ${String(i + 1).padStart(2, "0")}`, role: i < 8 ? "Supervisor" : i < 24 ? "Invigilator" : "Hall attendant", load: 0 })) };
    // one deliberate clash: two exams for the same cohort at the same time
    exams.slots[1].time = exams.slots[0].time; exams.slots[1].clashNote = "Same cohort as " + exams.slots[0].code;

    /* ---- windows / academic calendar ---- */
    const windows = [
      { id: "w1", type: "Course registration", scope: "All years · 2026/27", open: "2026-11-03", close: "2026-11-24", note: "Annual registration (REG-01)" },
      { id: "w2", type: "Add / drop", scope: "All years · Semester I", open: "2026-11-25", close: "2026-12-08", note: "First two weeks of the semester (§1.7)" },
      { id: "w3", type: "Repeat / medical registration", scope: "All years", open: "2026-11-03", close: "2026-11-30", note: "Requires online payment (REG-04)" },
      { id: "w4", type: "Mark entry", scope: "2025/26 Semester II", open: "2026-10-06", close: "2026-11-21", note: "1st examiner 3 weeks, 2nd examiner 1 week (to be verified)" },
      { id: "w5", type: "Honours selection", scope: "Year 2 → Year 3 · Physical Science", open: "2026-12-01", close: "2026-12-14", note: "SEL-03" },
      { id: "w6", type: "Pathway selection", scope: "Year 1 · Biological Science (Semester II)", open: "2027-03-01", close: "2027-03-10", note: "SEL-02" },
    ];

    /* ---- Honours selection round (Physical Science) ---- */
    const opts = [["COSC", "Computer Science", 25], ["PHYS", "Physics", 15], ["MATH", "Mathematics", 15], ["STAT", "Statistics", 15], ["ELEC", "Electronics", 8], ["CHEM", "Chemistry", 12]];
    const applicants = Array.from({ length: 64 }, (_, i) => {
      // weak grades, E grades and below-C subject units are realistic only for lower GPAs
      const p = person(3000 + i); const gpa = Math.round((2.3 + r() * 1.65) * 100) / 100;
      const weak = gpa < 3.0 ? (r() < 0.45 ? 9 + Math.floor(r() * 6) : Math.floor(r() * 8)) : Math.floor(r() * 6);
      const eGrade = gpa < 3.1 && r() < 0.25;
      const prefs = opts.map((o) => o[0]).sort(() => r() - 0.5).slice(0, 3);
      return { sid: "a" + i, regNo: `PS/2025/${String(300 + i).padStart(3, "0")}`, name: p.name, gpa, weak, eGrade, subjectC: Object.fromEntries(opts.map((o) => [o[0], r() > (gpa > 3.4 ? 0.04 : 0.2)])), prefs };
    });
    applicants.push({ sid: me.id, regNo: me.regNo, name: me.name, gpa: window.App.gpa(myResults), weak: 2, eGrade: false, subjectC: { COSC: true, PHYS: true, MATH: false, STAT: true, ELEC: true, CHEM: true }, prefs: ["COSC", "PHYS", "MATH"] });
    const selection = { rounds: [
      { id: "hons-ps", name: "Honours selection 2026 · Physical Science", type: "Honours", window: "w5", state: "Collecting preferences", options: opts.map(([k, l, c]) => ({ k, label: l, cap: c })), applicants, allocation: null, ranking: "Year 1–2 GPA, then fewer D/D+/C− credits" },
      { id: "path-bs", name: "Pathway selection 2027 · Biological Science (Year 1)", type: "Pathway", window: "w6", state: "Scheduled", options: [["BIOC", "Biochemistry", 60], ["COST", "Computer Studies", 25], ["MIBI", "Microbiology", 60]].map(([k, l, c]) => ({ k, label: l, cap: c })), applicants: [], allocation: null, ranking: "Year 1 Semester I GPA" },
    ] };

    /* ---- graduating cohort (pass list / final results sheet) ---- */
    const finalists = Array.from({ length: 36 }, (_, i) => { const p = person(5000 + i); const gpa = Math.round((1.85 + r() * 2.1) * 100) / 100; const credits = 90 + Math.floor(r() * 9) - (i === 4 ? 6 : 0); return { regNo: `PS/2023/${String(400 + i).padStart(3, "0")}`, name: p.name, programme: i < 24 ? "BSc (Physical Science)" : "BSc (Biological Science)", gpa, credits, years: i === 7 ? 4 : 3 }; });

    /* ---- requests ---- */
    const requests = [
      { id: "RQ-1042", type: "Interim results sheet", student: me.name, regNo: me.regNo, submitted: "2026-10-28", state: "Issued", fee: 300, paid: true },
      { id: "RQ-1077", type: "Medium of Instruction letter", student: me.name, regNo: me.regNo, submitted: "2026-11-09", state: "In review", fee: 0, paid: true },
      { id: "RQ-1080", type: "Exam deferment appeal", student: students[8].name, regNo: students[8].regNo, submitted: "2026-11-10", state: "Awaiting Dean", fee: 0, paid: true, reason: "Hospitalised during exam week; certificate from University Medical Centre attached" },
      { id: "RQ-1081", type: "Medical submission", student: students[15].name, regNo: students[15].regNo, submitted: "2026-11-11", state: "Awaiting medical officer", fee: 0, paid: true, reason: "Absent from PHYS 12542 practical (3 Nov)" },
      { id: "RQ-1083", type: "Transcript", student: students[30].name, regNo: students[30].regNo, submitted: "2026-11-11", state: "Awaiting payment", fee: 1000, paid: false },
    ];

    const notifications = [
      { at: "2026-11-03T08:00:00", text: "Course registration for 2026/27 is open until 24 Nov.", kind: "info" },
      { at: "2026-11-03T08:00:00", text: "You have 1 repeat unit (PMAT 12253). Register and pay by 30 Nov.", kind: "warn" },
      { at: "2026-10-20T14:10:00", text: "Results released: 2025/26 Semester II (14 units).", kind: "ok" },
    ];

    return { version: 1, role: "student", users, me, myResults, registration, offerings, students, sheets, lecRoll, exams, windows, selection, finalists, requests, notifications, audit: [], deansList: null };
  }
  return { seed, DEPARTMENTS, PROGRAMMES, OTHER, structUnits, deptOf };
})();
