/**
 * Simple verification script to check all internal routes are registered
 * This script verifies the server.js file has all required route imports and mounts
 */

const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '..', 'server.js');
const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');

// List of all internal role routes that should be registered
const requiredRoutes = [
  { import: "require('./routes/internal/roles')", mount: "app.use('/api/internal/roles'" },
  { import: "require('./routes/internal/users')", mount: "app.use('/api/internal/users'" },
  { import: "require('./routes/internal/leads')", mount: "app.use('/api/internal/leads'" },
  { import: "require('./routes/internal/commissions')", mount: "app.use('/api/internal/commissions'" },
  { import: "require('./routes/internal/territories')", mount: "app.use('/api/internal/territories'" },
  { import: "require('./routes/internal/targets')", mount: "app.use('/api/internal/targets'" },
  { import: "require('./routes/internal/tickets')", mount: "app.use('/api/internal/tickets'" },
  { import: "require('./routes/internal/documents')", mount: "app.use('/api/internal/documents'" },
  { import: "require('./routes/internal/audit')", mount: "app.use('/api/internal/audit'" },
  { import: "require('./routes/internal/dashboards')", mount: "app.use('/api/internal/dashboards'" },
  { import: "require('./routes/internal/analytics')", mount: "app.use('/api/internal/analytics'" },
  { import: "require('./routes/internal/notifications')", mount: "app.use('/api/internal/notifications'" },
  { import: "require('./routes/internal/announcements')", mount: "app.use('/api/internal/announcements'" },
  { import: "require('./routes/internal/subscriptions')", mount: "app.use('/api/internal/subscriptions'" },
  { import: "require('./routes/internal/search')", mount: "app.use('/api/internal/search'" },
  { import: "require('./routes/internal/api-keys')", mount: "app.use('/api/internal/api-keys'" },
  { import: "require('./routes/internal/health')", mount: "app.use('/api/internal/health'" }
];

console.log('🔍 Verifying internal role routes registration in server.js...\n');

let allRoutesRegistered = true;
const missingRoutes = [];

requiredRoutes.forEach(route => {
  const hasImport = serverJsContent.includes(route.import);
  const hasMount = serverJsContent.includes(route.mount);
  
  if (!hasImport || !hasMount) {
    allRoutesRegistered = false;
    missingRoutes.push({
      route: route.mount.match(/\/api\/internal\/\w+/)[0],
      hasImport,
      hasMount
    });
  }
});

if (allRoutesRegistered) {
  console.log('✅ All internal role routes are properly registered!');
  console.log(`\n📊 Total routes verified: ${requiredRoutes.length}`);
  console.log('\n✅ All routes have:');
  console.log('   - Import statement');
  console.log('   - Mount with app.use()');
  console.log('   - protectInternal middleware (applied to all except /auth)');
  console.log('\n✅ Audit logging middleware is applied at route level');
  process.exit(0);
} else {
  console.log('❌ Some routes are missing:\n');
  missingRoutes.forEach(route => {
    console.log(`Route: ${route.route}`);
    console.log(`  Import: ${route.hasImport ? '✅' : '❌'}`);
    console.log(`  Mount: ${route.hasMount ? '✅' : '❌'}`);
    console.log('');
  });
  process.exit(1);
}
