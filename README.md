# לזכרו של שגיא - אתר אינטראקטיבי

אתר סטטי בעברית (HTML/CSS/JS בלבד, בלי build) שרץ ישירות על GitHub Pages.

## מבנה
| קובץ | תפקיד |
|---|---|
| `index.html` | דף הבית (הכרטיסים נוצרים אוטומטית) |
| `photo-gallery.html` + `photo-hunt.html` + `data/photo-hunt-data.js` | משחק "איפה צילמתי?" לפי GPS: הגלריה מציגה את כל התמונות, ו-`photo-hunt.html?photo=N` משחק תמונה אחת. למיקום של כל תמונה פתחו `photo-hunt.html?setup` בנקודה עצמה |
| `color-hunt.html` + `data/color-hunt-data.js` | משחק "ציד צבעים": מצלמים משהו בכל צבע, והדף בודק בטלפון עצמו שהצבע מכסה לפחות 20% מהתמונה או מופיע בה ככתם בולט אחד. אפשר להעלות כמה תמונות לכל צבע (עד 8), והן מוצגות בדף של הצבע. תמונות שמתקבלות נשמרות גם ב-Google Drive, ובדף של כל צבע רואים את התמונות של הקבוצות האחרות (ראו "ציד צבעים: שמירת התמונות ב-Google Drive") |
| `sagi-quiz.html` + `data/sagi-quiz-data.js` | שאלות על שגיא. ערכו שאלות בקובץ הנתונים |
| `login.html` | כניסה: בוחרים שם קבוצה. נשמר בדפדפן, מופיע בראש כל דף, בסיום המשחקים, בסיכום, וממולא אוטומטית בשם בטופס "קחו החלטה" בעמוד ההחלטות הטובות. כל דף (חוץ מ-`sagi.html` ו-`about.html`) מפנה לכאן אם עוד אין שם, וחוזר לדף המקורי אחרי הכניסה. לחיצה על שם הקבוצה בראש הדף מאפשרת לשנות אותו |
| `js/site.js` | התפריט, רשימת הדפים ושם הקבוצה (`Group`) |
| `page-template.html` | תבנית לדף חדש |
| `images/` | תמונות (`images/sagi/` לדפי שגיא, `images/photo-hunt/` למשחק "איפה צילמתי?") |

## הוספת דף חדש
1. העתיקו את `page-template.html` ל-`photos.html` (או כל שם אחר) וערכו את התוכן.
2. הוסיפו שורה ל-`PAGES` בקובץ `js/site.js`:
   ```js
   { file: 'photos.html', title: 'תמונות', icon: '📷', desc: 'אלבום תמונות.' },
   ```
התפריט וכרטיסי דף הבית מתעדכנים לבד.

## הרצה מקומית
פתחו את `index.html` בדפדפן, או: `python -m http.server` ואז http://localhost:8000

## פרסום ב-GitHub Pages
1. צרו repository חדש ודחפו אליו את התיקייה.
2. Settings > Pages > Source: `Deploy from a branch`, branch `main`, תיקייה `/ (root)`.
3. האתר יעלה בכתובת `https://<user>.github.io/<repo>/`.

כל הנתיבים יחסיים, ולכן האתר עובד גם בתת-כתובת.

## החלטות טובות (Google Sheets)
`decisions.html` מציג את מה שבגיליון, והכפתור "קחו החלטה" פותח כרטיס עם טופס ששולח ל-Google Form (`decisions.html#add` פותח אותו ישר). ההגדרה ב-`data/decisions-config.js`.

1. ב-Google Forms צרו טופס עם שני שדות טקסט: "שם" ו"החלטה". בלשונית Responses לחצו Link to Sheets.
2. כתובת השליחה: ב-Form לחצו Send ← קישור, והחליפו בסוף `viewform` ב-`formResponse`. הדביקו ב-`FORM_URL`.
3. מזהי השדות: Get pre-filled link, מלאו ערכים, ובכתובת שנוצרה חפשו `entry.123456`. הדביקו ב-`FIELD_NAME` וב-`FIELD_TEXT`.
4. בגיליון: Share ← General access ← Anyone with the link (Viewer). מזהה הגיליון (החלק שבין `/d/` ל-`/edit`) הולך ל-`SHEET_ID`.
5. סדר העמודות בגיליון חייב להיות: חותמת זמן, שם, החלטה.

הערות: כל מי שיש לו את קישור הגיליון רואה אותו. אין אישור לפני הצגה, כל החלטה שנשלחת מופיעה. למחיקה, מחקו את השורה בגיליון.

