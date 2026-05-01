/**
 * Property Tests: GuestService
 * 
 * Property 2: Contact Information Validation
 * Property 9: ID Number Format Validation
 * 
 * Validates: Requirements 1.3, 3.4
 * 
 * These property tests validate the logical consistency of guest service operations
 * without requiring database connections. They test validation rules, data structures,
 * and business logic properties.
 */

const fc = require('fast-check');

/**
 * GuestService validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const GuestValidation = {
  /**
   * ID validation patterns for different ID types
   * Requirements: 3.4
   */
  ID_PATTERNS: {
    aadhaar: {
      pattern: /^[0-9]{12}$/,
      description: '12 digits',
      example: '123456789012'
    },
    pan: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      description: '10 alphanumeric (format: AAAAA9999A)',
      example: 'ABCDE1234F'
    },
    passport: {
      pattern: /^[A-Z0-9]{6,9}$/,
      description: '6-9 alphanumeric characters',
      example: 'A1234567'
    },
    driving_license: {
      pattern: /^[A-Z0-9]{10,20}$/,
      description: '10-20 alphanumeric characters',
      example: 'DL1420110012345'
    },
    voter_id: {
      pattern: /^[A-Z]{3}[0-9]{7}$/,
      description: '10 alphanumeric (format: AAA9999999)',
      example: 'ABC1234567'
    }
  },

  /**
   * Validate phone number format
   * Requirements: 1.3
   * 
   * @param {string} phone - Phone number
   * @returns {boolean}
   */
  validatePhone(phone) {
    if (!phone) return false;
    const normalizedPhone = phone.replace(/\D/g, '');
    return /^[0-9]{10}$/.test(normalizedPhone);
  },

  /**
   * Validate email format
   * Requirements: 1.3
   * 
   * @param {string} email - Email address
   * @returns {boolean}
   */
  validateEmail(email) {
    if (!email) return false;
    return /^\S+@\S+\.\S+$/.test(email.trim());
  },

  /**
   * Validate ID number format based on ID type
   * Requirements: 3.4
   * 
   * @param {string} idType - Type of ID
   * @param {string} idNumber - ID number to validate
   * @returns {{valid: boolean, message?: string, normalizedIdNumber?: string}}
   */
  validateIdNumber(idType, idNumber) {
    if (!idType || !idNumber) {
      return { valid: false, message: 'ID type and number are required' };
    }

    const idConfig = this.ID_PATTERNS[idType];
    if (!idConfig) {
      return { valid: false, message: `Invalid ID type: ${idType}` };
    }

    const normalizedIdNumber = idNumber.toUpperCase().replace(/\s/g, '');
    
    if (!idConfig.pattern.test(normalizedIdNumber)) {
      return {
        valid: false,
        message: `Invalid ${idType.replace('_', ' ')} format. Expected: ${idConfig.description} (e.g., ${idConfig.example})`
      };
    }

    return { valid: true, normalizedIdNumber };
  },

  /**
   * Validate guest information
   * Requirements: 1.3, 3.4
   */
  validateGuestInfo(guestInfo) {
    const errors = [];

    // Validate name
    if (!guestInfo.name || guestInfo.name.trim().length < 2) {
      errors.push('Name is required (minimum 2 characters)');
    }

    // Validate phone
    if (!guestInfo.phone) {
      errors.push('Phone number is required');
    } else if (!this.validatePhone(guestInfo.phone)) {
      errors.push('Invalid phone number format. Must be 10 digits.');
    }

    // Validate email if provided
    if (guestInfo.email && !this.validateEmail(guestInfo.email)) {
      errors.push('Invalid email format');
    }

    // Validate ID if provided
    if (guestInfo.idType && guestInfo.idNumber) {
      const idValidation = this.validateIdNumber(guestInfo.idType, guestInfo.idNumber);
      if (!idValidation.valid) {
        errors.push(idValidation.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

describe('Property Tests: GuestService', () => {
  
  /**
   * Property 2: Contact Information Validation
   * 
   * *For any* phone number input, the system should accept only 10-digit numeric strings. 
   * *For any* email input, the system should accept only strings matching the email format pattern.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Contact Information Validation', () => {
    
    test('Property 2a: Valid 10-digit phone numbers are accepted', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[0-9]{10}$/),
          
          (phone) => {
            // Property: 10-digit numeric strings should be valid
            expect(GuestValidation.validatePhone(phone)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2b: Phone numbers with non-digit characters are normalized and validated', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[0-9]{10}$/),
          fc.constantFrom(' ', '-', '(', ')', '+'),
          
          (digits, separator) => {
            // Insert separators into phone number
            const formattedPhone = digits.slice(0, 3) + separator + digits.slice(3, 6) + separator + digits.slice(6);
            
            // Property: Phone with separators should still be valid after normalization
            expect(GuestValidation.validatePhone(formattedPhone)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2c: Phone numbers with incorrect length are rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }).filter(n => n !== 10),
          
          (length) => {
            const phone = '1'.repeat(length);
            
            // Property: Phone numbers not exactly 10 digits should be invalid
            expect(GuestValidation.validatePhone(phone)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2d: Empty or null phone numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', null, undefined),
          
          (invalidPhone) => {
            // Property: Empty/null phone should be invalid
            expect(GuestValidation.validatePhone(invalidPhone)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2e: Valid email formats are accepted', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          
          (email) => {
            // Property: Valid email addresses should be accepted
            expect(GuestValidation.validateEmail(email)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2f: Invalid email formats are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('notanemail'),
            fc.constant('missing@domain'),
            fc.constant('@nodomain.com'),
            fc.constant('no-at-sign.com'),
            fc.constant('spaces in@email.com')
          ),
          
          (invalidEmail) => {
            // Property: Invalid email formats should be rejected
            expect(GuestValidation.validateEmail(invalidEmail)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2g: Email validation handles whitespace', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          
          (email) => {
            const emailWithSpaces = `  ${email}  `;
            
            // Property: Email with leading/trailing spaces should still be valid
            expect(GuestValidation.validateEmail(emailWithSpaces)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 2h: Empty or null emails are rejected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', null, undefined),
          
          (invalidEmail) => {
            // Property: Empty/null email should be invalid
            expect(GuestValidation.validateEmail(invalidEmail)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 9: ID Number Format Validation
   * 
   * *For any* ID type and ID number combination:
   * - Aadhaar: 12 digits
   * - PAN: 10 alphanumeric (format: AAAAA9999A)
   * - Passport: alphanumeric, 6-9 characters
   * - Driving License: alphanumeric, 10-20 characters
   * - Voter ID: 10 alphanumeric (format: AAA9999999)
   * The system should validate according to the ID type.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 9: ID Number Format Validation', () => {
    
    test('Property 9a: Valid Aadhaar numbers (12 digits) are accepted', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[0-9]{12}$/),
          
          (aadhaar) => {
            const result = GuestValidation.validateIdNumber('aadhaar', aadhaar);
            
            // Property: 12-digit Aadhaar should be valid
            expect(result.valid).toBe(true);
            expect(result.normalizedIdNumber).toBe(aadhaar);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9b: Invalid Aadhaar numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.stringMatching(/^[0-9]{11}$/),  // Too short
            fc.stringMatching(/^[0-9]{13}$/),  // Too long
            fc.stringMatching(/^[A-Z]{12}$/)   // Letters instead of digits
          ),
          
          (invalidAadhaar) => {
            const result = GuestValidation.validateIdNumber('aadhaar', invalidAadhaar);
            
            // Property: Invalid Aadhaar should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9c: Valid PAN numbers (AAAAA9999A format) are accepted', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
          
          (pan) => {
            const result = GuestValidation.validateIdNumber('pan', pan);
            
            // Property: Valid PAN format should be accepted
            expect(result.valid).toBe(true);
            expect(result.normalizedIdNumber).toBe(pan);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9d: Invalid PAN numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.stringMatching(/^[0-9]{10}$/),      // All digits
            fc.stringMatching(/^[A-Z]{10}$/),      // All letters
            fc.stringMatching(/^[A-Z]{5}[0-9]{5}$/) // Wrong format
          ),
          
          (invalidPan) => {
            const result = GuestValidation.validateIdNumber('pan', invalidPan);
            
            // Property: Invalid PAN should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9e: Valid Passport numbers (6-9 alphanumeric) are accepted', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 6, max: 9 }),
          
          (length) => {
            // Generate valid passport number
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let passport = '';
            for (let i = 0; i < length; i++) {
              passport += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            const result = GuestValidation.validateIdNumber('passport', passport);
            
            // Property: 6-9 character alphanumeric passport should be valid
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9f: Invalid Passport numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.stringMatching(/^[A-Z0-9]{5}$/),   // Too short
            fc.stringMatching(/^[A-Z0-9]{10}$/),  // Too long
            fc.stringMatching(/^[a-z]{7}$/)       // Lowercase (should be uppercase)
          ),
          
          (invalidPassport) => {
            const result = GuestValidation.validateIdNumber('passport', invalidPassport);
            
            // Property: Invalid passport should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9g: Valid Driving License numbers (10-20 alphanumeric) are accepted', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 20 }),
          
          (length) => {
            // Generate valid driving license number
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let dl = '';
            for (let i = 0; i < length; i++) {
              dl += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            const result = GuestValidation.validateIdNumber('driving_license', dl);
            
            // Property: 10-20 character alphanumeric DL should be valid
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9h: Invalid Driving License numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.stringMatching(/^[A-Z0-9]{9}$/),   // Too short
            fc.stringMatching(/^[A-Z0-9]{21}$/),  // Too long
            fc.stringMatching(/^[a-z]{15}$/)      // Lowercase
          ),
          
          (invalidDL) => {
            const result = GuestValidation.validateIdNumber('driving_license', invalidDL);
            
            // Property: Invalid DL should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9i: Valid Voter ID numbers (AAA9999999 format) are accepted', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Z]{3}[0-9]{7}$/),
          
          (voterId) => {
            const result = GuestValidation.validateIdNumber('voter_id', voterId);
            
            // Property: Valid Voter ID format should be accepted
            expect(result.valid).toBe(true);
            expect(result.normalizedIdNumber).toBe(voterId);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9j: Invalid Voter ID numbers are rejected', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.stringMatching(/^[0-9]{10}$/),      // All digits
            fc.stringMatching(/^[A-Z]{10}$/),      // All letters
            fc.stringMatching(/^[A-Z]{4}[0-9]{6}$/) // Wrong format
          ),
          
          (invalidVoterId) => {
            const result = GuestValidation.validateIdNumber('voter_id', invalidVoterId);
            
            // Property: Invalid Voter ID should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9k: ID validation normalizes input (removes spaces, converts to uppercase)', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
          
          (pan) => {
            // Add spaces and convert to lowercase
            const panWithSpaces = pan.slice(0, 5) + ' ' + pan.slice(5, 9) + ' ' + pan.slice(9);
            const panLowercase = panWithSpaces.toLowerCase();
            
            const result = GuestValidation.validateIdNumber('pan', panLowercase);
            
            // Property: Normalization should handle spaces and case
            expect(result.valid).toBe(true);
            expect(result.normalizedIdNumber).toBe(pan);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9l: Missing ID type or number returns invalid', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ idType: null, idNumber: '123456789012' }),
            fc.constant({ idType: 'aadhaar', idNumber: null }),
            fc.constant({ idType: null, idNumber: null })
          ),
          
          (invalidInput) => {
            const result = GuestValidation.validateIdNumber(invalidInput.idType, invalidInput.idNumber);
            
            // Property: Missing ID type or number should be invalid
            expect(result.valid).toBe(false);
            expect(result.message).toBe('ID type and number are required');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 9m: Invalid ID type returns error', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id'].includes(s)),
          fc.stringMatching(/^[A-Z0-9]{10}$/),
          
          (invalidType, idNumber) => {
            const result = GuestValidation.validateIdNumber(invalidType, idNumber);
            
            // Property: Invalid ID type should be rejected
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Invalid ID type');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
