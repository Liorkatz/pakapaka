# pakapaka

אפליקציית PWA בעברית לניהול פקעות וברקודים.

## גרסה 1.03

- לחיצה על פקעה משותפת שומרת אותה למקומי במקום לפתוח ברקוד.
- בזמן שמירה ממשותף למקומי ניתן לשנות את שם הפקעה.
- פקעה מקומית מציגה מונה: `נפתחה X פעמים`.
- כל פתיחה של ברקוד מקומי מעלה את המונה ב־1.
- תג הגרסה מוצג בשורה רגילה מעל הכותרת בצד ימין.
- הקוד מפוצל לקבצים קטנים תחת `css/` ו־`js/`.
- `index.html` הוא קובץ טעינה קצר ונקי.
- `sw.js` הוא Service Worker מינימלי.
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

Deploy trigger: 1.03 clean run
