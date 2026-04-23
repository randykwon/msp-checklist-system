#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'msp-assessment.db');
const db = new Database(dbPath);

const users = [
  { email: 'admin@test.com', password: 'admin123', name: 'Test Admin', role: 'admin' },
  { email: 'user@test.com', password: 'user1234', name: 'Test User', role: 'user' },
];

const stmt = db.prepare(
  `INSERT OR IGNORE INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, 'active')`
);

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  const result = stmt.run(u.email, hash, u.name, u.role);
  if (result.changes > 0) {
    console.log(`✅ Created: ${u.email} (${u.role}) — password: ${u.password}`);
  } else {
    console.log(`⏭️  Already exists: ${u.email}`);
  }
}

db.close();
console.log('\nDone.');
