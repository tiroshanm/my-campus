/**
 * Faculty of Science SIS prototype: feedback collector.
 *
 * - Creates the feedback spreadsheet inside the project's Google Drive folder
 * - Appends every feedback item sent by the prototype
 * - Emails each item (or a daily digest) to the project owner
 * - Keeps an Excel (.xlsx) copy of the spreadsheet in the same folder, refreshed hourly
 *
 * Use as a standalone Apps Script project (script.google.com > New project).
 * Run setup() once, then deploy as a web app. Full steps: feedback-sheet/README.md
 */

var CONFIG = {
  NOTIFY_EMAIL: 'tiroshanm@kln.ac.lk',            // who receives feedback emails
  FOLDER_ID: '12IcNkHqbk008ByXB_nyv-sksS5eFwhvm', // Drive folder that holds the spreadsheet and the Excel copy
  FILE_NAME: 'SIS prototype feedback',            // spreadsheet name (the Excel copy gets .xlsx)
  EMAIL_MODE: 'each',                             // 'each' = one email per item, 'daily' = one digest at 18:00, 'off'
  XLSX_EXPORT: true,                              // keep an Excel copy in the folder, refreshed hourly when there is new feedback
};

var SHEET_NAME = 'Feedback';
var SUMMARY_NAME = 'Summary';
var HEADERS = [
  'Received', 'Submitted at', 'Feedback ID', 'Screen', 'Screen ID', 'Requirements', 'Rating', 'Comment',
  'Viewed as', 'Name', 'Role / department', 'Session', 'Prototype version', 'Browser',
  'Status', 'Owner', 'Triage notes'
];
var STATUSES = ['New', 'Accepted', 'Planned for MVP', 'Later', 'Not doing', 'Done'];
var MAX_TEXT = 2000;
var PROPS = PropertiesService.getScriptProperties();

/* ===================================================================== setup */

/** Run once from the editor. Safe to run again: it reuses the existing spreadsheet. */
function setup() {
  var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  var ss = findOrCreateSpreadsheet_(folder);
  PROPS.setProperty('SPREADSHEET_ID', ss.getId());

  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  var first = ss.getSheets()[0];
  if (first.getName() !== SHEET_NAME && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  formatFeedbackSheet_(sh);
  buildSummary_(ss);

  if (!PROPS.getProperty('FEEDBACK_TOKEN')) PROPS.setProperty('FEEDBACK_TOKEN', Utilities.getUuid().slice(0, 8));
  installTriggers_();
  if (CONFIG.XLSX_EXPORT) exportXlsx(true);

  var msg = 'Spreadsheet: ' + ss.getUrl() + '\nFolder: ' + folder.getUrl() +
            '\nFEEDBACK_TOKEN: ' + PROPS.getProperty('FEEDBACK_TOKEN') + '  (copy it into prototype/assets/js/config.js)';
  Logger.log(msg);
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: '[SIS prototype] Feedback collector is set up',
    htmlBody: '<p>The feedback spreadsheet is ready.</p><ul><li><a href="' + ss.getUrl() + '">Open the spreadsheet</a></li><li><a href="' + folder.getUrl() +
              '">Open the Drive folder</a> (the Excel copy is kept here)</li></ul><p>Email mode: <b>' + CONFIG.EMAIL_MODE + '</b>. Token for <code>config.js</code>: <code>' +
              PROPS.getProperty('FEEDBACK_TOKEN') + '</code></p><p>Next: deploy this script as a web app and paste its URL into <code>prototype/assets/js/config.js</code>.</p>'
  });
}

