const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'db.json');

function emptyAppData() {
  return {
    patients: [],
    devices: [],
    assessments: [],
    prescriptions: [],
    records: [],
    reports: [],
    storage: [],
    tasks: [],
    consents: [],
    auditEvents: [],
    aiRuns: [],
    outbox: [],
    syncConflicts: [],
    engagement: { streak: 0, lastCheckIn: '', totalCheckIns: 0, planDate: '', planDone: [] }
  };
}

const initialAppData = emptyAppData();

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    writeDb({
      users: [],
      appData: {},
      deletionRequests: []
    });
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  initialAppData,
  readDb,
  writeDb,
  publicUser
};
