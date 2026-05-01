const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropertyOwner = sequelize.define('PropertyOwner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Information
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Reference to User model if account exists'
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'leads',
      key: 'id'
    },
    comment: 'Reference to the originating lead'
  },
  
  // Owner Details
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15],
      is: /^[0-9+\-\s()]+$/
    }
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  
  // Onboarding Tracking
  onboardingStatus: {
    type: DataTypes.ENUM(
      'not_started', 'account_created', 'profile_completed', 
      'documents_uploaded', 'verification_pending', 'verification_completed',
      'training_scheduled', 'training_completed', 'onboarding_completed'
    ),
    defaultValue: 'not_started',
    allowNull: false
  },
  onboardingSteps: {
    type: DataTypes.JSONB,
    defaultValue: {
      accountCreation: { completed: false, completedAt: null },
      profileCompletion: { completed: false, completedAt: null },
      documentUpload: { completed: false, completedAt: null },
      verification: { completed: false, completedAt: null },
      training: { completed: false, completedAt: null }
    },
    validate: {
      isValidSteps(value) {
        const requiredSteps = ['accountCreation', 'profileCompletion', 'documentUpload', 'verification', 'training'];
        if (!requiredSteps.every(step => value.hasOwnProperty(step))) {
          throw new Error('All onboarding steps must be present');
        }
      }
    }
  },
  
  // Account Management
  accountStatus: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'deactivated'),
    defaultValue: 'pending',
    allowNull: false
  },
  accountCreatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  credentialsGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  credentialsSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  firstLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Verification and Documents
  verificationStatus: {
    type: DataTypes.ENUM('not_started', 'documents_pending', 'under_review', 'verified', 'rejected'),
    defaultValue: 'not_started',
    allowNull: false
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Uploaded documents with verification status'
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Training and Support
  trainingStatus: {
    type: DataTypes.ENUM('not_scheduled', 'scheduled', 'in_progress', 'completed', 'rescheduled'),
    defaultValue: 'not_scheduled',
    allowNull: false
  },
  trainingScheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trainingCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assignedTrainer: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Communication Preferences
  communicationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      sms: true,
      whatsapp: false,
      preferredTime: 'business_hours',
      language: 'en'
    }
  },
  
  // Tracking and Analytics
  assignedAgent: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  onboardingStartedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  onboardingCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalOnboardingDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Calculated field for analytics'
  },
  
  // Additional Information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  }
}, {
  tableName: 'property_owners',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['leadId']
    },
    {
      fields: ['onboardingStatus', 'createdAt']
    },
    {
      fields: ['accountStatus']
    },
    {
      fields: ['verificationStatus']
    },
    {
      fields: ['assignedAgent', 'onboardingStatus']
    },
    {
      fields: ['email']
    }
  ],
  hooks: {
    beforeUpdate: async (propertyOwner) => {
      // Calculate total onboarding days when completed
      if (propertyOwner.changed('onboardingStatus') && 
          propertyOwner.onboardingStatus === 'onboarding_completed' &&
          propertyOwner.onboardingStartedAt) {
        const startDate = new Date(propertyOwner.onboardingStartedAt);
        const endDate = new Date();
        propertyOwner.onboardingCompletedAt = endDate;
        propertyOwner.totalOnboardingDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      }
    }
  }
});

// Instance methods
PropertyOwner.prototype.getOnboardingProgress = function() {
  const steps = this.onboardingSteps;
  const totalSteps = Object.keys(steps).length;
  const completedSteps = Object.values(steps).filter(step => step.completed).length;
  return {
    percentage: Math.round((completedSteps / totalSteps) * 100),
    completedSteps,
    totalSteps,
    nextStep: this.getNextOnboardingStep()
  };
};

PropertyOwner.prototype.getNextOnboardingStep = function() {
  const steps = this.onboardingSteps;
  const stepOrder = ['accountCreation', 'profileCompletion', 'documentUpload', 'verification', 'training'];
  
  for (const step of stepOrder) {
    if (!steps[step].completed) {
      return step;
    }
  }
  return null;
};

PropertyOwner.prototype.completeOnboardingStep = function(stepName) {
  if (this.onboardingSteps[stepName]) {
    this.onboardingSteps[stepName].completed = true;
    this.onboardingSteps[stepName].completedAt = new Date();
    
    // Update overall onboarding status
    const progress = this.getOnboardingProgress();
    if (progress.percentage === 100) {
      this.onboardingStatus = 'onboarding_completed';
    }
  }
};

PropertyOwner.prototype.isOnboardingOverdue = function() {
  if (!this.onboardingStartedAt || this.onboardingStatus === 'onboarding_completed') {
    return false;
  }
  
  const daysSinceStart = Math.ceil((new Date() - new Date(this.onboardingStartedAt)) / (1000 * 60 * 60 * 24));
  return daysSinceStart > 14; // 14 days onboarding SLA
};

module.exports = PropertyOwner;