// Mock NextResponse before importing the route
const mockNextResponse = {
  json: jest.fn((data) => ({
    status: 200,
    json: () => Promise.resolve(data),
    headers: new Map()
  }))
};

// Mock the NextResponse module
jest.mock('next/server', () => ({
  NextResponse: mockNextResponse
}));

const { GET } = require('../../src/app/api/health/route');

describe('Health Endpoint Tests', () => {
  let originalProcessUptime;
  let originalDate;

  beforeEach(() => {
    // Store original functions
    originalProcessUptime = process.uptime;
    originalDate = Date;

    // Mock process.uptime
    process.uptime = jest.fn(() => 123.45);

    // Mock Date
    const mockDate = new Date('2024-01-15T10:30:00.000Z');
    global.Date = jest.fn(() => mockDate);
    global.Date.now = jest.fn(() => mockDate.getTime());
    global.Date.prototype.toISOString = jest.fn(() => '2024-01-15T10:30:00.000Z');
  });

  afterEach(() => {
    // Restore original functions
    process.uptime = originalProcessUptime;
    global.Date = originalDate;
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 status with health information', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 123.45
      });
    });

    it('should return correct response format', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData).toHaveProperty('uptime');
      expect(responseData.status).toBe('ok');
      expect(typeof responseData.timestamp).toBe('string');
      expect(typeof responseData.uptime).toBe('number');
    });

    it('should include current timestamp', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(responseData.timestamp).toBe('2024-01-15T10:30:00.000Z');
      // The timestamp should be a valid ISO string
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include process uptime', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(responseData.uptime).toBe(123.45);
      expect(global.process.uptime).toHaveBeenCalled();
    });

    it('should be accessible without authentication', async () => {
      // This test verifies that the endpoint doesn't require authentication
      // by successfully calling it without any auth headers or tokens
      const response = await GET();

      expect(response.status).toBe(200);
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle multiple concurrent requests', async () => {
      // Test that the endpoint can handle multiple requests simultaneously
      const promises = Array(5).fill().map(() => GET());
      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockNextResponse.json).toHaveBeenCalledTimes(5);
    });

    it('should return consistent response structure', async () => {
      const response = await GET();
      const responseData = await response.json();

      // Verify all required fields are present
      const requiredFields = ['status', 'timestamp', 'uptime'];
      requiredFields.forEach(field => {
        expect(responseData).toHaveProperty(field);
      });

      // Verify no unexpected fields
      const responseKeys = Object.keys(responseData);
      expect(responseKeys).toEqual(expect.arrayContaining(requiredFields));
      expect(responseKeys.length).toBe(requiredFields.length);
    });
  });
});
