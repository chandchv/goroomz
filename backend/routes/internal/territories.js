/**
 * Territory Routes for Internal Management System
 * 
 * This module handles territory management endpoints including:
 * - Territory workload distribution
 * - Territory workload rebalancing
 * - Territory performance metrics
 */

const express = require('express');
const router = express.Router();
const territoryService = require('../../services/territoryService');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateUser);
router.use(requireRoles());

/**
 * @route   GET /api/territories/:id/workload
 * @desc    Get territory workload distribution
 * @access  Private (Internal roles only)
 */
router.get('/territories/:id/workload', async (req, res) => {
  try {
    const { id } = req.params;

    const workloadData = await territoryService.getTerritoryWorkloadDistribution(id);

    res.json({
      success: true,
      data: workloadData
    });

  } catch (error) {
    console.error('Workload fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territory workload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/territories/:id/rebalance
 * @desc    Rebalance territory workload
 * @access  Private (Internal roles only)
 */
router.post('/territories/:id/rebalance', async (req, res) => {
  try {
    const { id } = req.params;

    const rebalanceResult = await territoryService.rebalanceTerritoryWorkload(id);

    res.json({
      success: true,
      message: 'Territory workload rebalanced successfully',
      data: rebalanceResult
    });

  } catch (error) {
    console.error('Rebalance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebalance territory workload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/territories/:id/performance
 * @desc    Get territory performance metrics
 * @access  Private (Internal roles only)
 */
router.get('/territories/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const performanceData = await territoryService.getTerritoryPerformanceMetrics(id, parseInt(days));

    res.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territory performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