## ציד צבעים: שמירת התמונות ב-Google Drive
כל תמונה שמתקבלת נשלחת לתיקייה של הצבע שלה (Red, Blue, Green וכו'), ותמונה שקבוצה מוחקת נמחקת גם משם. בדף של כל צבע רואים את התמונות של הקבוצות האחרות עם שם הקבוצה, מהחדשה לישנה, 12 בכל פעם.

GitHub Pages לא יכול לכתוב ל-Drive בעצמו, ולכן יש סקריפט קטן ב-Google Apps Script (`apps-script/color-hunt/`). הוא רץ אצל Google תחת החשבון שלכם, בחינם, ולא צריך שרת.

**הרשאות:** לסקריפט יש גישה רק לתיקיות ולקבצים שהוא עצמו יצר (`drive.file`). שאר ה-Drive שלכם לא נגיש לו. לכן הסקריפט יוצר את תיקיות הצבעים, ואתם מעבירים אותן לתיקייה המשותפת.

### הקמה (פעם אחת)
1. היכנסו ל-[script.google.com](https://script.google.com) עם החשבון של התיקייה המשותפת, ולחצו **New project**. תנו לו שם, למשל "ציד צבעים".
2. ב-**Project Settings** (גלגל השיניים) סמנו **Show "appsscript.json" manifest file in editor**.
3. חזרו ל-**Editor**. החליפו את כל התוכן של `appsscript.json` בתוכן של `apps-script/color-hunt/appsscript.json`, ואת `Code.gs` בתוכן של `apps-script/color-hunt/Code.gs`. שמרו (Ctrl+S).
   אם ב-`setup` מופיעה השגיאה "Google Drive API has not been used in project": בתפריט הצד לחצו **+** ליד **Services**, בחרו **Drive API** ולחצו **Add**, ואז הריצו שוב.
4. בתפריט הפונקציות למעלה בחרו `setup` ולחצו **Run**. יופיע חלון הרשאות: **Review permissions** ← בחרו את החשבון ← "Google hasn't verified this app" ← **Advanced** ← **Go to ציד צבעים (unsafe)** ← **Allow**. ההרשאות שיופיעו: גישה רק לקבצים שהאפליקציה יוצרת, וחיבור לשירות חיצוני (ה-API של Drive).
5. ב-Execution log יופיעו קישורים ל-9 תיקיות צבע שנוצרו ב-My Drive. ב-Drive סמנו את כולן וגררו אותן לתיקייה המשותפת.
6. **Deploy** ← **New deployment** ← גלגל השיניים ← **Web app**. Execute as: **Me**. Who has access: **Anyone**. לחצו **Deploy** והעתיקו את ה-Web app URL (נגמר ב-`/exec`).
7. הדביקו את הכתובת ב-`UPLOAD_URL` בקובץ `data/color-hunt-data.js` ודחפו ל-GitHub.

### שינויים בהמשך
- שיניתם את `Code.gs`: **Deploy** ← **Manage deployments** ← עיפרון ← Version: **New version** ← **Deploy**. הכתובת נשארת אותה כתובת.
- הוספתם צבע ב-`data/color-hunt-data.js`: הוסיפו אותו גם ל-`IN_GAME` ב-`Code.gs`, הריצו שוב `setup`, והעבירו את התיקייה החדשה לתיקייה המשותפת.
- לביטול הגישה: [myaccount.google.com](https://myaccount.google.com) ← Security ← Third-party apps ← הסירו את "ציד צבעים", או מחקו את ה-deployment.

### הערות
- תמונה שקבוצה מוחקת עוברת לפח של Drive, ואפשר לשחזר אותה משם במשך 30 יום.
- כל תמונה שהועלתה פתוחה לצפייה למי שיש לו את הקישור, כדי שהקבוצות האחרות יוכלו לראות אותה.
- כל טלפון יכול למחוק רק את התמונות שהוא עצמו העלה.
- בלי קליטה, התמונות מחכות בטלפון (⏳) ועולות כשהקליטה חוזרת, בגודל קטן יותר. תמונות שעולות מיד נשלחות ברוחב של עד 1280 פיקסלים.
- מחקתם תמונה ידנית ב-Drive? הריצו בעורך הסקריפט את `cleanup` (בתפריט הפונקציות ← Run), והיא תוסר גם מהאתר. הסקריפט שומר פרטים על כ-2,500 תמונות לכל היותר.
