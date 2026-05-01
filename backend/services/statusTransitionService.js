/**
 * Status Transition Service
 * 
 * Handles booking status state machine validation and transitions
 * Requirements: 2.8
 */

/**
 * Valid booking status transitions
 * Based on the state machine defined in the design document:
 * - pending → confirmed, cancelled
 * - confirmed → checked_in, cancelled, no_show
 * - checked_in → checked_out
 * - checked_out, cancelled, no_show → (terminal states)
 */
const VALID_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['completed', 'cancelled'],
  'completed': ['refunded'],
  'cancelled': [],
  'refunded': []
};

/**
 * All valid booking statuses
 */
const VALID_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
];

/**
 * Terminal statuses (no further transitions allowed)
 */
const TERMINAL_STATUSES = ['cancelled', 'completed', 'refunded'];

class StatusTransitionService {
  /**
   * Validate if a status transition is allowed
   * Requirements: 2.8
   * 
   * @param {string} fromStatus - Current booking status
   * @param {string} toStatus - Target booking status
   * @returns {{valid: boolean, reason?: string}}
   */
  validateStatusTransition(fromStatus, toStatus) {
    // Validate fromStatus is a valid status
    if (!VALID_STATUSES.includes(fromStatus)) {
      return {
        valid: false,
        reason: `Invalid current status: ${fromStatus}. Valid statuses are: ${VALID_STATUSES.join(', ')}`
      };
    }

    // Validate toStatus is a valid status
    if (!VALID_STATUSES.includes(toStatus)) {
      return {
        valid: false,
        reason: `Invalid target status: ${toStatus}. Valid statuses are: ${VALID_STATUSES.join(', ')}`
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
    const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      if (TERMINAL_STATUSES.includes(fromStatus)) {
        return {
          valid: false,
          reason: `Cannot transition from terminal status '${fromStatus}'. No further status changes allowed.`
        };
      }
      return {
        valid: false,
        reason: `Invalid status transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'}`
      };
    }

    return { valid: true };
  }

  /**
   * Get valid transitions for a given status
   * Requirements: 2.8
   * 
   * @param {string} currentStatus - Current booking status
   * @returns {{transitions: string[], isTerminal: boolean}}
   */
  getValidTransitions(currentStatus) {
    if (!VALID_STATUSES.includes(currentStatus)) {
      return { transitions: [], isTerminal: false, error: `Invalid status: ${currentStatus}` };
    }

    const transitions = VALID_TRANSITIONS[currentStatus] || [];
    const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

    return { transitions, isTerminal };
  }

  /**
   * Check if a status is valid
   * 
   * @param {string} status - Status to check
   * @returns {boolean}
   */
  isValidStatus(status) {
    return VALID_STATUSES.includes(status);
  }

  /**
   * Check if a status is terminal (no further transitions)
   * 
   * @param {string} status - Status to check
   * @returns {boolean}
   */
  isTerminalStatus(status) {
    return TERMINAL_STATUSES.includes(status);
  }

  /**
   * Get all valid statuses
   * 
   * @returns {string[]}
   */
  getAllStatuses() {
    return [...VALID_STATUSES];
  }

  /**
   * Get all terminal statuses
   * 
   * @returns {string[]}
   */
  getTerminalStatuses() {
    return [...TERMINAL_STATUSES];
  }

  /**
   * Get the complete transition map
   * 
   * @returns {Object}
   */
  getTransitionMap() {
    return { ...VALID_TRANSITIONS };
  }

  /**
   * Check if transition from status A to status B is possible
   * (possibly through intermediate states)
   * 
   * @param {string} fromStatus - Starting status
   * @param {string} toStatus - Target status
   * @returns {{possible: boolean, path?: string[]}}
   */
  findTransitionPath(fromStatus, toStatus) {
    if (!this.isValidStatus(fromStatus) || !this.isValidStatus(toStatus)) {
      return { possible: false };
    }

    if (fromStatus === toStatus) {
      return { possible: true, path: [fromStatus] };
    }

    // BFS to find shortest path
    const visited = new Set();
    const queue = [[fromStatus]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === toStatus) {
        return { possible: true, path };
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const nextStatuses = VALID_TRANSITIONS[current] || [];
      for (const next of nextStatuses) {
        if (!visited.has(next)) {
          queue.push([...path, next]);
        }
      }
    }

    return { possible: false };
  }
}

// Export singleton instance
const statusTransitionService = new StatusTransitionService();

// Also export constants for direct access
module.exports = statusTransitionService;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
module.exports.VALID_STATUSES = VALID_STATUSES;
module.exports.TERMINAL_STATUSES = TERMINAL_STATUSES;
