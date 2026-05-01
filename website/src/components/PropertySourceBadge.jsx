import React from 'react';
import { Building2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * PropertySourceBadge Component
 * 
 * Displays a badge indicating whether a property is from local database or Amadeus.
 * Provides visual distinction between property sources in search results.
 * 
 * @param {Object} props
 * @param {Object} props.property - Property object with source metadata
 * @param {'local'|'amadeus'} [props.property.source] - Property source
 * @param {boolean} [props.property.isExternal] - Whether property is external
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Badge size
 * @param {boolean} [props.showIcon=true] - Whether to show icon
 * @param {boolean} [props.animated=true] - Whether to animate on hover
 */
const PropertySourceBadge = ({ 
  property, 
  size = 'md', 
  showIcon = true,
  animated = true 
}) => {
  // Determine if property is from Amadeus
  const isAmadeus = property?.source === 'amadeus' || property?.isExternal === true;
  
  // Size configurations
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Style configurations
  const styles = isAmadeus ? {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Globe,
    label: 'Amadeus'
  } : {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: Building2,
    label: 'Local'
  };

  const Icon = styles.icon;

  const badgeContent = (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full font-medium
      ${styles.bg} ${styles.text} ${sizeClasses[size]}
      border ${styles.border}
    `}>
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{styles.label}</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="inline-block"
      >
        {badgeContent}
      </motion.div>
    );
  }

  return badgeContent;
};

export default PropertySourceBadge;
