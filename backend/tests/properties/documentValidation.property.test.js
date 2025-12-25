/**
 * Property-Based Tests for Document Validation
 * Feature: internal-user-roles, Property 31: Document validation
 * 
 * Property: For any document upload, if the file type or size exceeds limits, 
 * the upload should be rejected
 * 
 * Validates: Requirements 23.2
 */

const fc = require('fast-check');
const path = require('path');
const fs = require('fs').promises;

/**
 * Function to validate document upload data
 */
function validateDocumentUpload(fileData) {
  const errors = [];

  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  // Maximum file size (10MB)
  const maxFileSize = 10 * 1024 * 1024;

  // Check file type
  if (!fileData.mimeType || !allowedTypes.includes(fileData.mimeType)) {
    errors.push('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.');
  }

  // Check file size
  if (!fileData.size || fileData.size <= 0) {
    errors.push('File size must be greater than 0');
  } else if (fileData.size > maxFileSize) {
    errors.push('File size exceeds maximum limit of 10MB');
  }

  // Check filename
  if (!fileData.originalname || fileData.originalname.trim().length === 0) {
    errors.push('Filename is required');
  }

  // Check document type
  const validDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'];
  if (!fileData.documentType || !validDocumentTypes.includes(fileData.documentType)) {
    errors.push('Document type must be one of: business_license, property_photos, owner_id, tax_certificate, other');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

describe('Property 31: Document Validation', () => {
  /**
   * Generator for valid MIME types
   */
  const validMimeTypeArbitrary = () =>
    fc.constantFrom(
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

  /**
   * Generator for invalid MIME types
   */
  const invalidMimeTypeArbitrary = () =>
    fc.constantFrom(
      'text/plain',
      'application/zip',
      'video/mp4',
      'audio/mp3',
      'application/javascript',
      'text/html',
      'image/bmp',
      'image/tiff',
      'application/exe'
    );

  /**
   * Generator for valid file sizes (1 byte to 10MB)
   */
  const validFileSizeArbitrary = () =>
    fc.integer({ min: 1, max: 10 * 1024 * 1024 });

  /**
   * Generator for invalid file sizes (over 10MB)
   */
  const invalidFileSizeArbitrary = () =>
    fc.integer({ min: 10 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 });

  /**
   * Generator for valid filenames
   */
  const validFilenameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('document', 'license', 'photo', 'certificate', 'id_proof', 'business_doc'),
      fc.constantFrom('pdf', 'jpg', 'png', 'gif', 'doc', 'docx')
    ).map(([name, ext]) => `${name}.${ext}`);

  /**
   * Generator for valid document types
   */
  const validDocumentTypeArbitrary = () =>
    fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other');

  /**
   * Generator for invalid document types
   */
  const invalidDocumentTypeArbitrary = () =>
    fc.constantFrom('invalid_type', 'random', 'unknown', '', null, undefined);

  /**
   * Generator for valid document upload data
   */
  const validDocumentUploadArbitrary = () =>
    fc.record({
      mimeType: validMimeTypeArbitrary(),
      size: validFileSizeArbitrary(),
      originalname: validFilenameArbitrary(),
      documentType: validDocumentTypeArbitrary()
    });

  test('Property 31: Valid document upload data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        async (fileData) => {
          // Validate the document upload data
          const validation = validateDocumentUpload(fileData);

          // Property assertion: Valid data should pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 31: Invalid MIME type fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        invalidMimeTypeArbitrary(),
        async (fileData, invalidMimeType) => {
          // Create file data with invalid MIME type
          const invalidFileData = { ...fileData, mimeType: invalidMimeType };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Invalid MIME type should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 31: File size exceeding limit fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        invalidFileSizeArbitrary(),
        async (fileData, invalidSize) => {
          // Create file data with invalid size
          const invalidFileData = { ...fileData, size: invalidSize };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Oversized file should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('File size exceeds maximum limit of 10MB');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 31: Zero or negative file size fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        fc.constantFrom(0, -1, -100),
        async (fileData, invalidSize) => {
          // Create file data with zero or negative size
          const invalidFileData = { ...fileData, size: invalidSize };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Zero or negative size should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('File size must be greater than 0');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 31: Missing or empty filename fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (fileData, invalidFilename) => {
          // Create file data with invalid filename
          const invalidFileData = { ...fileData, originalname: invalidFilename };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Missing filename should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Filename is required');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 31: Invalid document type fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        invalidDocumentTypeArbitrary(),
        async (fileData, invalidDocumentType) => {
          // Create file data with invalid document type
          const invalidFileData = { ...fileData, documentType: invalidDocumentType };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Invalid document type should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Document type must be one of: business_license, property_photos, owner_id, tax_certificate, other');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 31: Missing MIME type fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        async (fileData) => {
          // Create file data without MIME type
          const invalidFileData = { ...fileData };
          delete invalidFileData.mimeType;

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Missing MIME type should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 31: Multiple validation errors are captured', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidMimeTypeArbitrary(),
        invalidFileSizeArbitrary(),
        invalidDocumentTypeArbitrary(),
        async (invalidMimeType, invalidSize, invalidDocumentType) => {
          // Create file data with multiple invalid fields
          const invalidFileData = {
            mimeType: invalidMimeType,
            size: invalidSize,
            originalname: '', // Invalid filename
            documentType: invalidDocumentType
          };

          // Validate the document upload data
          const validation = validateDocumentUpload(invalidFileData);

          // Property assertion: Multiple errors should be captured
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(1);
          
          // Should contain file type error
          expect(validation.errors).toContain('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.');
          
          // Should contain file size error
          expect(validation.errors).toContain('File size exceeds maximum limit of 10MB');
          
          // Should contain filename error
          expect(validation.errors).toContain('Filename is required');
          
          // Should contain document type error
          expect(validation.errors).toContain('Document type must be one of: business_license, property_photos, owner_id, tax_certificate, other');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 31: Edge case - exactly 10MB file size passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        async (fileData) => {
          // Create file data with exactly 10MB size
          const edgeCaseFileData = { ...fileData, size: 10 * 1024 * 1024 };

          // Validate the document upload data
          const validation = validateDocumentUpload(edgeCaseFileData);

          // Property assertion: Exactly 10MB should pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 31: Edge case - 1 byte over 10MB fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDocumentUploadArbitrary(),
        async (fileData) => {
          // Create file data with 1 byte over 10MB
          const edgeCaseFileData = { ...fileData, size: 10 * 1024 * 1024 + 1 };

          // Validate the document upload data
          const validation = validateDocumentUpload(edgeCaseFileData);

          // Property assertion: 1 byte over limit should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('File size exceeds maximum limit of 10MB');
        }
      ),
      { numRuns: 50 }
    );
  });
});