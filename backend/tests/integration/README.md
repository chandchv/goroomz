# Integration Tests

## Overview

This directory contains integration tests for the Internal Management System. These tests validate complete workflows and interactions between multiple components.

## Test Files

### criticalFlows.integration.test.js

Comprehensive integration tests covering the three most critical workflows:

1. **Complete Booking Flow** (Requirements 8.1-9.5)
   - Create offline booking
   - Check-in with security deposit
   - Record payment
   - Check-out with deposit refund
   - Partial refund with deductions

2. **Payment Recording and Tracking** (Requirements 20.1-22.5)
   - Payment schedule creation for PG bookings
   - Recording payments and updating schedules
   - Partial payment tracking
   - Overdue payment detection

3. **Room Status Updates and Housekeeping** (Requirements 7.1-7.5, 13.1-13.5)
   - Room status lifecycle (vacant_clean → occupied → vacant_dirty → vacant_clean)
   - Housekeeping log creation
   - Cleaning history tracking

## Running Tests

```bash
# Run all integration tests
npm test -- tests/integration/

# Run specific test file
npm test -- tests/integration/criticalFlows.integration.test.js

# Run with coverage
npm test -- --coverage tests/integration/
```

## Test Architecture

- **In-memory SQLite database**: Tests use an isolated in-memory database for fast execution
- **Clean state**: Each test starts with a clean database state
- **Minimal models**: Tests define only the models needed for the specific workflows
- **No external dependencies**: Tests don't require a running server or external services

## Test Results

All 8 integration tests pass successfully:
- ✓ Complete flow: booking → check-in → payment → check-out
- ✓ Check-out with partial security deposit refund
- ✓ Payment schedule creation for PG booking
- ✓ Record payment and update schedule status
- ✓ Partial payment tracking
- ✓ Overdue payment detection
- ✓ Room status flow: vacant_clean → occupied → vacant_dirty → vacant_clean
- ✓ Housekeeping history tracking

## Optional: End-to-End Tests

End-to-end tests (marked as optional in the task list) would test complete user journeys through the actual UI using tools like Playwright or Cypress. These would include:

### Recommended E2E Test Scenarios

1. **Property Owner Journey**
   - Login as property owner
   - View dashboard with KPIs
   - Navigate to floor view
   - Create offline booking
   - Check-in guest
   - Record payment
   - Check-out guest
   - View reports

2. **Staff Role Testing**
   - Login as front desk staff
   - Verify limited access (no reports, no staff management)
   - Perform check-in/check-out
   - Record payments

3. **Housekeeping Staff Journey**
   - Login as housekeeping staff
   - View pending cleaning tasks
   - Mark rooms as clean
   - Verify room status updates

4. **Offline Functionality**
   - Disconnect from network
   - Make changes (update room status, record payment)
   - Verify changes queued
   - Reconnect to network
   - Verify automatic synchronization

### E2E Test Setup (if implementing)

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Or install Cypress
npm install --save-dev cypress

# Create test directory
mkdir -p e2e/tests

# Run E2E tests
npx playwright test
# or
npx cypress open
```

### E2E Test Structure

```javascript
// e2e/tests/booking-flow.spec.js
test('Complete booking flow as property owner', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3001/login');
  await page.fill('[name="email"]', 'owner@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to bookings
  await page.click('text=Bookings');
  
  // Create booking
  await page.click('text=Create Booking');
  // ... fill form and submit
  
  // Check-in
  await page.click('text=Check In');
  // ... complete check-in
  
  // Verify room status changed
  await page.goto('http://localhost:3001/rooms');
  await expect(page.locator('.room-101')).toHaveClass(/occupied/);
});
```

## Coverage

The integration tests provide comprehensive coverage of:
- ✓ Data model interactions
- ✓ Business logic workflows
- ✓ State transitions
- ✓ Data integrity constraints
- ✓ Multi-step processes

For UI-level testing and cross-browser compatibility, implement the optional E2E tests described above.
