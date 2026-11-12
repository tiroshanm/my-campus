# Faculty of Science SIS: clickable prototype

A static, clickable prototype of the Faculty of Science Student Information System. It runs on sample data, and its purpose is to collect feedback from staff and students while the real system (the MVP) is being built.

- **No server, no build step.** It is plain HTML, CSS and JavaScript.
- **Sample data only.** Every student, staff member, mark and payment is fictional.
- **The academic rules are real.** Course units, credits, prerequisites, programme structures and the grading, GPA, repeat and Honours-gate rules come from the 2023/24 Student Handbook.

## Run it

| Where | How |
|---|---|
| Your own computer | Open `index.html` in Chrome, Edge, Firefox or Safari. Opening it straight from disk works. |
| A shared link for staff | Copy the whole `prototype/` folder to any static web host: a University web server, GitHub Pages, Netlify or similar. |
| Quick local server | Run `python3 -m http.server 8080` inside `prototype/`, then open http://localhost:8080 |

The fonts load from Google Fonts. Offline, the page falls back to system fonts and everything else still works.

The **Architecture documentation** link in the top banner opens `../docs/architecture/sis-architecture.html`. When you publish, upload the repository root rather than only `prototype/`, so that the link keeps working. For example, GitHub Pages serving the repository root gives `…/prototype/` and `…/docs/architecture/sis-architecture.html`.

## Signing in

The prototype opens on a sign-in page. Nothing is checked against a real account service.

| Role | Username | University email |
|---|---|---|
| Student | `student` | ps2025041@stu.kln.ac.lk |
| Lecturer / Examiner | `lecturer` | lecturer.demo@kln.ac.lk |
| Head of Department | `hod` | hod.demo@kln.ac.lk |
| Dean | `dean` | dean.demo@kln.ac.lk |
| Faculty Office / Exam Branch | `exams` | exams.demo@kln.ac.lk |
| Programme Coordinator | `coordinator` | coordinator.demo@kln.ac.lk |
| System Administrator | `admin` | admin.demo@kln.ac.lk |

- **Default password** for every account: `Sis@2026`. The student account is filled in by default.
- **Sign in with Google** accepts only University of Kelaniya accounts ending in **@kln.ac.lk**, including sub-domains such as stu.kln.ac.lk. Any other Google address, for example a Gmail account, is refused with an explanation. A kln.ac.lk address that has no SIS account is told to contact the Faculty Office.
- **Two-step verification** applies to the Head of Department, Dean, Exam Branch and Administrator. Any 6-digit code works in the prototype.
- **Forgot password?** shows the reset-link flow.
- **Sign out** is in the top bar.
- Sign-in lasts until the browser tab is closed.

## Using it in a feedback session

1. **Choose a role** by signing in with that role's account. Once signed in, you can switch with **Viewing as** in the top bar:
   - Student
   - Lecturer / Examiner
   - Head of Department
   - Dean
   - Faculty Office / Exam Branch
   - Programme Coordinator
   - System Administrator
2. **Send each group a link for their role.**
   - `index.html?role=lecturer` opens the sign-in page with that account already filled in.
   - Adding `&signedin=1` skips sign-in completely.
   - Valid roles are `student`, `lecturer`, `hod`, `dean`, `exam`, `coord` and `admin`.
3. **Each screen lists the requirement IDs it demonstrates**, such as `REG-03` and `EXM-05`, from the SIS requirements template. Hide them with **Show / hide requirement IDs** in the top banner.
4. **Feedback:** **Give feedback** (bottom right) saves a rating and a comment for the current screen.
   - **Google Sheet and email:** once connected ([feedback-sheet/README.md](feedback-sheet/README.md)), every item is added to the feedback spreadsheet in the project Drive folder, emailed to the project owner, and copied to an Excel file in the same folder.
   - **Fallback:** without the Sheet, or offline, items stay in the browser and are sent later. **Export CSV / JSON** in the same panel is always available as a backup.
5. **Reset demo data** (top banner) restores the starting data. Saved feedback is kept.

Changes made during a session, such as registering, entering marks or approving sheets, are kept in that browser's local storage. Every change appears in **Audit log**, under the System Administrator role.

### Suggested walkthrough (about 20 minutes)

