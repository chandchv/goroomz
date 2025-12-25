/**
 * Create Superuser Script
 * Similar to Django's createsuperuser command
 * 
 * Usage:
 *   node scripts/createSuperuser.js
 * 
 * This script creates an admin/superuser account with full permissions
 * to access the internal management system.
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function questionHidden(query) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char) => {
      char = char.toString('utf8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.clearLine();
            stdout.cursorTo(0);
            stdout.write(query + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

async function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return 'A user with this email already exists';
  }
  
  return null;
}

function validatePassword(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return null;
}

async function createSuperuser() {
  console.log('\n=== Create Superuser Account ===\n');
  console.log('This will create an admin account with full permissions.');
  console.log('You can use this account to log into the internal management system.\n');
  
  try {
    // Sync database
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    // Get user input
    let name, email, phone, password, passwordConfirm;
    let error;
    
    // Name
    do {
      name = await question('Full Name: ');
      if (!name.trim()) {
        console.log('❌ Name cannot be empty');
      }
    } while (!name.trim());
    
    // Email
    do {
      email = await question('Email: ');
      error = await validateEmail(email);
      if (error) {
        console.log(`❌ ${error}`);
      }
    } while (error);
    
    // Phone (optional)
    phone = await question('Phone (optional): ');
    
    // Password
    do {
      password = await questionHidden('Password: ');
      error = validatePassword(password);
      if (error) {
        console.log(`❌ ${error}`);
      }
    } while (error);
    
    // Confirm password
    do {
      passwordConfirm = await questionHidden('Confirm Password: ');
      if (password !== passwordConfirm) {
        console.log('❌ Passwords do not match');
      }
    } while (password !== passwordConfirm);
    
    console.log('\n');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create superuser with all permissions
    const superuser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      password: hashedPassword,
      role: 'admin',
      staffRole: 'manager',
      permissions: {
        canCheckIn: true,
        canCheckOut: true,
        canManageRooms: true,
        canRecordPayments: true,
        canViewReports: true,
        canManageStaff: true,
        canUpdateRoomStatus: true,
        canManageMaintenance: true
      }
    });
    
    console.log('✅ Superuser created successfully!\n');
    console.log('Account Details:');
    console.log(`  Name:  ${superuser.name}`);
    console.log(`  Email: ${superuser.email}`);
    console.log(`  Role:  ${superuser.role}`);
    console.log(`  ID:    ${superuser.id}\n`);
    console.log('You can now log in to the internal management system with these credentials.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating superuser:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Run the script
createSuperuser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
