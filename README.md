# לזכרו של שגיא - אתר אינטראקטיבי

אתר סטטי בעברית (HTML/CSS/JS בלבד, בלי build) שרץ ישירות על GitHub Pages.

## מבנה
| קובץ | תפקיד |
|---|---|
| `index.html` | דף הבית (הכרטיסים נוצרים אוטומטית) |
| `game.html` + `data/game-data.js` | משחק המסע בישראל. ערכו תחנות ושאלות בקובץ הנתונים |
| `photo-gallery.html` + `photo-hunt.html` + `data/photo-hunt-data.js` | משחק "איפה צילמתי?" לפי GPS: הגלריה מציגה את כל התמונות, ו-`photo-hunt.html?photo=N` משחק תמונה אחת. למיקום של כל תמונה פתחו `photo-hunt.html?setup` בנקודה עצמה |
| `quiz.html` + `data/quiz-data.js` | שאלות על שגיא. ערכו שאלות בקובץ הנתונים |
| `js/site.js` | התפריט ורשימת הדפים |
| `page-template.html` | תבנית לדף חדש |
| `images/` | תמונות (למשל `images/sagi.jpg` לדף הבית) |

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
`memory-add.html` שולח החלטה ל-Google Form, ו-`memories.html` מציג את מה שבגיליון. ההגדרה ב-`data/memories-config.js`.

1. ב-Google Forms צרו טופס עם שני שדות טקסט: "שם" ו"החלטה". בלשונית Responses לחצו Link to Sheets.
2. כתובת השליחה: ב-Form לחצו Send ← קישור, והחליפו בסוף `viewform` ב-`formResponse`. הדביקו ב-`FORM_URL`.
3. מזהי השדות: Get pre-filled link, מלאו ערכים, ובכתובת שנוצרה חפשו `entry.123456`. הדביקו ב-`FIELD_NAME` וב-`FIELD_TEXT`.
4. בגיליון: Share ← General access ← Anyone with the link (Viewer). מזהה הגיליון (החלק שבין `/d/` ל-`/edit`) הולך ל-`SHEET_ID`.
5. סדר העמודות בגיליון חייב להיות: חותמת זמן, שם, החלטה.

הערות: כל מי שיש לו את קישור הגיליון רואה אותו. אין אישור לפני הצגה, כל החלטה שנשלחת מופיעה. למחיקה, מחקו את השורה בגיליון.
