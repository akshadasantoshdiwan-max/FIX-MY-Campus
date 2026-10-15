const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'reports.json');

for (const dir of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  }
});

function readReports() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return []; }
}
function writeReports(reports) {
  fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), 'utf8');
}
function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}
function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_KEY || 'change-this-admin-key';
  if (!req.get('x-admin-key') || req.get('x-admin-key') !== expected) {
    return res.status(401).json({ error: 'Invalid admin key.' });
  }
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'FixMyCampus API' }));

app.get('/api/reports', (req, res) => {
  let reports = readReports();
  const search = clean(req.query.search, 100).toLowerCase();
  const status = clean(req.query.status, 30);
  if (status) reports = reports.filter(r => r.status === status);
  if (search) reports = reports.filter(r =>
    [r.id, r.name, r.category, r.location, r.description].some(v => String(v).toLowerCase().includes(search))
  );
  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ reports, stats: {
    total: readReports().length,
    inProgress: readReports().filter(r => r.status === 'In Progress').length,
    resolved: readReports().filter(r => r.status === 'Resolved').length
  }});
});

app.post('/api/reports', upload.single('photo'), (req, res) => {
  const name = clean(req.body.name, 100);
  const category = clean(req.body.category, 60);
  const location = clean(req.body.location, 160);
  const description = clean(req.body.description, 2000);
  if (!name || !category || !location || !description) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Name, category, location and description are required.' });
  }
  const reports = readReports();
  const report = {
    id: `FMC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    name, category, location, description,
    status: 'Submitted',
    photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
    updates: [{ status: 'Submitted', note: 'Complaint received.', at: new Date().toISOString() }]
  };
  reports.push(report);
  writeReports(reports);
  res.status(201).json({ report, message: 'Complaint submitted successfully.' });
});

app.get('/api/reports/:id', (req, res) => {
  const report = readReports().find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json({ report });
});

app.patch('/api/reports/:id/status', adminOnly, (req, res) => {
  const allowed = ['Submitted', 'In Progress', 'Resolved', 'Rejected'];
  const status = clean(req.body.status, 30);
  const note = clean(req.body.note, 500);
  if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}.` });
  const reports = readReports();
  const report = reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  report.status = status;
  report.updates = report.updates || [];
  report.updates.push({ status, note: note || `Status changed to ${status}.`, at: new Date().toISOString() });
  writeReports(reports);
  res.json({ report, message: 'Report status updated.' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image must be 5 MB or smaller.' });
  }
  res.status(400).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`FixMyCampus is running at http://localhost:${PORT}`);
  console.log(`Admin API key: ${process.env.ADMIN_KEY || 'change-this-admin-key (change before deployment)'}`);
});
