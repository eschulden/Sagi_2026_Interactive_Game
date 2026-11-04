/*
 * נתוני משחק "ציד צבעים". ערכו כאן את הצבעים.
 * color - אחד מהצבעים: red, orange, yellow, green, cyan, blue, purple, pink, brown, white, gray, black
 * hint  - (לא חובה) רעיון למה לצלם
 *
 * תמונה מתקבלת אם הצבע מכסה לפחות THRESHOLD אחוז ממנה,
 * או אם יש בה כתם אחד רצוף ובולט בצבע הזה שמכסה לפחות ACCENT_MIN אחוז (למשל פרח אדום אחד בתוך שיח ירוק).
 * כתם בולט לא נחשב בלבן, אפור, שחור וחום.
 * הבדיקה נעשית בטלפון עצמו.
 *
 * UPLOAD_URL - כתובת ה-Web App של Google Apps Script (apps-script/color-hunt). ההגדרה ב-README,
 *              בסעיף "ציד צבעים: שמירת התמונות ב-Google Drive". כל תמונה שמתקבלת נשלחת לתיקיית הצבע שלה,
 *              ובדף של כל צבע רואים את התמונות של הקבוצות האחרות. כל עוד הערך ריק, התמונות נשארות בטלפון בלבד.
 */
window.COLOR_HUNT = {
  intro: 'מצאו בשביל משהו בכל אחד מהצבעים וצלמו אותו. בחרו צבע, צלמו או בחרו תמונה, והאתר יבדוק אם הצבע באמת בתמונה. צבע שמצאתם יסומן בירוק, עם התמונות שלכם. אפשר להעלות כמה תמונות לכל צבע.',
  UPLOAD_URL: 'https://script.google.com/macros/s/AKfycbxqMOAYCTRL_y1rykBqa0PccRhperM4J869vxD8kM8zAalHwhEUNZsO1L4XjwwziXEZcA/exec',
  THRESHOLD: 20,
  ACCENT_MIN: 1,
  colors: [
    { color: 'red',    hint: 'פרח, פרי, סימון שביל אדום או משהו שמישהו מכם לובש.' },
    { color: 'orange', hint: 'פרח, פרי הדר או כובע של מישהו.' },
    { color: 'yellow', hint: 'פרחים צהובים בשדה, או החולצה של מישהו.' },
    { color: 'green',  hint: 'עלים, עשב או עץ - זה הקל!' },
    { color: 'blue',   hint: 'השמיים, מים או סימון שביל כחול.' },
    { color: 'purple', hint: 'פרח סגול, או משהו שמישהו מכם לובש.' },
    { color: 'pink',   hint: 'פרח ורוד, או משהו שמישהו מכם לובש.' },
    { color: 'white',  hint: 'ענן, פרח לבן או סלע בהיר.' },
    { color: 'brown',  hint: 'גזע עץ, אדמה או שביל עפר.' }
  ]
};
