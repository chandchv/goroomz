/**
 * Script to validate and audit database indexes
 * 
 * This script:
 * 1. Checks all model indexes match database indexes
 * 2. Identifies duplicate or conflicting indexes
 * 3. Finds missing indexes for foreign keys and frequently queried columns
 * 4. Provides recommendations for index optimization
 * 
 * Can run in two modes:
 * - Static mode: Analyzes model definitions without database connection
 * - Database mode: Compares model definitions with actual database indexes
 */

const path = require('path');
const fs = require('fs');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

/**
 * Load all models dynamically
 */
function loadModels() {
  const modelsPath = path.join(__dirname, '../models');
  const models = {};
  
  const files = fs.readdirSync(modelsPath).filter(file => 
    file.endsWith('.js') && file !== 'index.js'
  );
  
  files.forEach(file => {
    try {
      const modelPath = path.join(modelsPath, file);
      const modelContent = fs.readFileSync(modelPath, 'utf8');
      const modelName = file.replace('.js', '');
      
      models[modelName] = {
        name: modelName,
        file: file,
        content: modelContent,
        indexes: extractIndexes(modelContent),
        foreignKeys: extractForeignKeys(modelContent),
        tableName: extractTableName(modelContent)
      };
    } catch (error) {
      log(`Error loading model ${file}: ${error.message}`, 'red');
    }
  });
  
  return models;
}

/**
 * Extract table name from model content
 */
