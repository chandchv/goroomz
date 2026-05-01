/**
 * Internal Users Routes Unit Tests
 * 
 * Tests for internal user management routes.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

describe('Internal Users Routes', () => {
  let usersRouter;

  beforeAll(() => {
    // Set up test environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
    process.env.JWT_EXPIRE = '7d';
  });

  test('should export an Express router', () => {
    // Import the users router
    usersRouter = require('../../../routes/internal/users');
    
    // Verify it's a function (Express routers are functions)
    expect(typeof usersRouter).toBe('function');
    
    // Verify it has router properties
    expect(usersRouter.stack).toBeDefined();
  });

  test('should have GET /internal/users route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const getUsersRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users' && layer.route.methods.get
    );
    
    expect(getUsersRoute).toBeDefined();
  });

  test('should have POST /internal/users route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const postUsersRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users' && layer.route.methods.post
    );
    
    expect(postUsersRoute).toBeDefined();
  });

  test('should have GET /internal/users/:id route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const getUserRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users/:id' && layer.route.methods.get
    );
    
    expect(getUserRoute).toBeDefined();
  });

  test('should have PUT /internal/users/:id route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const putUserRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users/:id' && layer.route.methods.put
    );
    
    expect(putUserRoute).toBeDefined();
  });

  test('should have DELETE /internal/users/:id route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const deleteUserRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users/:id' && layer.route.methods.delete
    );
    
    expect(deleteUserRoute).toBeDefined();
  });

  test('should have GET /internal/users/:id/performance route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const performanceRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/users/:id/performance' && layer.route.methods.get
    );
    
    expect(performanceRoute).toBeDefined();
  });

  test('should have GET /internal/superuser/users/owners route', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const ownersRoute = usersRouter.stack.find(
      layer => layer.route && layer.route.path === '/internal/superuser/users/owners' && layer.route.methods.get
    );
    
    expect(ownersRoute).toBeDefined();
  });

  test('should have exactly 7 routes defined', () => {
    usersRouter = require('../../../routes/internal/users');
    
    const routes = usersRouter.stack.filter(layer => layer.route);
    expect(routes.length).toBe(7);
  });
});
