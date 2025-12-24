const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path - use the main database
const dbPath = path.join(process.cwd(), '..', 'msp-assessment.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin password
    const result = db.prepare(`
      UPDATE users 
      SET password = ? 
      WHERE email = 'admin@msp.com'
    `).run(hashedPassword);
    
    if (result.changes > 0) {
      console.log('Admin password reset successfully!');
      console.log('Email: admin@msp.com');
      console.log('Password: admin123');
    } else {
      console.log('Admin user not found');
    }
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    db.close();
  }
}

resetAdminPassword();