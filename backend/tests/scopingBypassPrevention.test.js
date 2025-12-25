const { validateScopingCompliance, validateQueryScoping } = require('../middleware/dataScoping');
const AuditLog = require('../models/AuditLog');

describe('Scoping Bypass Prevention', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'test-user-id',
        getUserType: jest.fn().mockReturnValue('property_owner')
      },
      dataScope: {
        userType: 'property_owner',
        propertyIds: ['property-1', 'property-2'],
        canBypassScoping: false
      },
      query: {},
      params: {},
      body: {},
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Mock AuditLog.create
    jest.spyOn(AuditLog, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateScopingCompliance', () => {
    test('should allow valid queries within scope', async () => {
      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: 'property-1' },
        'property'
      );

      expect(result.isValid).toBe(true);
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    test('should detect unauthorized property access', async () => {
      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: 'unauthorized-property' },
        'property'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('unauthorized properties');
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scoping_bypass_attempt',
          isCritical: true
        })
      );
    });

    test('should detect SQL injection patterns', async () => {
      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: "' OR '1'='1" },
        'property'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('SQL injection pattern');
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('should detect raw query attempts', async () => {
      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: 'property-1', raw: true },
        'property'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('raw query mode');
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('should allow superusers to bypass validation', async () => {
      mockReq.dataScope.canBypassScoping = true;

      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: 'any-property' },
        'property'
      );

      expect(result.isValid).toBe(true);
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    test('should detect multiple unauthorized properties', async () => {
      const result = await validateScopingCompliance(
        mockReq,
        { propertyId: ['property-1', 'unauthorized-1', 'unauthorized-2'] },
        'property'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('unauthorized-1');
      expect(result.reason).toContain('unauthorized-2');
    });
  });

  describe('validateQueryScoping middleware', () => {
    test('should allow valid queries to proceed', async () => {
      mockReq.query = { propertyId: 'property-1' };
      const middleware = validateQueryScoping('property');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should block invalid queries', async () => {
      mockReq.query = { propertyId: 'unauthorized-property' };
      const middleware = validateQueryScoping('property');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'SCOPING_VIOLATION'
        })
      );
    });

    test('should allow superusers to bypass', async () => {
      mockReq.dataScope.canBypassScoping = true;
      mockReq.query = { propertyId: 'any-property' };
      const middleware = validateQueryScoping('property');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    test('should log bypass attempts with full context', async () => {
      mockReq.query = { propertyId: 'unauthorized-property', status: 'active' };
      mockReq.body = { name: 'test' };

      await validateScopingCompliance(
        mockReq,
        mockReq.query,
        'property'
      );

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          action: 'scoping_bypass_attempt',
          resourceType: 'property',
          isCritical: true,
          ipAddress: '127.0.0.1',
          changes: expect.objectContaining({
            suspiciousPatterns: expect.any(Array),
            queryParams: mockReq.query,
            bodyParams: mockReq.body,
            path: '/api/test',
            method: 'GET'
          })
        })
      );
    });
  });
});
