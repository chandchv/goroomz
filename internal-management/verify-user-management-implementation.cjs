/**
 * Verification Script for Internal User Management UI Implementation
 * 
 * This script verifies that all required components, routes, and services
 * are properly implemented and accessible.
 */

const fs = require('fs');
const path = require('path');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    results.passed.push(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    results.failed.push(`❌ ${description}: ${filePath} NOT FOUND`);
    return false;
  }
}

function checkFileContains(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(searchString)) {
      results.passed.push(`✅ ${description}`);
      return true;
    } else {
      results.failed.push(`❌ ${description} - String not found: "${searchString}"`);
      return false;
    }
  } else {
    results.failed.push(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

console.log('🔍 Verifying Internal User Management UI Implementation...\n');

// 1. Check Core Pages
console.log('📄 Checking Core Pages...');
checkFileExists('app/pages/InternalUserManagementPage.tsx', 'Internal User Management Page');
checkFileExists('app/pages/MyProfilePage.tsx', 'My Profile Page');

// 2. Check Core Components
console.log('\n🧩 Checking Core Components...');
checkFileExists('app/components/users/UserListView.tsx', 'User List View Component');
checkFileExists('app/components/users/UserCreationModal.tsx', 'User Creation Modal Component');
checkFileExists('app/components/users/UserEditModal.tsx', 'User Edit Modal Component');
checkFileExists('app/components/users/UserDetailView.tsx', 'User Detail View Component');
checkFileExists('app/components/users/DeactivateUserDialog.tsx', 'Deactivate User Dialog Component');
checkFileExists('app/components/users/ResetPasswordDialog.tsx', 'Reset Password Dialog Component');
checkFileExists('app/components/users/BulkImportModal.tsx', 'Bulk Import Modal Component');
checkFileExists('app/components/users/ExportDialog.tsx', 'Export Dialog Component');
checkFileExists('app/components/users/OnlineStatusIndicator.tsx', 'Online Status Indicator Component');
checkFileExists('app/components/users/TeamMemberDetailView.tsx', 'Team Member Detail View Component');

// 3. Check Loading and Error Components
console.log('\n⏳ Checking Loading and Error Components...');
checkFileExists('app/components/users/UserListSkeleton.tsx', 'User List Skeleton Component');
checkFileExists('app/components/users/ModalLoadingSkeleton.tsx', 'Modal Loading Skeleton Component');
checkFileExists('app/components/users/BulkOperationProgress.tsx', 'Bulk Operation Progress Component');
checkFileExists('app/components/users/ErrorDisplay.tsx', 'Error Display Component');

// 4. Check Services
console.log('\n🔧 Checking Services...');
checkFileExists('app/services/internalUserService.ts', 'Internal User Service');
checkFileContains('app/services/internalUserService.ts', 'getUsers', 'Service has getUsers method');
checkFileContains('app/services/internalUserService.ts', 'createUser', 'Service has createUser method');
checkFileContains('app/services/internalUserService.ts', 'updateUser', 'Service has updateUser method');
checkFileContains('app/services/internalUserService.ts', 'deactivateUser', 'Service has deactivateUser method');
checkFileContains('app/services/internalUserService.ts', 'bulkImport', 'Service has bulkImport method');
checkFileContains('app/services/internalUserService.ts', 'exportUsers', 'Service has exportUsers method');

// 5. Check Routes
console.log('\n🛣️  Checking Routes...');
checkFileExists('app/routes.ts', 'Routes Configuration File');
checkFileContains('app/routes.ts', 'internal-users', 'Route for internal-users exists');
checkFileContains('app/routes.ts', 'my-profile', 'Route for my-profile exists');
checkFileExists('app/routes/internal-users.tsx', 'Internal Users Route File');
checkFileExists('app/routes/internal-user-detail.tsx', 'Internal User Detail Route File');
checkFileExists('app/routes/my-profile.tsx', 'My Profile Route File');

// 6. Check Navigation Integration
console.log('\n🧭 Checking Navigation Integration...');
checkFileContains('app/components/InternalSidebar.tsx', 'Internal Users', 'Sidebar has Internal Users menu item');
checkFileContains('app/components/InternalSidebar.tsx', 'My Profile', 'Sidebar has My Profile menu item');
checkFileContains('app/components/InternalSidebar.tsx', 'My Team', 'Sidebar has My Team menu item');

// 7. Check Dashboard Integration
console.log('\n📊 Checking Dashboard Integration...');
checkFileContains('app/pages/SuperuserDashboardPage.tsx', 'Create User', 'Superuser Dashboard has Create User action');
checkFileContains('app/pages/SuperuserDashboardPage.tsx', 'Manage Users', 'Superuser Dashboard has Manage Users action');
checkFileContains('app/pages/PlatformAdminDashboardPage.tsx', 'Create Internal User', 'Platform Admin Dashboard has Create User action');
checkFileContains('app/pages/RegionalManagerDashboardPage.tsx', 'My Team', 'Regional Manager Dashboard has My Team section');
checkFileContains('app/pages/OperationsManagerDashboardPage.tsx', 'View Team', 'Operations Manager Dashboard has View Team section');

// 8. Check Permission Hooks
console.log('\n🔐 Checking Permission Hooks...');
checkFileExists('app/hooks/usePermissions.ts', 'usePermissions Hook');
checkFileContains('app/hooks/usePermissions.ts', 'canCreateUsers', 'Hook has canCreateUsers function');
checkFileContains('app/hooks/usePermissions.ts', 'canEditUsers', 'Hook has canEditUsers function');
checkFileContains('app/hooks/usePermissions.ts', 'canDeactivateUsers', 'Hook has canDeactivateUsers function');

// 9. Check Tests
console.log('\n🧪 Checking Tests...');
checkFileExists('app/components/users/__tests__/userCreation.test.ts', 'User Creation Tests');
checkFileExists('app/components/users/__tests__/userEditing.test.ts', 'User Editing Tests');
checkFileExists('app/components/users/__tests__/userDeactivation.test.ts', 'User Deactivation Tests');
checkFileExists('app/components/users/__tests__/bulkImportAndPermissions.test.ts', 'Bulk Import and Permissions Tests');

// 10. Check Build Output
console.log('\n🏗️  Checking Build Output...');
if (fs.existsSync(path.join(__dirname, 'build/client'))) {
  results.passed.push('✅ Build output exists');
  
  // Check if key routes are in build
  const manifestPath = path.join(__dirname, 'build/client/.vite/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const hasInternalUsersRoute = Object.keys(manifest).some(key => 
      key.includes('internal-users') || key.includes('InternalUserManagementPage')
    );
    
    if (hasInternalUsersRoute) {
      results.passed.push('✅ Internal Users routes are in build');
    } else {
      results.warnings.push('⚠️  Internal Users routes may not be in build manifest');
    }
  }
} else {
  results.warnings.push('⚠️  Build output not found - run npm run build first');
}

// Print Results
console.log('\n' + '='.repeat(80));
console.log('📋 VERIFICATION RESULTS');
console.log('='.repeat(80));

console.log(`\n✅ PASSED: ${results.passed.length}`);
results.passed.forEach(item => console.log(`  ${item}`));

if (results.warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach(item => console.log(`  ${item}`));
}

if (results.failed.length > 0) {
  console.log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach(item => console.log(`  ${item}`));
}

console.log('\n' + '='.repeat(80));
console.log(`TOTAL: ${results.passed.length} passed, ${results.warnings.length} warnings, ${results.failed.length} failed`);
console.log('='.repeat(80));

// Exit with appropriate code
if (results.failed.length > 0) {
  console.log('\n❌ Verification FAILED - Some required files or features are missing');
  process.exit(1);
} else if (results.warnings.length > 0) {
  console.log('\n⚠️  Verification PASSED with warnings');
  process.exit(0);
} else {
  console.log('\n✅ Verification PASSED - All required files and features are present');
  process.exit(0);
}
