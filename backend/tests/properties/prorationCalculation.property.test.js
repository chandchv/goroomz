const fc = require('fast-check');
const { Subscription, User, Discount, sequelize } = require('../../models');

/**
 * Feature: internal-user-roles, Property 41: Proration calculation
 * Validates: Requirements 15.2
 * 
 * For any subscription upgrade, the prorated charge should be correctly calculated 
 * based on the remaining billing period
 */

describe('Property Test: Proration calculation', () => {

  // Generator for subscription data
  const subscriptionDataGenerator = () => fc.record({
    planName: fc.constantFrom('Basic Plan', 'Premium Plan', 'Enterprise Plan'),
    planType: fc.constantFrom('basic', 'premium', 'enterprise'),
    billingCycle: fc.constantFrom('monthly', 'quarterly', 'yearly'),
    amount: fc.float({ min: 100, max: 10000 }).map(n => Math.round(n * 100) / 100),
    currency: fc.constant('INR'),
    status: fc.constant('active'),
    startDate: fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2024-06-01').getTime() }).map(t => new Date(t)),
    autoRenew: fc.boolean(),
    features: fc.constant({
      maxRooms: 10,
      maxBookings: 100,
      advancedReports: false,
      prioritySupport: false
    })
  });

  // Generator for upgrade scenarios
  const upgradeScenarioGenerator = () => fc.record({
    newAmount: fc.float({ min: 100, max: 15000 }).map(n => Math.round(n * 100) / 100),
    upgradeDate: fc.integer({ min: new Date('2024-02-01').getTime(), max: new Date('2024-11-01').getTime() }).map(t => new Date(t))
  });

  test('proration calculation should be correct for any subscription upgrade', () => {
    return fc.assert(
      fc.property(
        subscriptionDataGenerator(),
        upgradeScenarioGenerator(),
        (subscriptionData, upgradeScenario) => {
          // Skip invalid inputs
          if (isNaN(subscriptionData.amount) || isNaN(upgradeScenario.newAmount) || 
              isNaN(subscriptionData.startDate.getTime()) || isNaN(upgradeScenario.upgradeDate.getTime())) {
            return true;
          }

          // Calculate end date based on billing cycle and start date
          const startDate = new Date(subscriptionData.startDate);
          let endDate = new Date(startDate);
          
          switch (subscriptionData.billingCycle) {
            case 'monthly':
              endDate.setMonth(endDate.getMonth() + 1);
              break;
            case 'quarterly':
              endDate.setMonth(endDate.getMonth() + 3);
              break;
            case 'yearly':
              endDate.setFullYear(endDate.getFullYear() + 1);
              break;
          }

          // Only test upgrades that happen within the billing period
          const upgradeDate = new Date(upgradeScenario.upgradeDate);
          if (upgradeDate <= startDate || upgradeDate >= endDate) {
            return true; // Skip invalid scenarios
          }

          // Create subscription instance (without saving to DB)
          const subscription = new Subscription({
            ...subscriptionData,
            endDate,
            nextBillingDate: endDate
          });

          // Calculate proration using the model method
          const calculatedProration = subscription.calculateProration(
            upgradeScenario.newAmount, 
            upgradeDate
          );

          // Manual calculation for verification
          const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          const remainingDays = Math.ceil((endDate - upgradeDate) / (1000 * 60 * 60 * 24));
          
          const currentDailyRate = subscription.amount / totalDays;
          const newDailyRate = upgradeScenario.newAmount / totalDays;
          const expectedProration = Math.max(0, (newDailyRate - currentDailyRate) * remainingDays);

          // Allow small floating point differences (within 0.01)
          const difference = Math.abs(calculatedProration - expectedProration);
          return difference < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('proration should be zero for downgrades', () => {
    return fc.assert(
      fc.property(
        subscriptionDataGenerator(),
        fc.float({ min: 50, max: 99 }).map(n => Math.round(n * 100) / 100), // Lower amount for downgrade
        fc.integer({ min: new Date('2024-02-01').getTime(), max: new Date('2024-11-01').getTime() }).map(t => new Date(t)),
        (subscriptionData, lowerAmount, upgradeDate) => {
          // Skip invalid inputs
          if (isNaN(lowerAmount) || isNaN(subscriptionData.amount) || isNaN(upgradeDate.getTime()) || isNaN(subscriptionData.startDate.getTime())) {
            return true;
          }

          // Ensure subscription amount is higher than the "upgrade" amount (making it a downgrade)
          if (subscriptionData.amount <= lowerAmount) {
            return true; // Skip if not a downgrade scenario
          }

          const startDate = new Date(subscriptionData.startDate);
          let endDate = new Date(startDate);
          
          switch (subscriptionData.billingCycle) {
            case 'monthly':
              endDate.setMonth(endDate.getMonth() + 1);
              break;
            case 'quarterly':
              endDate.setMonth(endDate.getMonth() + 3);
              break;
            case 'yearly':
              endDate.setFullYear(endDate.getFullYear() + 1);
              break;
          }

          // Only test downgrades that happen within the billing period
          if (upgradeDate <= startDate || upgradeDate >= endDate) {
            return true; // Skip invalid scenarios
          }

          const subscription = new Subscription({
            ...subscriptionData,
            endDate,
            nextBillingDate: endDate
          });

          const proration = subscription.calculateProration(lowerAmount, upgradeDate);
          
          // Proration should be zero for downgrades (we don't charge extra for downgrades)
          return proration === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('proration should be zero when upgrade date is after end date', () => {
    return fc.assert(
      fc.property(
        subscriptionDataGenerator(),
        upgradeScenarioGenerator(),
        (subscriptionData, upgradeScenario) => {
          // Skip invalid inputs
          if (isNaN(subscriptionData.amount) || isNaN(upgradeScenario.newAmount) || 
              isNaN(subscriptionData.startDate.getTime()) || isNaN(upgradeScenario.upgradeDate.getTime())) {
            return true;
          }

          const startDate = new Date(subscriptionData.startDate);
          let endDate = new Date(startDate);
          
          switch (subscriptionData.billingCycle) {
            case 'monthly':
              endDate.setMonth(endDate.getMonth() + 1);
              break;
            case 'quarterly':
              endDate.setMonth(endDate.getMonth() + 3);
              break;
            case 'yearly':
              endDate.setFullYear(endDate.getFullYear() + 1);
              break;
          }

          // Set upgrade date after end date
          const upgradeDate = new Date(endDate);
          upgradeDate.setDate(upgradeDate.getDate() + 1);

          const subscription = new Subscription({
            ...subscriptionData,
            endDate,
            nextBillingDate: endDate
          });

          const proration = subscription.calculateProration(
            upgradeScenario.newAmount, 
            upgradeDate
          );

          // Proration should be zero when upgrade is after billing period
          return proration === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});