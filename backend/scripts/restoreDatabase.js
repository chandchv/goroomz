const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

const { config } = require('../config/database');

// Helper function to prompt for confirmation
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Helper function to list available backups
function listBackups(backupsDir) {
  if (!fs.existsSync(backupsDir)) {
    console.log('❌ Backups directory does not exist.');
    return [];
  }

  const files = fs.readdirSync(backupsDir)
    .filter(file => file.endsWith('.sql') && file.startsWith('goroomz_backup_'))
    .map(file => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      return {
        name: file,
        path: filePath,
        size: fileSizeMB,
        date: stats.mtime
      };
    })
    .sort((a, b) => b.date - a.date); // Sort by date, newest first

  return files;
}

// Helper function to detect backup format
function detectBackupFormat(backupPath) {
  // Read first few bytes to check if it's custom format (starts with binary header)
  const buffer = fs.readFileSync(backupPath, { start: 0, end: 10 });
  const header = buffer.toString('ascii');
  
  // Custom format starts with "PGDMP" signature
  if (header.startsWith('PGDMP')) {
    return 'custom';
  }
  
  // Plain SQL format starts with -- (comment) or SQL commands
  return 'plain';
}

// Helper function to execute command and return promise
function execPromise(command, envVars) {
  return new Promise((resolve, reject) => {
    exec(command, { env: envVars }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

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

    // Get backup file path from command line argument
    let backupFilePath = process.argv[2];

    // If no backup file specified, list available backups
    const backupsDir = path.join(__dirname, '..', 'backups');
    const availableBackups = listBackups(backupsDir);

    if (!backupFilePath) {
      if (availableBackups.length === 0) {
        console.log('❌ No backup files found in:', backupsDir);
        console.log('💡 Usage: node scripts/restoreDatabase.js <backup-file-path>');
        process.exit(1);
      }

      console.log('\n📋 Available backups:');
      console.log('━'.repeat(70));
      availableBackups.forEach((backup, index) => {
        const dateStr = backup.date.toLocaleString();
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Size: ${backup.size} MB | Date: ${dateStr}`);
        console.log(`   Path: ${backup.path}\n`);
      });
      console.log('━'.repeat(70));

      const answer = await askQuestion(
        `\nSelect backup number (1-${availableBackups.length}) or enter full path to backup file: `
      );

      const selectedIndex = parseInt(answer);
      if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= availableBackups.length) {
        backupFilePath = availableBackups[selectedIndex - 1].path;
      } else if (answer.trim()) {
        backupFilePath = answer.trim();
        // If relative path, make it relative to backups directory
        if (!path.isAbsolute(backupFilePath)) {
          backupFilePath = path.join(backupsDir, backupFilePath);
        }
      } else {
        console.log('❌ No backup file selected.');
        process.exit(1);
      }
    } else {
      // If relative path, make it relative to backups directory
      if (!path.isAbsolute(backupFilePath)) {
        backupFilePath = path.join(backupsDir, backupFilePath);
      }
    }

    // Verify backup file exists
    if (!fs.existsSync(backupFilePath)) {
      console.error(`❌ Backup file not found: ${backupFilePath}`);
      process.exit(1);
    }

    // Get backup file info
    const stats = fs.statSync(backupFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const backupFormat = detectBackupFormat(backupFilePath);

    console.log('\n⚠️  WARNING: This will replace ALL data in the database!');
    console.log('━'.repeat(70));
    console.log(`📊 Database: ${dbName}`);
    console.log(`🖥️  Host: ${dbHost}:${dbPort}`);
    console.log(`👤 User: ${dbUser}`);
    console.log(`💾 Backup file: ${backupFilePath}`);
    console.log(`📏 File size: ${fileSizeMB} MB`);
    console.log(`📦 Format: ${backupFormat} (${backupFormat === 'custom' ? 'binary' : 'plain SQL'})`);
    console.log('━'.repeat(70));

    const confirm = await askQuestion('\n⚠️  Are you sure you want to proceed? Type "yes" to continue: ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Restore cancelled.');
      process.exit(0);
    }

    // Set PGPASSWORD environment variable
    const envVars = {
      ...process.env,
      PGPASSWORD: dbPassword
    };

    console.log('\n🔄 Starting database restore...');

    try {
      if (backupFormat === 'custom') {
        // Use pg_restore for custom format
        console.log('⏳ Running pg_restore (custom format)...');
        
        // First, drop existing connections (optional but helpful)
        const dropConnectionsCommand = `psql -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;
        
        try {
          await execPromise(dropConnectionsCommand, envVars);
        } catch (err) {
          // Ignore errors from dropping connections
          console.log('⚠️  Could not drop existing connections (this is usually fine)');
        }

        // Restore with clean option to drop existing objects first
        const restoreCommand = `pg_restore -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" --clean --if-exists --verbose "${backupFilePath}"`;
        
        const result = await execPromise(restoreCommand, envVars);
        
        if (result.stderr && !result.stderr.includes('NOTICE')) {
          console.warn('⚠️  Warnings during restore:', result.stderr);
        }
      } else {
        // Use psql for plain SQL format
        console.log('⏳ Running psql (plain SQL format)...');
        
        const restoreCommand = `psql -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" -f "${backupFilePath}"`;
        
        const result = await execPromise(restoreCommand, envVars);
        
        if (result.stderr && !result.stderr.includes('NOTICE')) {
          console.warn('⚠️  Warnings during restore:', result.stderr);
        }
      }

      console.log('✅ Database restore completed successfully!');
      console.log(`📊 Database "${dbName}" has been restored from: ${path.basename(backupFilePath)}`);

    } catch (restoreError) {
      console.error('\n❌ Restore failed:', restoreError.error?.message || restoreError.message);
      
      if (restoreError.stderr) {
        console.error('📋 Error details:', restoreError.stderr);
      }

      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Ensure pg_restore/psql is installed and in your PATH');
      console.log('   2. Verify database credentials in .env file');
      console.log('   3. Check if PostgreSQL server is running');
      console.log('   4. Ensure the database exists');
      console.log('   5. Check that the database user has restore permissions');
      console.log('   6. Make sure no active connections are using the database');
      
      process.exitCode = 1;
      return;
    }

  } catch (error) {
    console.error('❌ Failed to restore database:', error);
    process.exitCode = 1;
  }
})();

