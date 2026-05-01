import { useSelectedProperty } from '../hooks/useSelectedProperty';

interface PropertyIndicatorProps {
  showRoomCount?: boolean;
  showLocation?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PropertyIndicator({ 
  showRoomCount = true, 
  showLocation = true, 
  className = '',
  size = 'md'
}: PropertyIndicatorProps) {
  const { selectedProperty, loading } = useSelectedProperty();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
        {showLocation && <div className="h-3 bg-gray-200 rounded w-24"></div>}
      </div>
    );
  }

  if (!selectedProperty) {
    return (
      <div className={`text-gray-500 ${className}`}>
        <span className={`${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
          No property selected
        </span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const subSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`${className}`}>
      <div className={`font-semibold text-gray-900 ${sizeClasses[size]}`}>
        {selectedProperty.name}
      </div>
      <div className={`text-gray-600 ${subSizeClasses[size]} space-x-2`}>
        {showLocation && (
          <span>{selectedProperty.location}</span>
        )}
        {showRoomCount && showLocation && <span>•</span>}
        {showRoomCount && (
          <span>{selectedProperty.totalRooms} rooms</span>
        )}
      </div>
    </div>
  );
}