| # | Role | Try this | Requirements |
|---|---|---|---|
| 1 | Student | **Dashboard**: alerts for the registration deadline and the repeat unit | REG-09, REG-10 |
| 2 | Student | **Course registration**: tick MAPS 22603 to see a timetable clash. Open **Other faculties** and tick JPNS 23354 to see the 2-credit limit. Untick them, then submit. | REG-01, REG-03, REG-07, REG-09, REG-15 |
| 3 | Student | **Repeat & medical** tab: register and pay for the repeat. The payment is simulated. | REG-04, EXM-01 |
| 4 | Student | **Degree progress**: BSc award progress and the Honours "what-if" check | EXM-10 |
| 5 | Student | **Selections**: rank Honours preferences | SEL-03 |
| 6 | Lecturer | **Result sheet** for COSC 12043: **Fill sample marks (demo)**, check the repeat and lab-attendance caps, then **Submit to 2nd examiner** | EXM-05, EXM-18 |
| 7 | Lecturer | **Mark entry**, then COSC 12033 as 2nd examiner: **Verify** | EXM-05 |
| 8 | Head of Department | **Approvals**: recommend a verified sheet | EXM-05 |
| 9 | Dean | **Approvals**: approve, then release. Also approve or reject an appeal. | EXM-05, REQ-01 |
| 10 | Exam Branch | **Exam timetable & halls**: fix the clash, allocate halls, generate the duty roster, open a document pack | EXM-07, EXM-08, EXM-13, EXM-14 |
| 11 | Exam Branch | **Selection rounds**: run the Honours allocation, then publish it | SEL-01 to SEL-03 |
| 12 | Exam Branch | **Pass list & Dean's list**, **Students** (change status, move results to a new registration number), **Reports** | EXM-11, REG-08, REG-12, SCH-* |
| 13 | HoD / Dean | **Analytics**: descriptive, diagnostic and predictive views | ANA-01 to ANA-03 |

## What is real and what is simulated

| Real (from the handbook) | Simulated |
|---|---|
| Course codes, titles, credits, levels and semesters (837 units) | People, marks, GPAs, cohorts, fees and dates |
| Prerequisites and co-requisites (616 links) | Payments: no gateway is called |
| Programme structures (C/O/A per combination or column) | Email and SMS: shown as toast messages |
| Grade bands, GPA, repeat cap at C, lab-attendance caps | Timetable slots and exam venues |
| Honours gate (GPA ≥ 3.00, ≤ 8 credits of D/D+/C−, no E) and BSc award rules | Analytics figures and forecasts |

Assumptions still to confirm with the Faculty are flagged on screen:

- **Prerequisite pass level:** a prerequisite counts as passed at grade D or better.
- **Dean's list criteria:** a placeholder of GPA ≥ 3.70 is used (architecture open question Q4).
- **Mark-entry durations:** 3 weeks for the 1st examiner and 1 week for the 2nd, marked "to be verified" in the template.

## Screens and requirements

| Area | Screens |
|---|---|
| Student portal | Dashboard, Course registration, Results, Degree progress, Selections, Exam admission, Requests & documents, Profile |
| Teaching | My modules, Class roll & attendance, Mark entry, Result sheet |
| Approvals | Head of Department approvals, Dean approvals and appeals |
| Faculty Office | Overview, Students, Calendar & windows, Offerings & examiners, Results tracker, Exam timetable & halls, Requests & appeals, Selection rounds, Pass list & Dean's list, Reports |
| Insight | Analytics (descriptive, diagnostic, predictive) |
| Administration | Course catalogue, Rule sets, Users & roles, Audit log |

The full requirement catalogue and the design these screens follow are in [../docs/architecture/sis-architecture.md](../docs/architecture/sis-architecture.md).

## Files

```
prototype/
├── index.html               shell: banner, navigation, role switcher, feedback panel
├── assets/css/app.css       design tokens (light and dark), layout, components
├── assets/img/fos-logo.png  Faculty logo (from fos.kln.ac.lk)
├── feedback-sheet/          Apps Script: feedback → spreadsheet in Drive folder + email + Excel copy
└── assets/js/
    ├── config.js            feedback Sheet URL and token (edit after deploying the script)
    ├── core.js              routing, state, UI helpers, academic rules, charts, feedback
    ├── data/catalog.js      units, structures and requisites from the 2023/24 handbook
    ├── data/mock.js         fictional students, staff, sheets, exams and selections
    └── screens/             student.js · staff.js · office.js · insight.js
```

To add a screen, call `App.route("id", { roles, title, desc, req, render(el) {...} })` in a screen file and add its id to that role's `App.nav(...)` list.
