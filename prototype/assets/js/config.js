/* Prototype settings. Edit this file after deploying the Google Sheet script (see feedback-sheet/README.md).
   Leave feedbackEndpoint empty to keep feedback in the browser only (staff then export and email it). */
window.SIS_PROTO_CONFIG = {
  version: "prototype v0.1",
  // Web app URL from Apps Script: Deploy > New deployment > Web app. It ends in /exec
  feedbackEndpoint: "",
  // Must match FEEDBACK_TOKEN in the Apps Script project's Script properties. It only filters casual spam: anyone can read it in the page source.
  feedbackToken: "",
};
