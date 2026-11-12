# Prototype feedback: email + spreadsheet in the project Drive folder

Every **Save feedback** in the prototype goes to a small Google Apps Script, which:

1. **Adds a row** to the spreadsheet **"SIS prototype feedback"**. The script creates it in the project's [Drive folder](https://drive.google.com/drive/folders/12IcNkHqbk008ByXB_nyv-sksS5eFwhvm).
2. **Emails the item to tiroshanm@kln.ac.lk.** Each email shows the rating, screen, requirement IDs and comment, with a link to the row.
3. **Keeps an Excel copy,** "SIS prototype feedback.xlsx", in the same folder. It is refreshed hourly whenever new feedback has arrived.

The email address, folder and behaviour are set in the `CONFIG` block at the top of [Code.gs](Code.gs):

| Setting | Value | Options |
|---|---|---|
| `NOTIFY_EMAIL` | `tiroshanm@kln.ac.lk` | any address |
| `FOLDER_ID` | `12IcNkHqbk008ByXB_nyv-sksS5eFwhvm` | the ID from the folder's URL |
| `EMAIL_MODE` | `each` | `each` (one email per item), `daily` (one digest at 18:00), `off` |
| `XLSX_EXPORT` | `true` | `false` to skip the Excel copy |

The prototype itself never contains the email address. It only knows the script's web address and a token.

## Set it up (about 10 minutes, signed in as tiroshanm@kln.ac.lk)

### 1. Create the script

1. Go to [script.google.com](https://script.google.com) and choose **New project**. Rename it to **SIS prototype feedback**.
2. Replace the sample code with the contents of [Code.gs](Code.gs). Save.
3. Choose **setup** in the function list and click **Run**. Approve the permissions; the script asks for access to:
   - **Drive:** to create the spreadsheet and Excel copy in the folder
   - **Sheets:** to write the rows
   - **Gmail send:** for the notification emails
   - **External requests:** to export to Excel
4. Check the results:
   - The folder now contains **SIS prototype feedback**, with *Feedback* and *Summary* tabs, and **SIS prototype feedback.xlsx**.
   - You receive an email titled **"[SIS prototype] Feedback collector is set up"** with links and the token.

### 2. Deploy as a web app

1. Click **Deploy → New deployment → Select type (gear) → Web app**.
2. Set **Execute as:** *Me (tiroshanm@kln.ac.lk)* and **Who has access:** *Anyone*.
3. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
4. Check it: open the URL in a private browser window. You should see `{"ok":true,"service":"FoS SIS prototype feedback",…}`.

> **If "Anyone" is not offered,** or the private-window check asks you to sign in, the kln.ac.lk Google Workspace admin has blocked public web apps.
> - Ask the University's IT team to allow Apps Script web apps to be shared with "Anyone" for this project.
> - Or deploy the same script from a personal Gmail account, keeping `NOTIFY_EMAIL` and the folder as they are. The folder must then be shared with that account as an editor.
> - Choosing "Anyone within kln.ac.lk" will **not** work, because the prototype sends feedback without signing in.

### 3. Connect the prototype

Edit [../assets/js/config.js](../assets/js/config.js), then re-upload the `prototype/` folder:

```js
window.SIS_PROTO_CONFIG = {
  version: "prototype v0.1",
  feedbackEndpoint: "https://script.google.com/macros/s/XXXXXXXX/exec",
  feedbackToken: "the token from the setup email",
};
```

Then save one test feedback in the prototype. Within a few seconds:

- a row appears in the spreadsheet
- an email arrives at tiroshanm@kln.ac.lk
- the feedback panel says *"All your feedback has reached the project team's sheet"*

Feedback saved before this step, or while offline, is sent automatically the next time that browser opens the prototype.

## Working with the feedback

| Column | Filled by | Use |
|---|---|---|
| Received, Submitted at, Feedback ID | Script | When it arrived; the ID prevents duplicate rows when a browser retries |
| Screen, Screen ID, Requirements | Prototype | Which screen and which requirement IDs (REG-03, EXM-05 …) the comment is about |
| Rating, Comment | Staff | *Works as needed*, *Needs changes*, *Something is missing* or *Not needed*, plus their comment |
| Viewed as, Name, Role / department | Staff | The role they were testing, and who they are (name is optional) |
| Session, Prototype version, Browser | Prototype | Groups one person's session; tells you which build they saw |
| **Status, Owner, Triage notes** | **You / the team** | Triage: *New → Accepted / Planned for MVP / Later / Not doing → Done* |

- Work in the **Google spreadsheet**. The **.xlsx** file is a read-only snapshot for anyone who wants Excel; it is replaced on each refresh, so edits made to it are lost.
- Filter **Status = New** for triage meetings, or filter **Requirements** by an ID to see everything said about one requirement.
- The **Summary** tab counts feedback by screen and rating, by status, and by role.
- **Email limits:** Workspace accounts can send about 1,500 emails a day and personal Gmail about 100. If a session produces a lot of feedback, set `EMAIL_MODE: 'daily'` and run `setup` again.

## Changing settings later

- **After editing `CONFIG`:** run **setup** again. It reuses the same spreadsheet and resets the hourly and daily jobs.
- **After editing the code:** use **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same, so the prototype needs no change.

## Security and privacy

- **The token is a light spam filter.** It is visible in the prototype's page source. Anyone with both the URL and the token can add rows and trigger emails, but cannot read the spreadsheet. To rotate it, change `FEEDBACK_TOKEN` under **Project Settings → Script properties** and in `config.js`.
- **Only what staff type is collected,** plus the screen, role and browser. The prototype holds no real student data. Tell staff that the name field is optional.
- **The spreadsheet and Excel copy inherit the folder's sharing.** Share the folder only with the project team.
- **Text is stored as plain text.** Comments starting with `=`, `+`, `-` or `@` are stored with a leading `'`, so the spreadsheet never runs them as formulas.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Panel says "Invalid token" | `feedbackToken` in config.js doesn't match `FEEDBACK_TOKEN` in Script properties |
| Panel says "Run setup() first" | Run **setup** once from the editor |
| Panel keeps "not sent yet" with an HTTP error | The deployment must be a **Web app** with access **Anyone**, and the URL must end in `/exec`, not `/dev` (see the note in step 2) |
| Rows appear but no email | Check `EMAIL_MODE`, the spam folder, and **Executions** in Apps Script for "Email failed" |
| No .xlsx in the folder | Check `XLSX_EXPORT: true`, then run **exportXlsx** once from the editor and check **Executions** |
| "Exception: No item with the given ID" during setup | The account running the script cannot open the folder. Sign in as the folder owner, or share the folder with that account as an editor |
