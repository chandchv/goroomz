/**
 * Case Conversion Utilities
 * 
 * Provides utilities for converting between camelCase and snake_case.
 * These utilities are primarily for manual conversion when needed,
 * as Sequelize handles automatic conversion with underscored: true.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

/**
 * Converts a camelCase string to snake_case
 * @param {string} str - The camelCase string to convert
 * @returns {string} The snake_case version of the string
 * 
 * Examples:
 * - 'internalRole' -> 'internal_role'
 * - 'userId' -> 'user_id'
 * - 'createdAt' -> 'created_at'
 */
function toSnakeCase(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }
  
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore if present
}

/**
 * Converts a snake_case string to camelCase
 * @param {string} str - The snake_case string to convert
 * @returns {string} The camelCase version of the string
 * 
 * Examples:
 * - 'internal_role' -> 'internalRole'
 * - 'user_id' -> 'userId'
 * - 'created_at' -> 'createdAt'
 */
function toCamelCase(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }
  
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Converts all keys in an object from camelCase to snake_case
 * @param {Object} obj - The object with camelCase keys
 * @returns {Object} A new object with snake_case keys
 * 
 * Note: This performs a shallow conversion. Nested objects are not converted.
 */
function objectToSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

/**
 * Converts all keys in an object from snake_case to camelCase
 * @param {Object} obj - The object with snake_case keys
 * @returns {Object} A new object with camelCase keys
 * 
 * Note: This performs a shallow conversion. Nested objects are not converted.
 */
function objectToCamelCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

/**
 * Deep converts all keys in an object and nested objects from camelCase to snake_case
 * @param {*} obj - The object with camelCase keys
 * @returns {*} A new object with snake_case keys (deeply converted)
 */
function deepObjectToSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepObjectToSnakeCase(item));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = deepObjectToSnakeCase(value);
  }
  return result;
}

/**
 * Deep converts all keys in an object and nested objects from snake_case to camelCase
 * @param {*} obj - The object with snake_case keys
 * @returns {*} A new object with camelCase keys (deeply converted)
 */
function deepObjectToCamelCase(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepObjectToCamelCase(item));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = deepObjectToCamelCase(value);
  }
  return result;
}

/**
 * Serializes a Sequelize model instance to JSON with camelCase keys
 * This is useful for API responses to ensure consistent camelCase format
 * 
 * @param {Object} instance - Sequelize model instance
 * @returns {Object} JSON object with camelCase keys
 * 
 * Note: Sequelize's toJSON() already returns camelCase when underscored: true is set,
 * but this function provides explicit control and can be used for additional processing.
 */
function serializeModelToCamelCase(instance) {
  if (!instance || typeof instance.toJSON !== 'function') {
    throw new TypeError('Input must be a Sequelize model instance');
  }
  
  // Sequelize automatically converts to camelCase when underscored: true
  return instance.toJSON();
}

/**
 * Serializes an array of Sequelize model instances to JSON with camelCase keys
 * @param {Array} instances - Array of Sequelize model instances
 * @returns {Array} Array of JSON objects with camelCase keys
 */
function serializeModelArrayToCamelCase(instances) {
  if (!Array.isArray(instances)) {
    throw new TypeError('Input must be an array');
  }
  
  return instances.map(instance => serializeModelToCamelCase(instance));
}

/**
 * Validates that all keys in an object are in camelCase format
 * @param {Object} obj - The object to validate
 * @returns {boolean} True if all keys are camelCase, false otherwise
 */
function isObjectCamelCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return true;
  }
  
  for (const key of Object.keys(obj)) {
    // Check if key contains underscore (snake_case indicator)
    if (key.includes('_')) {
      return false;
    }
    // Check if key starts with uppercase (not camelCase)
    if (key.length > 0 && key[0] === key[0].toUpperCase()) {
      return false;
    }
  }
  return true;
}

/**
 * Validates that all keys in an object are in snake_case format
 * @param {Object} obj - The object to validate
 * @returns {boolean} True if all keys are snake_case, false otherwise
 */
function isObjectSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return true;
  }
  
  for (const key of Object.keys(obj)) {
    // Check if key contains uppercase letters (camelCase indicator)
    if (/[A-Z]/.test(key)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  toSnakeCase,
  toCamelCase,
  objectToSnakeCase,
  objectToCamelCase,
  deepObjectToSnakeCase,
  deepObjectToCamelCase,
  serializeModelToCamelCase,
  serializeModelArrayToCamelCase,
  isObjectCamelCase,
  isObjectSnakeCase
};
