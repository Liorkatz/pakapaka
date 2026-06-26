# pakapaka

אפליקציית PWA בעברית לניהול פקעות וברקודים.

## גרסה 1.02

- תג הגרסה עבר לצד ימין.
- הקוד פוצל לקבצים קטנים תחת `css/` ו־`js/`.
- `index.html` הפך לקובץ טעינה קצר ונקי.
- `sw.js` הוקטן ל־Service Worker מינימלי.
- רענון ידני בכפתור.
- רענון במשיכה למטה במסך הבית.
- שמירה מקומית במכשיר.
- שמירה משותפת דרך Supabase.
- מועדפים מקומיים ומועדפים לרשימה המשותפת.
- נקודת חיווי כשיש פריט חדש במשותף.
- טוסט קצר אחרי רענון.
- ברקוד במבנה: 8 ספרות + 0000 + סיומת 3 ספרות.
- תמיכה בהדבקת ברקוד מלא של 15 ספרות ופיצול אוטומטי.
- GitHub Pages workflow לפריסה סטטית.

## מבנה קבצים

```text
index.html
css/main.css
js/config.js
js/utils.js
js/storage.js
js/barcode.js
js/shared.js
js/app.js
js/pwa-enhance.js
sw.js
manifest.webmanifest
```
