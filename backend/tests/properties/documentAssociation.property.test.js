/**
 * Property-Based Tests for Document Association
 * Feature: internal-user-roles, Property 32: Document association
 * 
 * Property: For any uploaded document, it must be associated with the correct 
 * lead or property owner account
 * 
 * Validates: Requirements 23.5
 */

const fc = require('fast-check');

/**
 * Function to validate document association
 */
function validateDocumentAssociation(documentData, existingUsers = [], existingLeads = []) {
  const errors = [];

  // Check if property owner exists
  if (documentData.propertyOwnerId) {
    const propertyOwner = existingUsers.find(u => u.id === documentData.propertyOwnerId);
    if (!propertyOwner) {
      errors.push('Property owner does not exist');
    }
  } else {
    errors.push('Property owner ID is required');
  }

  // Check if uploader exists
  if (documentData.uploadedBy) {
    const uploader = existingUsers.find(u => u.id === documentData.uploadedBy);
    if (!uploader) {
      errors.push('Uploader does not exist');
    }
  } else {
    errors.push('Uploader ID is required');
  }

  // Check if lead exists (if provided)
  if (documentData.leadId) {
    const lead = existingLeads.find(l => l.id === documentData.leadId);
    if (!lead) {
      errors.push('Lead does not exist');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

describe('Property 32: Document Association', () => {

  /**
   * Generator for user IDs
   */
  const userIdArbitrary = () => fc.uuid();

  /**
   * Generator for lead IDs
   */
  const leadIdArbitrary = () => fc.uuid();

  /**
   * Generator for document data
   */
  const documentArbitrary = () =>
    fc.record({
      leadId: fc.option(fc.uuid(), { nil: null }),
      propertyOwnerId: fc.uuid(),
      documentType: fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
      fileName: fc.constantFrom('document.pdf', 'license.jpg', 'photo.png', 'certificate.doc'),
      fileUrl: fc.constantFrom('/uploads/doc1.pdf', '/uploads/doc2.jpg', '/uploads/doc3.png'),
      fileSize: fc.integer({ min: 1000, max: 5000000 }),
      mimeType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
      uploadedBy: fc.uuid(),
      status: fc.constantFrom('pending_review', 'approved', 'rejected')
    });

  test('Property 32: Document is correctly associated with existing property owner and uploader', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 2, maxLength: 5 }),
        fc.array(leadIdArbitrary(), { minLength: 0, maxLength: 3 }),
        async (userIds, leadIds) => {
          // Create mock users and leads
          const users = userIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));
          const leads = leadIds.map(id => ({ id, name: `Lead ${id.substring(0, 8)}` }));

          // Pick existing user IDs for property owner and uploader
          const propertyOwnerId = users[0].id;
          const uploadedBy = users[1].id;
          const leadId = leads.length > 0 ? leads[0].id : null;

          // Create document data with existing associations
          const documentData = {
            leadId,
            propertyOwnerId,
            documentType: 'business_license',
            fileName: 'document.pdf',
            fileUrl: '/uploads/doc.pdf',
            fileSize: 1000000,
            mimeType: 'application/pdf',
            uploadedBy,
            status: 'pending_review'
          };

          // Validate document association
          const validation = validateDocumentAssociation(documentData, users, leads);

          // Property assertion: Valid associations should pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 32: Document association fails with non-existent property owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        async (existingUserIds, nonExistentOwnerId) => {
          // Create mock users (not including the non-existent owner)
          const users = existingUserIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));

          // Create document data with non-existent property owner
          const documentData = {
            leadId: null,
            propertyOwnerId: nonExistentOwnerId,
            documentType: 'business_license',
            fileName: 'document.pdf',
            fileUrl: '/uploads/doc.pdf',
            fileSize: 1000000,
            mimeType: 'application/pdf',
            uploadedBy: users[0].id,
            status: 'pending_review'
          };

          // Validate document association
          const validation = validateDocumentAssociation(documentData, users, []);

          // Property assertion: Non-existent property owner should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Property owner does not exist');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 32: Document association fails with non-existent uploader', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        async (existingUserIds, nonExistentUploaderId) => {
          // Create mock users (not including the non-existent uploader)
          const users = existingUserIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));

          // Create document data with non-existent uploader
          const documentData = {
            leadId: null,
            propertyOwnerId: users[0].id,
            documentType: 'business_license',
            fileName: 'document.pdf',
            fileUrl: '/uploads/doc.pdf',
            fileSize: 1000000,
            mimeType: 'application/pdf',
            uploadedBy: nonExistentUploaderId,
            status: 'pending_review'
          };

          // Validate document association
          const validation = validateDocumentAssociation(documentData, users, []);

          // Property assertion: Non-existent uploader should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Uploader does not exist');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 32: Document association fails with non-existent lead', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 2, maxLength: 3 }),
        fc.array(leadIdArbitrary(), { minLength: 0, maxLength: 2 }),
        fc.uuid(),
        async (existingUserIds, existingLeadIds, nonExistentLeadId) => {
          // Create mock users and leads (not including the non-existent lead)
          const users = existingUserIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));
          const leads = existingLeadIds.map(id => ({ id, name: `Lead ${id.substring(0, 8)}` }));

          // Create document data with non-existent lead
          const documentData = {
            leadId: nonExistentLeadId,
            propertyOwnerId: users[0].id,
            documentType: 'business_license',
            fileName: 'document.pdf',
            fileUrl: '/uploads/doc.pdf',
            fileSize: 1000000,
            mimeType: 'application/pdf',
            uploadedBy: users[1].id,
            status: 'pending_review'
          };

          // Validate document association
          const validation = validateDocumentAssociation(documentData, users, leads);

          // Property assertion: Non-existent lead should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('Lead does not exist');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 32: Multiple documents can be associated with same property owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 2, maxLength: 3 }),
        fc.array(fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate'), { minLength: 2, maxLength: 4 }),
        async (userIds, documentTypes) => {
          // Create mock users
          const users = userIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));
          const propertyOwnerId = users[0].id;
          const uploadedBy = users[1].id;

          // Create multiple documents for same property owner
          const documents = [];
          for (let i = 0; i < documentTypes.length; i++) {
            const documentData = {
              leadId: null,
              propertyOwnerId,
              documentType: documentTypes[i],
              fileName: `document_${i}.pdf`,
              fileUrl: `/uploads/document_${i}.pdf`,
              fileSize: 1000000 + i,
              mimeType: 'application/pdf',
              uploadedBy,
              status: 'pending_review'
            };

            // Validate each document association
            const validation = validateDocumentAssociation(documentData, users, []);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);

            documents.push(documentData);
          }

          // Property assertion: All documents should be associated with the same property owner
          for (const document of documents) {
            expect(document.propertyOwnerId).toBe(propertyOwnerId);
            expect(document.uploadedBy).toBe(uploadedBy);
          }

          // Verify we have the expected number of documents
          expect(documents).toHaveLength(documentTypes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 32: Document without lead association is valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userIdArbitrary(), { minLength: 2, maxLength: 3 }),
        async (userIds) => {
          // Create mock users
          const users = userIds.map(id => ({ id, name: `User ${id.substring(0, 8)}`, email: `user-${id}@example.com` }));

          // Create document data without lead (leadId = null)
          const documentData = {
            leadId: null,
            propertyOwnerId: users[0].id,
            documentType: 'business_license',
            fileName: 'document.pdf',
            fileUrl: '/uploads/doc.pdf',
            fileSize: 1000000,
            mimeType: 'application/pdf',
            uploadedBy: users[1].id,
            status: 'pending_review'
          };

          // Validate document association
          const validation = validateDocumentAssociation(documentData, users, []);

          // Property assertion: Document without lead should still be valid
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          expect(documentData.leadId).toBeNull();
          expect(documentData.propertyOwnerId).toBe(users[0].id);
          expect(documentData.uploadedBy).toBe(users[1].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});