const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Allow all origins so the frontend can be hosted anywhere (Netlify, Vercel, etc.)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { drafts: [], reports: [] };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw) return { drafts: [], reports: [] };
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data file:', err);
    return { drafts: [], reports: [] };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

// Drafts
app.get('/api/drafts', (req, res) => {
  const data = readData();
  res.json(data.drafts || []);
});

app.post('/api/drafts', (req, res) => {
  const draft = req.body;
  if (!draft || !draft.id) {
    return res.status(400).json({ error: 'Draft must include an id' });
  }
  const data = readData();
  const existingIndex = data.drafts.findIndex(d => d.id === draft.id);
  if (existingIndex >= 0) {
    data.drafts[existingIndex] = draft;
  } else {
    data.drafts.push(draft);
  }
  writeData(data);
  res.json(data.drafts);
});

app.delete('/api/drafts/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  data.drafts = data.drafts.filter(d => d.id !== id);
  writeData(data);
  res.json(data.drafts);
});

// Reports
app.get('/api/reports', (req, res) => {
  const data = readData();
  res.json(data.reports || []);
});

app.post('/api/reports', (req, res) => {
  const report = req.body;
  if (!report || !report.id) {
    return res.status(400).json({ error: 'Report must include an id' });
  }
  const data = readData();
  const existingIndex = data.reports.findIndex(r => r.id === report.id);
  if (existingIndex >= 0) {
    data.reports[existingIndex] = report;
  } else {
    data.reports.push(report);
  }
  writeData(data);
  res.json(data.reports);
});

app.delete('/api/reports/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  data.reports = data.reports.filter(r => r.id !== id);
  writeData(data);
  res.json(data.reports);
});

app.listen(PORT, () => {
  console.log(`CAP backend server listening on http://localhost:${PORT}`);
});