function findOrCreateSpreadsheet_(folder) {
  var id = PROPS.getProperty('SPREADSHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted: create a new one */ } }
  var files = folder.getFilesByName(CONFIG.FILE_NAME);
  while (files.hasNext()) {
    var f = files.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS && !f.isTrashed()) return SpreadsheetApp.openById(f.getId());
  }
  var ss = SpreadsheetApp.create(CONFIG.FILE_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

function formatFeedbackSheet_(sh) {
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#01143e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, HEADERS.length, 120);
  sh.setColumnWidth(4, 180); sh.setColumnWidth(6, 160); sh.setColumnWidth(8, 420); sh.setColumnWidth(17, 260);
  sh.getRange('H:H').setWrap(true);
  sh.getRange('A:B').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('O2:O').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  var g = sh.getRange('G2:G'), o = sh.getRange('O2:O');
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Needs changes').setBackground('#fbefd9').setRanges([g]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Something is missing').setBackground('#fbe5e3').setRanges([g]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Works as needed').setBackground('#e3f3e9').setRanges([g]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('New').setFontColor('#1a3f8f').setBold(true).setRanges([o]).build(),
  ]);
  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).createFilter();
}

function buildSummary_(ss) {
  var sum = ss.getSheetByName(SUMMARY_NAME) || ss.insertSheet(SUMMARY_NAME);
  sum.clear();
  sum.getRange('A1').setValue('Feedback by screen and rating').setFontWeight('bold');
  sum.getRange('A2').setFormula("=IFERROR(QUERY(Feedback!A:Q,\"select D, count(C) where C is not null group by D pivot G label D 'Screen'\",1),\"No feedback yet\")");
  sum.getRange('H1').setValue('Feedback by status').setFontWeight('bold');
  sum.getRange('H2').setFormula("=IFERROR(QUERY(Feedback!A:Q,\"select O, count(C) where C is not null group by O label O 'Status', count(C) 'Items'\",1),\"No feedback yet\")");
  sum.getRange('H12').setValue('Feedback by role').setFontWeight('bold');
  sum.getRange('H13').setFormula("=IFERROR(QUERY(Feedback!A:Q,\"select I, count(C) where C is not null group by I label I 'Viewed as', count(C) 'Items'\",1),\"No feedback yet\")");
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['exportXlsx', 'dailyDigest'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  if (CONFIG.XLSX_EXPORT) ScriptApp.newTrigger('exportXlsx').timeBased().everyHours(1).create();
  if (CONFIG.EMAIL_MODE === 'daily') ScriptApp.newTrigger('dailyDigest').timeBased().atHour(18).everyDays(1).create();
}

/* ===================================================================== web app */

/** Receives one feedback item as JSON text from the prototype. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var token = PROPS.getProperty('FEEDBACK_TOKEN') || '';
    if (token && data.token !== token) return json_({ ok: false, error: 'Invalid token' });
    if (!data.id || !data.screen) return json_({ ok: false, error: 'Missing id or screen' });

    lock.waitLock(10000);
    var ss = openSpreadsheet_();
    var sh = ss && ss.getSheetByName(SHEET_NAME);
    if (!sh) return json_({ ok: false, error: 'Run setup() first' });

    // Retries from the prototype must not create duplicates
    if (sh.getRange('C:C').createTextFinder(String(data.id)).matchEntireCell(true).findNext()) return json_({ ok: true, duplicate: true });

    var submitted = new Date(data.at);
    var row = [
      new Date(), isNaN(submitted) ? '' : submitted, clip_(data.id, 60), clip_(data.title, 120), clip_(data.screen, 40),
      clip_(data.requirements, 200), clip_(data.rating, 40), clip_(data.text, MAX_TEXT), clip_(data.viewedAs, 60),
      clip_(data.name, 80), clip_(data.dept, 120), clip_(data.session, 40), clip_(data.prototypeVersion, 40),
      clip_(data.browser, 180), 'New', '', ''
    ];
    sh.appendRow(row);
    var rowNo = sh.getLastRow();
    lock.releaseLock();

    if (CONFIG.EMAIL_MODE === 'each') {
      try { notify_(ss, sh, row, rowNo); } catch (mailErr) { console.error('Email failed: ' + mailErr); } // the row is saved even if email fails
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Open the web app URL in a browser to check it is live. */
function doGet() {
  return json_({ ok: true, service: 'FoS SIS prototype feedback', time: new Date().toISOString() });
}

/* ===================================================================== email */

function notify_(ss, sh, r, rowNo) {
  var link = ss.getUrl() + '#gid=' + sh.getSheetId() + '&range=A' + rowNo;
  var subject = '[SIS prototype] ' + r[6] + ' · ' + r[3] + (r[5] ? ' (' + r[5] + ')' : '');
  var body =
    '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
    tr_('Rating', '<b>' + esc_(r[6]) + '</b>') + tr_('Screen', esc_(r[3]) + ' <span style="color:#666">(' + esc_(r[4]) + ')</span>') +
    tr_('Requirements', esc_(r[5])) + tr_('Comment', esc_(r[7]).replace(/\n/g, '<br>')) +
    tr_('Viewed as', esc_(r[8])) + tr_('From', esc_(r[9] || 'Anonymous') + (r[10] ? ' · ' + esc_(r[10]) : '')) +
    tr_('Feedback ID', esc_(r[2])) + '</table>' +
    '<p><a href="' + link + '">Open this row in the spreadsheet</a></p>';
  MailApp.sendEmail({ to: CONFIG.NOTIFY_EMAIL, subject: subject.slice(0, 200), htmlBody: body, name: 'SIS prototype feedback' });
}

/** Daily digest (used when EMAIL_MODE = 'daily'): everything received in the last 24 hours. */
function dailyDigest() {
  var ss = openSpreadsheet_(); var sh = ss.getSheetByName(SHEET_NAME);
  if (sh.getLastRow() < 2) return;
  var since = new Date(Date.now() - 24 * 3600 * 1000);
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues().filter(function (r) { return r[0] instanceof Date && r[0] >= since; });
  if (!rows.length) return;
  var html = '<p>' + rows.length + ' new feedback item(s) in the last 24 hours.</p><table style="font-family:Arial,sans-serif;font-size:13px;border-collapse:collapse" border="1" cellpadding="6">' +
    '<tr><th>Rating</th><th>Screen</th><th>Requirements</th><th>Comment</th><th>From</th></tr>' +
    rows.map(function (r) { return '<tr><td>' + esc_(r[6]) + '</td><td>' + esc_(r[3]) + '</td><td>' + esc_(r[5]) + '</td><td>' + esc_(r[7]) + '</td><td>' + esc_(r[9] || 'Anonymous') + '</td></tr>'; }).join('') +
    '</table><p><a href="' + ss.getUrl() + '">Open the spreadsheet</a></p>';
  MailApp.sendEmail({ to: CONFIG.NOTIFY_EMAIL, subject: '[SIS prototype] Daily feedback digest: ' + rows.length + ' item(s)', htmlBody: html, name: 'SIS prototype feedback' });
}

/* ===================================================================== Excel copy */

/** Saves an .xlsx copy of the spreadsheet in the Drive folder. Runs hourly; skips when nothing changed. */
function exportXlsx(force) {
  var ss = openSpreadsheet_(); if (!ss) return;
  var rows = ss.getSheetByName(SHEET_NAME).getLastRow();
  if (force !== true && String(rows) === PROPS.getProperty('XLSX_ROWS')) return;
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob()
    .setName(CONFIG.FILE_NAME + '.xlsx');
  var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  var old = folder.getFilesByName(CONFIG.FILE_NAME + '.xlsx');
  while (old.hasNext()) old.next().setTrashed(true);
  folder.createFile(blob);
  PROPS.setProperty('XLSX_ROWS', String(rows));
}

/* ===================================================================== helpers */

function openSpreadsheet_() {
  var id = PROPS.getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : null;
}
/* Values starting with = + - @ are prefixed so the sheet never evaluates them as formulas. */
function clip_(v, n) { var s = String(v == null ? '' : v).slice(0, n); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function esc_(s) { return String(s == null ? '' : s).replace(/^'/, '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function tr_(k, v) { return '<tr><td style="padding:4px 12px 4px 0;color:#566475;vertical-align:top">' + k + '</td><td style="padding:4px 0">' + v + '</td></tr>'; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
