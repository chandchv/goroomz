import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Building2, Globe } from 'lucide-react';
import RoomCard from './RoomCard';
import RoomGrid from './RoomGrid';

/**
 * UnifiedSearchResults Component
 * 
 * Displays search results from both local and Amadeus sources.
 * Shows result counts, warnings for partial failures, and mixed property listings.
 * 
 * @param {Object} props
 * @param {Array} props.results - Array of properties from both sources
 * @param {Object} props.meta - Search metadata
 * @param {number} props.meta.total - Total number of results
 * @param {number} props.meta.localCount - Number of local results
 * @param {number} props.meta.amadeusCount - Number of Amadeus results
 * @param {Object} [props.warnings] - Partial failure warnings
 * @param {string} [props.viewMode='grid'] - Display mode ('grid' or 'list')
 * @param {Function} props.onPropertyClick - Callback when property is clicked
 * @param {boolean} [props.isLoading=false] - Loading state
 */
const UnifiedSearchResults = ({ 
  results = [], 
  meta = {}, 
  warnings = null,
  viewMode = 'grid',
  onPropertyClick,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Searching properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {meta.total || 0} {meta.total === 1 ? 'Property' : 'Properties'} Found
          </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {meta.localCount > 0 && (
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4 text-green-600" />
                <span>{meta.localCount} Local</span>
              </div>
            )}
            {meta.amadeusCount > 0 && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{meta.amadeusCount} Amadeus</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partial Failure Warnings */}
      {warnings && Object.keys(warnings).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Partial Search Results
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                Some search sources encountered errors. Showing available results:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1">
                {warnings.local && (
                  <li>• Local search: {warnings.local}</li>
                )}
                {warnings.amadeus && (
                  <li>• Amadeus search: {warnings.amadeus}</li>
                )}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Grid/List */}
      {results.length > 0 ? (
        <RoomGrid 
          rooms={results} 
          viewMode={viewMode} 
          onRoomClick={onPropertyClick}
        />
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or filters to find more results.
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchResults;
