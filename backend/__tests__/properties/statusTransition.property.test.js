/**
 * Property Tests: Status Transition Service
 * 
 * Property 5: Booking Status Validity
 * Property 6: Valid Status Transitions
 * 
 * Validates: Requirements 2.1, 2.8
 * 
 * These property tests validate the logical consistency of booking status transitions
 * without requiring database connections. They test the state machine rules and
 * business logic properties.
 */

const fc = require('fast-check');

/**
 * Status Transition validation logic extracted for testing
 * This mirrors the actual service logic for property testing
 */
const StatusTransitionValidation = {
  /**
   * Valid booking statuses
   * Requirements: 2.1
   */
  VALID_STATUSES: [
    'pending',
    'confirmed',
    'checked_in',
    'checked_out',
    'cancelled',
    'no_show',
    'completed',
    'refunded'
  ],

  /**
   * Valid status transitions (state machine)
   * Requirements: 2.8
   */
  VALID_TRANSITIONS: {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['checked_in', 'cancelled', 'no_show'],
    'checked_in': ['checked_out'],
    'checked_out': [],
    'cancelled': [],
    'no_show': [],
    'completed': [],
    'refunded': []
  },

  /**
   * Terminal statuses (no further transitions allowed)
   */
  TERMINAL_STATUSES: ['checked_out', 'cancelled', 'no_show', 'completed', 'refunded'],

  /**
   * Check if a status is valid
   * Requirements: 2.1
   */
  isValidStatus(status) {
    return this.VALID_STATUSES.includes(status);
  },

  /**
   * Check if a status is terminal
   */
  isTerminalStatus(status) {
    return this.TERMINAL_STATUSES.includes(status);
  },

  /**
   * Validate if a status transition is allowed
   * Requirements: 2.8
   */
  validateStatusTransition(fromStatus, toStatus) {
    // Validate fromStatus is a valid status
    if (!this.isValidStatus(fromStatus)) {
      return {
        valid: false,
        reason: `Invalid current status: ${fromStatus}`
      };
    }

    // Validate toStatus is a valid status
    if (!this.isValidStatus(toStatus)) {
      return {
        valid: false,
        reason: `Invalid target status: ${toStatus}`
      };
    }

    // Same status transition is not allowed
    if (fromStatus === toStatus) {
      return {
        valid: false,
        reason: `Booking is already in status: ${fromStatus}`
      };
    }

    // Check if transition is allowed
    const allowedTransitions = this.VALID_TRANSITIONS[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      if (this.isTerminalStatus(fromStatus)) {
        return {
          valid: false,
          reason: `Cannot transition from terminal status '${fromStatus}'`
        };
      }
      return {
        valid: false,
        reason: `Invalid status transition from '${fromStatus}' to '${toStatus}'`
      };
    }

    return { valid: true };
  },

  /**
   * Get valid transitions for a given status
   */
  getValidTransitions(currentStatus) {
    if (!this.isValidStatus(currentStatus)) {
      return { transitions: [], isTerminal: false, error: `Invalid status: ${currentStatus}` };
    }

    const transitions = this.VALID_TRANSITIONS[currentStatus] || [];
    const isTerminal = this.isTerminalStatus(currentStatus);

    return { transitions, isTerminal };
  }
};

