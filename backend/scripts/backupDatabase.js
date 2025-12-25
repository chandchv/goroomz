const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { config } = require('../config/database');

(async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = config[env];
    
    // Get database connection details
    let dbHost, dbPort, dbName, dbUser, dbPassword;
    
    if (env === 'production' && process.env.DATABASE_URL) {
      // Parse DATABASE_URL for production
      const url = new URL(process.env.DATABASE_URL);
      dbHost = url.hostname;
      dbPort = url.port || 5432;
      dbName = url.pathname.slice(1); // Remove leading '/'
      dbUser = url.username;
      dbPassword = url.password;
    } else {
      // Use individual environment variables or defaults
      dbHost = dbConfig.host || process.env.DB_HOST || 'localhost';
      dbPort = dbConfig.port || process.env.DB_PORT || 5432;
      dbName = dbConfig.database || process.env.DB_NAME || 'goroomz';
      dbUser = dbConfig.username || process.env.DB_USER || 'postgres';
      dbPassword = dbConfig.password || process.env.DB_PASSWORD || 'password';
    }

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      console.log(`📁 Created backups directory: ${backupsDir}`);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `goroomz_backup_${timestamp}.sql`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    console.log('🔄 Starting database backup...');
    console.log(`📊 Database: ${dbName}`);
    console.log(`🖥️  Host: ${dbHost}:${dbPort}`);
    console.log(`👤 User: ${dbUser}`);
    console.log(`💾 Backup file: ${backupFilePath}`);

    // Set PGPASSWORD environment variable for pg_dump
    // This avoids password prompts
    const envVars = {
      ...process.env,
      PGPASSWORD: dbPassword
    };

    // Build pg_dump command
    const pgDumpCommand = `pg_dump -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" -F c -f "${backupFilePath}"`;
    
    // Alternative plain SQL format (uncomment if custom format doesn't work)
    // const pgDumpCommand = `pg_dump -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" > "${backupFilePath}"`;

    console.log('⏳ Running pg_dump...');
    
    exec(pgDumpCommand, { env: envVars }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup failed:', error.message);
        
        // Try plain SQL format as fallback
        console.log('🔄 Attempting plain SQL format backup...');
        const plainBackupPath = backupFilePath.replace('.sql', '_plain.sql');
        const plainPgDumpCommand = `pg_dump -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" > "${plainBackupPath}"`;
        
        exec(plainPgDumpCommand, { env: envVars }, (fallbackError, fallbackStdout, fallbackStderr) => {
          if (fallbackError) {
            console.error('❌ Plain SQL backup also failed:', fallbackError.message);
            console.error('📋 Error details:', fallbackStderr);
            console.log('\n💡 Troubleshooting tips:');
            console.log('   1. Ensure pg_dump is installed and in your PATH');
            console.log('   2. Verify database credentials in .env file');
            console.log('   3. Check if PostgreSQL server is running');
            console.log('   4. Ensure the database user has backup permissions');
            process.exitCode = 1;
            return;
          }
          
          console.log('✅ Backup completed successfully (plain SQL format)!');
          console.log(`📁 Backup saved to: ${plainBackupPath}`);
          
          // Get file size
          const stats = fs.statSync(plainBackupPath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`📊 Backup size: ${fileSizeMB} MB`);
        });
        return;
      }

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️  Warnings:', stderr);
      }

      console.log('✅ Backup completed successfully!');
      console.log(`📁 Backup saved to: ${backupFilePath}`);
      
      // Get file size
      const stats = fs.statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 Backup size: ${fileSizeMB} MB`);
      
      // Display restore instructions
      console.log('\n📖 To restore this backup, use:');
      console.log(`   pg_restore -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" "${backupFilePath}"`);
    });

  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    process.exitCode = 1;
  }
})();