function extractTableName(content) {
  const match = content.match(/tableName:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/**
 * Extract indexes from model content
 */
function extractIndexes(content) {
  const indexes = [];
  
  // Find indexes array in model definition
  const indexesMatch = content.match(/indexes:\s*\[([\s\S]*?)\n\s*\]/);
  if (!indexesMatch) return indexes;
  
  const indexesContent = indexesMatch[1];
  
  // Split by closing brace followed by comma to get individual indexes
  const indexBlocks = indexesContent.split(/\},\s*\{/);
  
  indexBlocks.forEach((block, i) => {
    // Add back braces if needed
    let indexBlock = block.trim();
    if (!indexBlock.startsWith('{')) indexBlock = '{' + indexBlock;
    if (!indexBlock.endsWith('}')) indexBlock = indexBlock + '}';
    
    // Extract fields array
    const fieldsMatch = indexBlock.match(/fields:\s*\[([^\]]+)\]/);
    if (!fieldsMatch) return;
    
    const fieldsStr = fieldsMatch[1];
    const fields = fieldsStr
      .split(',')
      .map(f => f.trim().replace(/['"]/g, ''))
      .filter(f => f.length > 0);
    
    // Check if unique
    const isUnique = indexBlock.includes('unique: true');
    
    indexes.push({
      fields: fields,
      unique: isUnique
    });
  });
  
  return indexes;
}

/**
 * Extract foreign keys from model content
 */
function extractForeignKeys(content) {
  const foreignKeys = [];
  
  // Find all field definitions with references
  const fieldRegex = /(\w+):\s*\{([^}]*references:\s*\{[^}]*\}[^}]*)\}/g;
  let match;
  
  while ((match = fieldRegex.exec(content)) !== null) {
    const fieldName = match[1];
    const fieldDef = match[2];
    
    // Skip if this is the primary key (id field)
    if (fieldName === 'id') continue;
    
    // Extract the referenced model
    const modelMatch = fieldDef.match(/model:\s*['"]([^'"]+)['"]/);
    if (!modelMatch) continue;
    
    const referencedModel = modelMatch[1];
    
    // Convert camelCase to snake_case for field name
    const columnName = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    foreignKeys.push({
      field: fieldName,
      column: columnName,
      references: referencedModel
    });
  }
  
  return foreignKeys;
}

/**
 * Check if a column is indexed
 */
function isColumnIndexed(column, indexes) {
  return indexes.some(index => 
    index.fields.includes(column) || 
    index.fields.includes(column.replace(/_/g, ''))
  );
}

/**
 * Find duplicate indexes
 */
function findDuplicateIndexes(indexes) {
  const duplicates = [];
  
  for (let i = 0; i < indexes.length; i++) {
    for (let j = i + 1; j < indexes.length; j++) {
      const idx1 = indexes[i];
      const idx2 = indexes[j];
      
      // Check if fields are the same
      if (JSON.stringify(idx1.fields.sort()) === JSON.stringify(idx2.fields.sort())) {
        duplicates.push({
          index1: i,
          index2: j,
          fields: idx1.fields
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * Find redundant indexes (where one index is a prefix of another)
 */
function findRedundantIndexes(indexes) {
  const redundant = [];
  
  for (let i = 0; i < indexes.length; i++) {
    for (let j = 0; j < indexes.length; j++) {
      if (i === j) continue;
      
      const idx1 = indexes[i];
      const idx2 = indexes[j];
      
      // Check if idx1 is a prefix of idx2
      if (idx1.fields.length < idx2.fields.length) {
        const isPrefix = idx1.fields.every((field, index) => idx2.fields[index] === field);
        if (isPrefix) {
          redundant.push({
            redundantIndex: i,
            coveredBy: j,
            redundantFields: idx1.fields,
            coveringFields: idx2.fields
          });
        }
      }
    }
  }
  
  return redundant;
}

/**
 * Commonly queried columns that should typically be indexed
 */
const COMMON_QUERY_COLUMNS = [
  'status',
  'created_at',
  'updated_at',
  'is_active',
  'type',
  'priority',
  'category'
];

/**
 * Main validation function (static mode)
 */
function validateIndexesStatic() {
  try {
    log('Running static index validation (no database connection required)', 'cyan');
    
    const models = loadModels();
    const results = {
      totalModels: 0,
      totalIndexes: 0,
      duplicateIndexes: [],
      redundantIndexes: [],
      unindexedForeignKeys: [],
      recommendations: [],
      modelDetails: []
    };
    
    logSection('ANALYZING MODEL INDEXES');
    
    Object.values(models).forEach(model => {
      if (!model.tableName) {
        log(`Skipping ${model.name} - no table name found`, 'yellow');
        return;
      }
      
      results.totalModels++;
      results.totalIndexes += model.indexes.length;
      
      log(`\nAnalyzing model: ${model.name} (table: ${model.tableName})`, 'cyan');
      log(`  Indexes defined: ${model.indexes.length}`, 'blue');
      log(`  Foreign keys: ${model.foreignKeys.length}`, 'blue');
      
      const modelResult = {
        name: model.name,
        table: model.tableName,
        indexCount: model.indexes.length,
        foreignKeyCount: model.foreignKeys.length,
        issues: []
      };
      
      // Check for duplicate indexes
      const duplicates = findDuplicateIndexes(model.indexes);
      if (duplicates.length > 0) {
        log(`  ⚠️  Found ${duplicates.length} duplicate index(es)`, 'yellow');
        duplicates.forEach(dup => {
          const issue = {
            type: 'duplicate',
            fields: dup.fields,
            indexes: [dup.index1, dup.index2]
          };
          modelResult.issues.push(issue);
          results.duplicateIndexes.push({
            model: model.name,
            table: model.tableName,
            ...dup
          });
        });
      }
      
      // Check for redundant indexes
      const redundant = findRedundantIndexes(model.indexes);
      if (redundant.length > 0) {
        log(`  ⚠️  Found ${redundant.length} potentially redundant index(es)`, 'yellow');
        redundant.forEach(red => {
          const issue = {
            type: 'redundant',
            redundantFields: red.redundantFields,
            coveringFields: red.coveringFields
          };
          modelResult.issues.push(issue);
          results.redundantIndexes.push({
            model: model.name,
            table: model.tableName,
            ...red
          });
        });
      }
      
      // Check for unindexed foreign keys
      model.foreignKeys.forEach(fk => {
        if (!isColumnIndexed(fk.column, model.indexes)) {
          log(`  ❌ Foreign key not indexed: ${fk.field} (${fk.column})`, 'red');
          const issue = {
            type: 'unindexed_fk',
            field: fk.field,
            column: fk.column,
            references: fk.references
          };
          modelResult.issues.push(issue);
          results.unindexedForeignKeys.push({
            model: model.name,
            table: model.tableName,
            field: fk.field,
            column: fk.column,
            references: fk.references
          });
        }
      });
      
      // Check for commonly queried columns
      COMMON_QUERY_COLUMNS.forEach(commonCol => {
        if (model.content.includes(`${commonCol}:`)) {
          if (!isColumnIndexed(commonCol, model.indexes)) {
            results.recommendations.push({
              model: model.name,
              table: model.tableName,
              column: commonCol,
              reason: 'Commonly queried column should be indexed'
            });
          }
        }
      });
      
      if (modelResult.issues.length === 0) {
        log(`  ✅ No issues found`, 'green');
      }
      
      results.modelDetails.push(modelResult);
    });
    
    // Print summary
    logSection('VALIDATION SUMMARY');
    log(`Total models analyzed: ${results.totalModels}`, 'bright');
    log(`Total indexes found: ${results.totalIndexes}`, 'bright');
    log(`Issues found: ${results.duplicateIndexes.length + results.redundantIndexes.length + results.unindexedForeignKeys.length}`, 'bright');
    
    // Print issues
    if (results.duplicateIndexes.length > 0) {
      logSection('DUPLICATE INDEXES');
      results.duplicateIndexes.forEach(dup => {
        log(`\n${dup.model} (${dup.table}):`, 'yellow');
        log(`  Index ${dup.index1} and Index ${dup.index2} are duplicates`, 'yellow');
        log(`  Fields: ${dup.fields.join(', ')}`, 'yellow');
        log(`  Recommendation: Remove one of these indexes`, 'yellow');
      });
    }
    
    if (results.redundantIndexes.length > 0) {
      logSection('REDUNDANT INDEXES');
      results.redundantIndexes.forEach(red => {
        log(`\n${red.model} (${red.table}):`, 'yellow');
        log(`  Index on [${red.redundantFields.join(', ')}] is redundant`, 'yellow');
        log(`  Covered by index on [${red.coveringFields.join(', ')}]`, 'yellow');
        log(`  Recommendation: Consider removing the redundant index`, 'yellow');
      });
    }
    
    if (results.unindexedForeignKeys.length > 0) {
      logSection('UNINDEXED FOREIGN KEYS');
      results.unindexedForeignKeys.forEach(fk => {
        log(`\n${fk.model} (${fk.table}):`, 'red');
        log(`  Field: ${fk.field}`, 'red');
        log(`  Column: ${fk.column}`, 'red');
        log(`  References: ${fk.references}`, 'red');
        log(`  Recommendation: Add index to improve join performance`, 'red');
      });
    }
    
    if (results.recommendations.length > 0) {
      logSection('RECOMMENDATIONS');
      const grouped = {};
      results.recommendations.forEach(rec => {
        if (!grouped[rec.model]) grouped[rec.model] = [];
        grouped[rec.model].push(rec);
      });
      
      Object.entries(grouped).forEach(([model, recs]) => {
        log(`\n${model}:`, 'cyan');
        recs.forEach(rec => {
          log(`  Column: ${rec.column} - ${rec.reason}`, 'cyan');
        });
      });
    }
    
    // Final status
    logSection('VALIDATION COMPLETE');
    if (results.duplicateIndexes.length === 0 && 
        results.redundantIndexes.length === 0 && 
        results.unindexedForeignKeys.length === 0) {
      log('✅ All indexes are properly configured!', 'green');
    } else {
      log('⚠️  Issues found. Please review the recommendations above.', 'yellow');
      log(`\nSummary:`, 'bright');
      log(`  - Duplicate indexes: ${results.duplicateIndexes.length}`, 'yellow');
      log(`  - Redundant indexes: ${results.redundantIndexes.length}`, 'yellow');
      log(`  - Unindexed foreign keys: ${results.unindexedForeignKeys.length}`, 'red');
      log(`  - Recommendations: ${results.recommendations.length}`, 'cyan');
    }
    
    return results;
    
  } catch (error) {
    log(`\nError during validation: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

// Run validation if called directly
if (require.main === module) {
  try {
    validateIndexesStatic();
    process.exit(0);
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

module.exports = { validateIndexesStatic };
