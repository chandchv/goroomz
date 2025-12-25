/**
 * Property-Based Tests for Required Document Enforcement
 * Feature: internal-user-roles, Property 33: Required document enforcement
 * 
 * Property: For any property onboarding, if required documents are missing, 
 * the onboarding completion should be blocked
 * 
 * Validates: Requirements 23.4
 */

const fc = require('fast-check');

/**
 * Function to check if onboarding can be completed based on required documents
 */
function canCompleteOnboarding(documents, requiredDocumentTypes) {
  const errors = [];
  const uploadedDocumentTypes = documents.map(doc => doc.documentType);
  
  // Check if all required document types are present
  for (const requiredType of requiredDocumentTypes) {
    if (!uploadedDocumentTypes.includes(requiredType)) {
      errors.push(`Missing required document: ${requiredType}`);
    }
  }

  // Check if all uploaded documents are approved
  for (const document of documents) {
    if (document.status !== 'approved') {
      errors.push(`Document ${document.fileName} (${document.documentType}) is not approved`);
    }
  }

  return {
    canComplete: errors.length === 0,
    errors
  };
}

/**
 * Function to validate document completeness for onboarding
 */
function validateOnboardingDocuments(leadData, documents) {
  const errors = [];
  
  // Define required documents based on property type
  let requiredDocumentTypes = [];
  
  if (leadData.propertyType === 'hotel') {
    requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
  } else if (leadData.propertyType === 'pg') {
    requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
  }

  // Check document completeness
  const completionCheck = canCompleteOnboarding(documents, requiredDocumentTypes);
  
  if (!completionCheck.canComplete) {
    errors.push(...completionCheck.errors);
  }

  // Additional validation: ensure at least one property photo
  const propertyPhotos = documents.filter(doc => doc.documentType === 'property_photos');
  if (propertyPhotos.length === 0) {
    errors.push('At least one property photo is required');
  }

  return {
    isValid: errors.length === 0,
    canComplete: completionCheck.canComplete,
    errors,
    requiredDocumentTypes
  };
}