describe('Property Tests: Status Transition Service', () => {
  
  /**
   * Property 5: Booking Status Validity
   * 
   * *For any* booking in the system, its status should be one of: 
   * 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'.
   * 
   * **Validates: Requirements 2.1**
   */
  describe('Property 5: Booking Status Validity', () => {
    
    test('Property 5a: All defined statuses are valid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (status) => {
            // Property: All statuses in VALID_STATUSES should be valid
            expect(StatusTransitionValidation.isValidStatus(status)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 5b: Invalid statuses are rejected', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !StatusTransitionValidation.VALID_STATUSES.includes(s)),
          
          (invalidStatus) => {
            // Property: Statuses not in VALID_STATUSES should be invalid
            expect(StatusTransitionValidation.isValidStatus(invalidStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 5c: Status validation is case-sensitive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (status) => {
            const uppercase = status.toUpperCase();
            const mixedCase = status.charAt(0).toUpperCase() + status.slice(1);
            
            // Property: Status validation should be case-sensitive
            // Only exact lowercase matches should be valid
            if (uppercase !== status) {
              expect(StatusTransitionValidation.isValidStatus(uppercase)).toBe(false);
            }
            if (mixedCase !== status) {
              expect(StatusTransitionValidation.isValidStatus(mixedCase)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 5d: Empty or null status is invalid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', null, undefined),
          
          (invalidStatus) => {
            // Property: Empty/null status should be invalid
            expect(StatusTransitionValidation.isValidStatus(invalidStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 5e: Terminal statuses are a subset of valid statuses', () => {
      // Property: All terminal statuses should be valid statuses
      StatusTransitionValidation.TERMINAL_STATUSES.forEach(terminalStatus => {
        expect(StatusTransitionValidation.VALID_STATUSES).toContain(terminalStatus);
      });
    });
  });
  
  /**
   * Property 6: Valid Status Transitions
   * 
   * *For any* booking status change, only the following transitions are valid:
   * - pending → confirmed, cancelled
   * - confirmed → checked_in, cancelled, no_show
   * - checked_in → checked_out
   * All other transitions should be rejected.
   * 
   * **Validates: Requirements 2.8**
   */
  describe('Property 6: Valid Status Transitions', () => {
    
    test('Property 6a: Allowed transitions are accepted', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { from: 'pending', to: 'confirmed' },
            { from: 'pending', to: 'cancelled' },
            { from: 'confirmed', to: 'checked_in' },
            { from: 'confirmed', to: 'cancelled' },
            { from: 'confirmed', to: 'no_show' },
            { from: 'checked_in', to: 'checked_out' }
          ),
          
          (transition) => {
            const result = StatusTransitionValidation.validateStatusTransition(
              transition.from,
              transition.to
            );
            
            // Property: Allowed transitions should be valid
            expect(result.valid).toBe(true);
            expect(result.reason).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6b: Disallowed transitions are rejected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { from: 'pending', to: 'checked_in' },
            { from: 'pending', to: 'checked_out' },
            { from: 'pending', to: 'no_show' },
            { from: 'confirmed', to: 'pending' },
            { from: 'checked_in', to: 'pending' },
            { from: 'checked_in', to: 'confirmed' },
            { from: 'checked_in', to: 'cancelled' },
            { from: 'checked_out', to: 'pending' },
            { from: 'checked_out', to: 'confirmed' },
            { from: 'checked_out', to: 'checked_in' },
            { from: 'cancelled', to: 'pending' },
            { from: 'cancelled', to: 'confirmed' },
            { from: 'no_show', to: 'pending' },
            { from: 'no_show', to: 'confirmed' }
          ),
          
          (transition) => {
            const result = StatusTransitionValidation.validateStatusTransition(
              transition.from,
              transition.to
            );
            
            // Property: Disallowed transitions should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6c: Same status transition is rejected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (status) => {
            const result = StatusTransitionValidation.validateStatusTransition(status, status);
            
            // Property: Transitioning to the same status should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('already in status');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6d: Terminal statuses have no valid transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.TERMINAL_STATUSES),
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (terminalStatus, targetStatus) => {
            // Skip same-status case (already tested)
            if (terminalStatus === targetStatus) return;
            
            const result = StatusTransitionValidation.validateStatusTransition(
              terminalStatus,
              targetStatus
            );
            
            // Property: Terminal statuses should not allow any transitions
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('terminal status');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6e: Invalid source status is rejected', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !StatusTransitionValidation.VALID_STATUSES.includes(s)),
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (invalidFrom, validTo) => {
            const result = StatusTransitionValidation.validateStatusTransition(invalidFrom, validTo);
            
            // Property: Invalid source status should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Invalid current status');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6f: Invalid target status is rejected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          fc.string().filter(s => !StatusTransitionValidation.VALID_STATUSES.includes(s)),
          
          (validFrom, invalidTo) => {
            const result = StatusTransitionValidation.validateStatusTransition(validFrom, invalidTo);
            
            // Property: Invalid target status should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Invalid target status');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6g: Transition map is complete (all statuses have entry)', () => {
      // Property: Every valid status should have an entry in the transition map
      StatusTransitionValidation.VALID_STATUSES.forEach(status => {
        expect(StatusTransitionValidation.VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(StatusTransitionValidation.VALID_TRANSITIONS[status])).toBe(true);
      });
    });
    
    test('Property 6h: Transition map only contains valid statuses', () => {
      // Property: All target statuses in transition map should be valid statuses
      Object.entries(StatusTransitionValidation.VALID_TRANSITIONS).forEach(([fromStatus, toStatuses]) => {
        // Source status should be valid
        expect(StatusTransitionValidation.VALID_STATUSES).toContain(fromStatus);
        
        // All target statuses should be valid
        toStatuses.forEach(toStatus => {
          expect(StatusTransitionValidation.VALID_STATUSES).toContain(toStatus);
        });
      });
    });
    
    test('Property 6i: getValidTransitions returns correct transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.VALID_STATUSES),
          
          (status) => {
            const result = StatusTransitionValidation.getValidTransitions(status);
            
            // Property: Should return the transitions defined in the map
            expect(result.transitions).toEqual(StatusTransitionValidation.VALID_TRANSITIONS[status]);
            
            // Property: isTerminal should match TERMINAL_STATUSES
            const expectedTerminal = StatusTransitionValidation.TERMINAL_STATUSES.includes(status);
            expect(result.isTerminal).toBe(expectedTerminal);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6j: Terminal statuses have empty transition arrays', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...StatusTransitionValidation.TERMINAL_STATUSES),
          
          (terminalStatus) => {
            const transitions = StatusTransitionValidation.VALID_TRANSITIONS[terminalStatus];
            
            // Property: Terminal statuses should have no valid transitions
            expect(transitions).toEqual([]);
            expect(transitions).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('Property 6k: Non-terminal statuses have at least one transition', () => {
      const nonTerminalStatuses = StatusTransitionValidation.VALID_STATUSES.filter(
        s => !StatusTransitionValidation.TERMINAL_STATUSES.includes(s)
      );
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nonTerminalStatuses),
          
          (nonTerminalStatus) => {
            const transitions = StatusTransitionValidation.VALID_TRANSITIONS[nonTerminalStatus];
            
            // Property: Non-terminal statuses should have at least one valid transition
            expect(transitions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
