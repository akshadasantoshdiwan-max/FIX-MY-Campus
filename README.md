# FixMyCampus

A complete starter web application for reporting and tracking campus maintenance issues.

## Included features

- Responsive frontend for desktop and mobile
- Report issue form with name, category, location, description and optional photo
- Backend API built with Node.js and Express
- JSON-file persistence (reports remain after server restarts)
- Recent reports, search and status filter
- Report IDs and report update history
- Basic admin interface to update a report's status
- Image upload validation (image files only, maximum 5 MB)

## Requirements

Install **Node.js 18 or newer**. npm is included with Node.js. Download it from https://nodejs.org/.

## Open in VS Code

1. Extract `FixMyCampus.zip` to a folder.
2. Open VS Code.
3. Select **File → Open Folder…** and choose the extracted `FixMyCampus` folder.
4. Open **Terminal → New Terminal**.
5. Install dependencies by running:

   ```bash
   npm install
   ```

6. Start the server:

   ```bash
   npm start
   ```

7. Open http://localhost:3000 in your browser.

Keep the terminal open while using the site. Press `Ctrl+C` in the terminal to stop the server.

## Admin demo

1. Click **Admin** in the site header.
2. For a local demo only, the default key is `change-this-admin-key`.
3. Enter a report ID from the Recent Reports list, select a status and submit.

Statuses: `Submitted`, `In Progress`, `Resolved`, `Rejected`.

### Change the admin key

The default key is only for local demonstration. Before sharing or deploying the project, set the `ADMIN_KEY` environment variable to a long, unique secret.

PowerShell example (only for the current terminal session):

```powershell
$env:ADMIN_KEY="replace-with-a-long-random-secret"
npm start
```

macOS/Linux example:

```bash
ADMIN_KEY="replace-with-a-long-random-secret" npm start
```

If you change the key, use the same value in the Admin dialog.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check if API is running |
| GET | `/api/reports` | List reports and summary counts |
| POST | `/api/reports` | Create a report (`multipart/form-data`) |
| GET | `/api/reports/:id` | Get a single report and update history |
| PATCH | `/api/reports/:id/status` | Update status; requires `x-admin-key` header |

### Example API request

```bash
curl http://localhost:3000/api/reports
```

## Where the data is stored

- Reports: `data/reports.json`
- Uploaded photos: `uploads/`

Back up these files if you want to preserve the data.

## Troubleshooting

- **`npm` is not recognized:** Install Node.js from https://nodejs.org/ and restart VS Code.
- **Port 3000 is busy:** On Windows PowerShell run `$env:PORT=3001; npm start`, then open http://localhost:3001.
- **`Cannot find module 'express'`:** Run `npm install` from the project root.
- **The page will not load:** Ensure `npm start` is still running and open the URL shown in the terminal.
- **Photo upload fails:** Use an image file under 5 MB.
- **Data doesn't appear on another computer:** This demo stores data on the server's local disk. It is not a hosted multi-user service.

## Important limitations

This is a learning/demo project, not a production-ready campus service. JSON-file storage is intended for small local demos. Before production deployment, add secure student/staff authentication, a database, authorization and rate limiting, robust file scanning, backups, HTTPS and privacy controls. The demo admin key is not a substitute for real authentication.
