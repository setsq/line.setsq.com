#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const migrationFile = path.join(__dirname, '..', 'migrations', '001_create_webhook_events.sql');

const command = `PGPASSWORD="${process.env.DB_PASSWORD}" psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f "${migrationFile}"`;

console.log('Running database migration...');
console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Migration failed:', error.message);
    if (stderr) console.error('Error details:', stderr);
    process.exit(1);
  }
  
  if (stdout) console.log('Migration output:', stdout);
  if (stderr) console.log('Migration warnings:', stderr);
  
  console.log('Migration completed successfully!');
});