describe('Property 33: Required Document Enforcement', () => {
  /**
   * Generator for lead data
   */
  const leadArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      propertyOwnerName: fc.constantFrom('Property Owner 1', 'Property Owner 2', 'Business Owner'),
      email: fc.tuple(
        fc.constantFrom('owner', 'business', 'property'),
        fc.integer({ min: 1000, max: 9999 }),
        fc.constantFrom('example.com', 'test.com')
      ).map(([name, num, domain]) => `${name}${num}@${domain}`),
      businessName: fc.option(fc.constantFrom('Hotel ABC', 'PG XYZ', 'Business Inn'), { nil: null }),
      propertyType: fc.constantFrom('hotel', 'pg'),
      city: fc.constantFrom('Mumbai', 'Delhi', 'Bangalore'),
      state: fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka'),
      status: fc.constantFrom('in_progress', 'pending_approval')
    });

  /**
   * Generator for document data
   */
  const documentArbitrary = () =>
    fc.record({
      id: fc.uuid(),
      documentType: fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
      fileName: fc.tuple(
        fc.constantFrom('license', 'photo', 'id', 'certificate', 'document'),
        fc.integer({ min: 1, max: 999 }),
        fc.constantFrom('pdf', 'jpg', 'png', 'doc')
      ).map(([name, num, ext]) => `${name}_${num}.${ext}`),
      fileUrl: fc.constantFrom('/uploads/doc1.pdf', '/uploads/doc2.jpg', '/uploads/doc3.png'),
      fileSize: fc.integer({ min: 1000, max: 5000000 }),
      mimeType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
      status: fc.constantFrom('pending_review', 'approved', 'rejected')
    });

  test('Property 33: Onboarding with all required documents approved can be completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        async (leadData) => {
          // Determine required documents based on property type
          let requiredDocumentTypes = [];
          if (leadData.propertyType === 'hotel') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
          } else if (leadData.propertyType === 'pg') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
          }

          // Create approved documents for all required types
          const documents = requiredDocumentTypes.map((docType, index) => ({
            id: `doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: 'approved'
          }));

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Complete and approved documents should allow onboarding completion
          expect(validation.isValid).toBe(true);
          expect(validation.canComplete).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Onboarding with missing required documents cannot be completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.array(fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate'), { minLength: 1, maxLength: 3 }),
        async (leadData, availableDocumentTypes) => {
          // Determine required documents based on property type
          let requiredDocumentTypes = [];
          if (leadData.propertyType === 'hotel') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
          } else if (leadData.propertyType === 'pg') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
          }

          // Only provide some of the required documents (ensure at least one is missing)
          const providedDocumentTypes = availableDocumentTypes.filter(type => 
            requiredDocumentTypes.includes(type)
          ).slice(0, requiredDocumentTypes.length - 1); // Ensure at least one is missing

          // Create approved documents for only some required types
          const documents = providedDocumentTypes.map((docType, index) => ({
            id: `doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: 'approved'
          }));

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Missing required documents should block onboarding completion
          expect(validation.canComplete).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);

          // Check that the error mentions missing documents
          const missingDocuments = requiredDocumentTypes.filter(type => 
            !providedDocumentTypes.includes(type)
          );
          
          for (const missingDoc of missingDocuments) {
            expect(validation.errors.some(error => 
              error.includes(`Missing required document: ${missingDoc}`)
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Onboarding with unapproved required documents cannot be completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.constantFrom('pending_review', 'rejected'),
        async (leadData, unapprovedStatus) => {
          // Determine required documents based on property type
          let requiredDocumentTypes = [];
          if (leadData.propertyType === 'hotel') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
          } else if (leadData.propertyType === 'pg') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
          }

          // Create documents for all required types, but with at least one not approved
          const documents = requiredDocumentTypes.map((docType, index) => ({
            id: `doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: index === 0 ? unapprovedStatus : 'approved' // First document is not approved
          }));

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Unapproved documents should block onboarding completion
          expect(validation.canComplete).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);

          // Check that the error mentions the unapproved document
          expect(validation.errors.some(error => 
            error.includes('is not approved')
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Hotel properties require fewer documents than PG properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('hotel', 'pg'),
        async (propertyType) => {
          const leadData = {
            id: 'test-lead',
            propertyOwnerName: 'Test Owner',
            email: 'test@example.com',
            businessName: 'Test Business',
            propertyType,
            city: 'Mumbai',
            state: 'Maharashtra',
            status: 'in_progress'
          };

          // Validate with empty documents to see required document types
          const validation = validateOnboardingDocuments(leadData, []);

          // Property assertion: Different property types have different requirements
          if (propertyType === 'hotel') {
            // Hotel should require: business_license, property_photos, owner_id
            expect(validation.requiredDocumentTypes).toEqual(['business_license', 'property_photos', 'owner_id']);
            expect(validation.requiredDocumentTypes).toHaveLength(3);
          } else if (propertyType === 'pg') {
            // PG should require: business_license, property_photos, owner_id, tax_certificate
            expect(validation.requiredDocumentTypes).toEqual(['business_license', 'property_photos', 'owner_id', 'tax_certificate']);
            expect(validation.requiredDocumentTypes).toHaveLength(4);
          }

          expect(validation.canComplete).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 33: Property photos are always required regardless of other documents', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.array(fc.constantFrom('business_license', 'owner_id', 'tax_certificate', 'other'), { minLength: 1, maxLength: 3 }),
        async (leadData, nonPhotoDocumentTypes) => {
          // Create documents for non-photo types only
          const documents = nonPhotoDocumentTypes.map((docType, index) => ({
            id: `doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: 'approved'
          }));

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Missing property photos should always cause validation failure
          expect(validation.canComplete).toBe(false);
          expect(validation.errors.some(error => 
            error.includes('At least one property photo is required') ||
            error.includes('Missing required document: property_photos')
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Extra non-required documents do not affect onboarding completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.array(fc.constantFrom('other'), { minLength: 1, maxLength: 3 }),
        async (leadData, extraDocumentTypes) => {
          // Determine required documents based on property type
          let requiredDocumentTypes = [];
          if (leadData.propertyType === 'hotel') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
          } else if (leadData.propertyType === 'pg') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
          }

          // Create approved documents for all required types
          const requiredDocuments = requiredDocumentTypes.map((docType, index) => ({
            id: `req-doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: 'approved'
          }));

          // Add extra non-required documents
          const extraDocuments = extraDocumentTypes.map((docType, index) => ({
            id: `extra-doc-${index}`,
            documentType: docType,
            fileName: `${docType}_extra_${index}.pdf`,
            fileUrl: `/uploads/${docType}_extra_${index}.pdf`,
            fileSize: 500000 + index,
            mimeType: 'application/pdf',
            status: 'approved'
          }));

          const allDocuments = [...requiredDocuments, ...extraDocuments];

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, allDocuments);

          // Property assertion: Extra documents should not prevent onboarding completion
          expect(validation.isValid).toBe(true);
          expect(validation.canComplete).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Mixed document statuses block completion if any required document is not approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.array(fc.constantFrom('pending_review', 'rejected'), { minLength: 1, maxLength: 2 }),
        async (leadData, unapprovedStatuses) => {
          // Determine required documents based on property type
          let requiredDocumentTypes = [];
          if (leadData.propertyType === 'hotel') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id'];
          } else if (leadData.propertyType === 'pg') {
            requiredDocumentTypes = ['business_license', 'property_photos', 'owner_id', 'tax_certificate'];
          }

          // Create documents with mixed statuses
          const documents = requiredDocumentTypes.map((docType, index) => ({
            id: `doc-${index}`,
            documentType: docType,
            fileName: `${docType}_${index}.pdf`,
            fileUrl: `/uploads/${docType}_${index}.pdf`,
            fileSize: 1000000 + index,
            mimeType: 'application/pdf',
            status: index < unapprovedStatuses.length ? unapprovedStatuses[index] : 'approved'
          }));

          // Validate onboarding documents
          const validation = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Any unapproved required document should block completion
          if (unapprovedStatuses.length > 0) {
            expect(validation.canComplete).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors.some(error => 
              error.includes('is not approved')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 33: Document validation is consistent across multiple validation calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        leadArbitrary(),
        fc.array(documentArbitrary(), { minLength: 1, maxLength: 5 }),
        async (leadData, documents) => {
          // Validate the same data multiple times
          const validation1 = validateOnboardingDocuments(leadData, documents);
          const validation2 = validateOnboardingDocuments(leadData, documents);
          const validation3 = validateOnboardingDocuments(leadData, documents);

          // Property assertion: Validation should be deterministic and consistent
          expect(validation1.isValid).toBe(validation2.isValid);
          expect(validation1.isValid).toBe(validation3.isValid);
          expect(validation1.canComplete).toBe(validation2.canComplete);
          expect(validation1.canComplete).toBe(validation3.canComplete);
          expect(validation1.errors).toEqual(validation2.errors);
          expect(validation1.errors).toEqual(validation3.errors);
          expect(validation1.requiredDocumentTypes).toEqual(validation2.requiredDocumentTypes);
          expect(validation1.requiredDocumentTypes).toEqual(validation3.requiredDocumentTypes);
        }
      ),
      { numRuns: 100 }
    );
  });
});