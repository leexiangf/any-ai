# Badge outreach kit

Goal: get **README badges** linking back to host-market listing pages (search × 分发飞轮).

| File | Role |
| --- | --- |
| `TEMPLATES.md` | Reusable Issue + email skeletons |
| `listings.json` | All shop listings + badge markdown |
| `DRAFTS.md` | Personalized copy per unique GitHub source |
| `drafts.json` | Same data for scripting |
| `TRACKING.csv` | Send status spreadsheet |

```bash
node scripts/badge-outreach/extract-listings.mjs
node scripts/badge-outreach/generate-drafts.mjs
```

Start with **Wave 1** rows in `TRACKING.csv` (open `issue_url`, paste body from `DRAFTS.md`).
