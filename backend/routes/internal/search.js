const express = require('express');
const router = express.Router();
const { User, Room, Lead, Territory, Property, sequelize } = require('../../models');
const { protectInternal, authorizeInternalRoles } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');

/**
 * Global Search Routes
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

/**
 * GET /api/internal/search
 * Global search across properties, owners, and leads
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 * Implements Property 23: Search result matching
 */
router.get('/',
  protectInternal,
  authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
  async (req, res) => {
    try {
      const { 
        query, 
        type, // 'properties', 'owners', 'leads', or 'all'
        page = 1, 
        limit = 20 
      } = req.query;

      // Validate query parameter
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required.'
        });
      }

      const searchTerm = query.trim();
      const searchTypes = type ? [type] : ['properties', 'owners', 'leads'];
      
      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitInt = parseInt(limit);

      const results = {
        query: searchTerm,
        properties: { count: 0, data: [] },
        owners: { count: 0, data: [] },
        leads: { count: 0, data: [] }
      };

      // Search Properties (Requirement 16.1: Search by property name, 16.3: Search by location)
      if (searchTypes.includes('properties') || searchTypes.includes('all')) {
        const propertyWhereClause = {
          [Op.and]: [
            { isActive: true },
            {
              [Op.or]: [
                // Search by property name/title
                { title: { [Op.iLike]: `%${searchTerm}%` } },
                // Search by description
                { description: { [Op.iLike]: `%${searchTerm}%` } },
                // Search by location (city, state, address)
                sequelize.where(
                  sequelize.cast(sequelize.col('location'), 'text'),
                  { [Op.iLike]: `%${searchTerm}%` }
                ),
                { roomNumber: { [Op.iLike]: `%${searchTerm}%` } }
              ]
            }
          ]
        };

        // Role-based filtering for properties
        if (req.user.internalRole === 'agent') {
          // Agents can only search properties they've onboarded (via leads)
          const agentLeads = await Lead.findAll({
            where: { 
              agentId: req.user.id,
              status: 'approved'
            },
            attributes: ['id']
          });
          
          const leadIds = agentLeads.map(l => l.id);
          
          if (leadIds.length > 0) {
            // Find property owners from approved leads
            const approvedLeads = await Lead.findAll({
              where: { id: { [Op.in]: leadIds } },
              attributes: ['email']
            });
            
            const ownerEmails = approvedLeads.map(l => l.email);
            
            if (ownerEmails.length > 0) {
              const owners = await User.findAll({
                where: { email: { [Op.in]: ownerEmails } },
                attributes: ['id']
              });
              
              const ownerIds = owners.map(o => o.id);
              propertyWhereClause[Op.and].push({ ownerId: { [Op.in]: ownerIds } });
            } else {
              // No properties to show
              propertyWhereClause[Op.and].push({ ownerId: null });
            }
          } else {
            // No properties to show
            propertyWhereClause[Op.and].push({ ownerId: null });
          }
        } else if (req.user.internalRole === 'regional_manager') {
          // Regional managers can search properties in their territories
          const territories = await Territory.findAll({
            where: { regionalManagerId: req.user.id },
            attributes: ['id']
          });
          
          const territoryIds = territories.map(t => t.id);
          
          if (territoryIds.length > 0) {
            // Find leads in these territories
            const territoryLeads = await Lead.findAll({
              where: { 
                territoryId: { [Op.in]: territoryIds },
                status: 'approved'
              },
              attributes: ['email']
            });
            
            const ownerEmails = territoryLeads.map(l => l.email);
            
            if (ownerEmails.length > 0) {
              const owners = await User.findAll({
                where: { email: { [Op.in]: ownerEmails } },
                attributes: ['id']
              });
              
              const ownerIds = owners.map(o => o.id);
              propertyWhereClause[Op.and].push({ ownerId: { [Op.in]: ownerIds } });
            } else {
              // No properties to show
              propertyWhereClause[Op.and].push({ ownerId: null });
            }
          } else {
            // No properties to show
            propertyWhereClause[Op.and].push({ ownerId: null });
          }
        }
        // Operations managers, platform admins, and superusers can search all properties

        const { count: propertyCount, rows: properties } = await Room.findAndCountAll({
          where: propertyWhereClause,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'email', 'phone']
            }
          ],
          attributes: [
            'id',
            'title',
            'description',
            'location',
            'category',
            'roomType',
            'price',
            'roomNumber',
            'floorNumber',
            'currentStatus',
            'isActive',
            'images'
          ],
          limit: limitInt,
          offset,
          order: [['created_at', 'DESC']]
        });

        results.properties = {
          count: propertyCount,
          data: properties.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description?.substring(0, 150) + '...',
            location: p.location,
            category: p.category,
            roomType: p.roomType,
            price: p.price,
            roomNumber: p.roomNumber,
            floorNumber: p.floorNumber,
            currentStatus: p.currentStatus,
            owner: p.owner ? {
              id: p.owner.id,
              name: p.owner.name,
              email: p.owner.email,
              phone: p.owner.phone
            } : null,
            primaryImage: p.images?.[0]?.url || null,
            type: 'property'
          }))
        };
      }

      // Search Property Owners (Requirement 16.2: Search by owner name or email)
      if (searchTypes.includes('owners') || searchTypes.includes('all')) {
        const ownerWhereClause = {
          [Op.and]: [
            { role: 'owner' },
            {
              [Op.or]: [
                // Search by owner name
                { name: { [Op.iLike]: `%${searchTerm}%` } },
                // Search by owner email
                { email: { [Op.iLike]: `%${searchTerm}%` } },
                // Search by phone
                { phone: { [Op.iLike]: `%${searchTerm}%` } }
              ]
            }
          ]
        };

        // Role-based filtering for owners
        if (req.user.internalRole === 'agent') {
          // Agents can only search owners they've onboarded
          const agentLeads = await Lead.findAll({
            where: { 
              agentId: req.user.id,
              status: 'approved'
            },
            attributes: ['email']
          });
          
          const ownerEmails = agentLeads.map(l => l.email);
          
          if (ownerEmails.length > 0) {
            ownerWhereClause[Op.and].push({ email: { [Op.in]: ownerEmails } });
          } else {
            // No owners to show
            ownerWhereClause[Op.and].push({ email: null });
          }
        } else if (req.user.internalRole === 'regional_manager') {
          // Regional managers can search owners in their territories
          const territories = await Territory.findAll({
            where: { regionalManagerId: req.user.id },
            attributes: ['id']
          });
          
          const territoryIds = territories.map(t => t.id);
          
          if (territoryIds.length > 0) {
            const territoryLeads = await Lead.findAll({
              where: { 
                territoryId: { [Op.in]: territoryIds },
                status: 'approved'
              },
              attributes: ['email']
            });
            
            const ownerEmails = territoryLeads.map(l => l.email);
            
            if (ownerEmails.length > 0) {
              ownerWhereClause[Op.and].push({ email: { [Op.in]: ownerEmails } });
            } else {
              // No owners to show
              ownerWhereClause[Op.and].push({ email: null });
            }
          } else {
            // No owners to show
            ownerWhereClause[Op.and].push({ email: null });
          }
        }
        // Operations managers, platform admins, and superusers can search all owners

        const { count: ownerCount, rows: owners } = await User.findAndCountAll({
          where: ownerWhereClause,
          attributes: [
            'id',
            'name',
            'email',
            'phone',
            'location',
            'city',
            'state',
            'isActive',
            'created_at'
          ],
          limit: limitInt,
          offset,
          order: [['name', 'ASC']]
        });

        // Get property count for each owner
        const ownersWithPropertyCount = await Promise.all(
          owners.map(async (owner) => {
            // Count rooms through property relationship
            const userProperties = await Property.findAll({
              where: { ownerId: owner.id },
              attributes: ['id']
            });
            const propertyIds = userProperties.map(p => p.id);
            
            const propertyCount = propertyIds.length > 0 ? await Room.count({
              where: { 
                propertyId: { [Op.in]: propertyIds },
                isActive: true
              }
            }) : 0;
            
            return {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              phone: owner.phone,
              location: owner.location,
              city: owner.city,
              state: owner.state,
              isActive: owner.isActive,
              propertyCount,
              type: 'owner'
            };
          })
        );

        results.owners = {
          count: ownerCount,
          data: ownersWithPropertyCount
        };
      }

      // Search Leads (Requirement 16.2: Search by name or email)
      if (searchTypes.includes('leads') || searchTypes.includes('all')) {
        const leadWhereClause = {
          [Op.or]: [
            // Search by property owner name
            { propertyOwnerName: { [Op.iLike]: `%${searchTerm}%` } },
            // Search by email
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            // Search by business name
            { businessName: { [Op.iLike]: `%${searchTerm}%` } },
            // Search by phone
            { phone: { [Op.iLike]: `%${searchTerm}%` } },
            // Search by city
            { city: { [Op.iLike]: `%${searchTerm}%` } },
            // Search by state
            { state: { [Op.iLike]: `%${searchTerm}%` } }
          ]
        };

        // Role-based filtering for leads
        if (req.user.internalRole === 'agent') {
          // Agents can only search their own leads
          leadWhereClause.agentId = req.user.id;
        } else if (req.user.internalRole === 'regional_manager') {
          // Regional managers can search leads in their territories
          const territories = await Territory.findAll({
            where: { regionalManagerId: req.user.id },
            attributes: ['id']
          });
          
          const territoryIds = territories.map(t => t.id);
          
          if (territoryIds.length > 0) {
            leadWhereClause.territoryId = { [Op.in]: territoryIds };
          } else {
            // No leads to show
            leadWhereClause.territoryId = null;
          }
        }
        // Operations managers, platform admins, and superusers can search all leads

        const { count: leadCount, rows: leads } = await Lead.findAndCountAll({
          where: leadWhereClause,
          include: [
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Territory,
              as: 'territory',
              attributes: ['id', 'name']
            }
          ],
          attributes: [
            'id',
            'propertyOwnerName',
            'email',
            'phone',
            'businessName',
            'propertyType',
            'city',
            'state',
            'status',
            'estimatedRooms',
            'created_at'
          ],
          limit: limitInt,
          offset,
          order: [['created_at', 'DESC']]
        });

        results.leads = {
          count: leadCount,
          data: leads.map(l => ({
            id: l.id,
            propertyOwnerName: l.propertyOwnerName,
            email: l.email,
            phone: l.phone,
            businessName: l.businessName,
            propertyType: l.propertyType,
            city: l.city,
            state: l.state,
            status: l.status,
            estimatedRooms: l.estimatedRooms,
            agent: l.agent ? {
              id: l.agent.id,
              name: l.agent.name,
              email: l.agent.email
            } : null,
            territory: l.territory ? {
              id: l.territory.id,
              name: l.territory.name
            } : null,
            type: 'lead'
          }))
        };
      }

      // Calculate total results
      const totalResults = results.properties.count + results.owners.count + results.leads.count;

      res.json({
        success: true,
        query: searchTerm,
        totalResults,
        page: parseInt(page),
        limit: limitInt,
        results
      });
    } catch (error) {
      console.error('Error performing search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform search.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
