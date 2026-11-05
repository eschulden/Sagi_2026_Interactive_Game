/*
 * חיבור ל-Google Sheets. ההגדרה מפורטת ב-README (סעיף "החלטות טובות").
 *
 * FORM_URL   = כתובת השליחה של הטופס. נראית כך:
 *              https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
 * FIELD_NAME / FIELD_TEXT = מזהי השדות בטופס (entry.123456789).
 * SHEET_ID   = המזהה של הגיליון (החלק שבין /d/ ל-/edit בכתובת). הגיליון צריך להיות
 *              משותף ל"כל מי שיש לו את הקישור" (Viewer). סדר העמודות: זמן, שם, החלטה.
 *
 * כל עוד הערכים ריקים, הדפים מציגים הודעה שהחיבור עדיין לא הוגדר.
 */
window.DECISIONS = {
  FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfs3N5F3ivdKc2SvnJiIMvqLxWZUChXZY6ESvsIV68duxWogw/formResponse',
  FIELD_NAME: 'entry.346449338',
  FIELD_TEXT: 'entry.1278560357',
  SHEET_ID: '1tRDjDEY79m9YEYRKKjrAd-oITGAwsi41ELLMpEQMzgs',
  MAX_TEXT: 1000,
  MAX_NAME: 60
};
