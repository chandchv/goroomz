const express = require('express');
const router = express.Router();
const { RoomCategory, Room } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');

/**
 * Internal Room Category Management Routes
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * GET /api/internal/categories
 * Get all custom categories for a property
 * Requirements: 2.1
 */
router.get('/', protectInternal, async (req, res) => {
  try {
    const { propertyId } = req.query;

    // Determine which property to query
    let ownerId;
    if ((req.user.role === 'admin' || req.user.internalRole) && propertyId) {
      ownerId = propertyId;
    } else if (req.user.role === 'owner' || req.user.role === 'category_owner') {
      ownerId = req.user.id;
    } else {
      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: 'Property ID is required for staff users.'
        });
      }
      ownerId = propertyId;
    }

    const categories = await RoomCategory.findAll({
      where: {
        propertyId: ownerId
      },
      // Temporarily disabled Room association due to model issues
      // include: [
      //   {
      //     model: Room,
      //     as: 'rooms',
      //     attributes: ['id'],
      //     required: false
      //   }
      // ],
      order: [['name', 'ASC']]
    });

    // Format response with room count
    const categoriesWithCount = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      roomCount: category.rooms?.length || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    res.json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/categories
 * Create a new custom category
 * Requirements: 2.1
 */
router.post('/', protectInternal, requirePermissions('canManageRooms'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be at least 2 characters.'
      });
    }

    // Determine property ID
    let propertyId;
    if (req.user.role === 'owner' || req.user.role === 'category_owner') {
      propertyId = req.user.id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can create categories.'
      });
    }

    // Check for duplicate category name
    const existingCategory = await RoomCategory.findOne({
      where: {
        propertyId,
        name: name.trim()
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists for your property.'
      });
    }

    // Create category
    const category = await RoomCategory.create({
      propertyId,
      name: name.trim(),
      description: description?.trim() || null,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        roomCount: 0,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/categories/:id
 * Update a category
 * Requirements: 2.4
 */
router.put('/:id', protectInternal, requirePermissions('canManageRooms'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // Find category
    const category = await RoomCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && category.propertyId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this category.'
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category name must be at least 2 characters.'
        });
      }

      // Check for duplicate name (excluding current category)
      const existingCategory = await RoomCategory.findOne({
        where: {
          propertyId: category.propertyId,
          name: name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists for your property.'
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description?.trim() || null;
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    // Get room count
    const roomCount = await Room.count({
      where: { customCategoryId: category.id }
    });

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        roomCount,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/internal/categories/:id
 * Delete a category (with validation)
 * Requirements: 2.5
 */
router.delete('/:id', protectInternal, requirePermissions('canManageRooms'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find category
    const category = await RoomCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && category.propertyId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this category.'
      });
    }

    // Check if any rooms are assigned to this category
    const roomCount = await Room.count({
      where: { customCategoryId: category.id }
    });

    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${roomCount} room(s) are currently assigned to this category. Please reassign or remove these rooms first.`,
        roomCount
      });
    }

    // Delete category
    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/rooms/:id/assign-category
 * Assign a category to a room
 * Requirements: 2.2
 */
router.post('/rooms/:id/assign-category', protectInternal, requirePermissions('canManageRooms'), async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    // Find room
    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && room.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this room.'
      });
    }

    // If categoryId is null, remove category assignment
    if (categoryId === null) {
      room.customCategoryId = null;
      await room.save();

      return res.json({
        success: true,
        message: 'Category assignment removed from room.',
        data: {
          id: room.id,
          roomNumber: room.roomNumber,
          customCategoryId: null
        }
      });
    }

    // Validate category exists and belongs to same property
    const category = await RoomCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    if (category.propertyId !== room.ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Category does not belong to the same property as the room.'
      });
    }

    if (!category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign an inactive category to a room.'
      });
    }

    // Assign category
    room.customCategoryId = categoryId;
    await room.save();

    res.json({
      success: true,
      message: 'Category assigned to room successfully.',
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        customCategoryId: room.customCategoryId,
        categoryName: category.name
      }
    });
  } catch (error) {
    console.error('Error assigning category to room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign category to room.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
