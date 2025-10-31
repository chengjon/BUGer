// tests/integration/bugs.test.js
const request = require('supertest');
// 确保环境变量正确设置
process.env.MONGODB_URI = 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
process.env.MONGODB_DATABASE = 'buger';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';

console.log('Environment variables in test:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);

const { connectDB, getDB } = require('../../src/config/database.js');
const { connectRedis, getRedis } = require('../../src/config/redis.js');
const { createApp } = require('../../src/config/app.js');
const logger = require('../../src/utils/logger.js');

describe('BUG Management API', () => {
  let app;
  let db;
  let redis;
  let projectId = 'test-project';
  let apiKey = 'sk_test_xyz123';
  let bugId;

  beforeAll(async () => {
    // 确保数据库和Redis连接
    await connectDB();
    await connectRedis();
    
    db = getDB();
    redis = getRedis();
    app = await createApp();

    // 清理测试数据
    await db.collection('bugs').deleteMany({ projectId });
  });

  describe('POST /api/bugs', () => {
    it('should create a new bug', async () => {
      const bugData = {
        errorCode: 'PAYMENT_TIMEOUT',
        title: '支付超时',
        message: 'Payment request timeout after 30 seconds',
        severity: 'critical',
        stackTrace: 'Error: timeout\n  at ...',
        context: {
          userId: 123,
          amount: 999.99,
        },
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('X-API-Key', apiKey)
        .send(bugData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bugId');
      expect(response.body.data.projectId).toBe(projectId);
      expect(response.body.data.occurrences).toBe(1);
      expect(response.body.data.status).toBe('open');

      bugId = response.body.data.bugId;
    });

    it('should increment occurrences for duplicate error code', async () => {
      const bugData = {
        errorCode: 'PAYMENT_TIMEOUT',
        title: '支付超时',
        message: 'Payment request timeout after 30 seconds',
        severity: 'critical',
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('X-API-Key', apiKey)
        .send(bugData)
        .expect(201);

      expect(response.body.data.bugId).toBe(bugId);
      expect(response.body.data.occurrences).toBe(2);
    });

    it('should reject request without API key', async () => {
      const bugData = {
        errorCode: 'TEST_ERROR',
        title: 'Test',
        message: 'Test message',
        severity: 'high',
      };

      const response = await request(app)
        .post('/api/bugs')
        .send(bugData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_API_KEY');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: 'Missing error code',
        message: 'Message without error code',
        // missing errorCode and severity
      };

      const response = await request(app)
        .post('/api/bugs')
        .set('X-API-Key', apiKey)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/bugs/batch', () => {
    it('should create multiple bugs in batch', async () => {
      const bugs = [
        {
          errorCode: 'DATABASE_ERROR',
          title: '数据库连接失败',
          message: 'Connection pool exhausted',
          severity: 'critical',
        },
        {
          errorCode: 'API_RATE_LIMIT',
          title: 'API 速率限制',
          message: 'Too many requests to external API',
          severity: 'high',
        },
      ];

      const response = await request(app)
        .post('/api/bugs/batch')
        .set('X-API-Key', apiKey)
        .send({ bugs })
        .expect(207);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.results[0].success).toBe(true);
      expect(response.body.data.results[0]).toHaveProperty('bugId');
    });

    it('should handle batch with more than 20 items', async () => {
      const bugs = Array.from({ length: 25 }, (_, i) => ({
        errorCode: `ERROR_${i}`,
        title: `Error ${i}`,
        message: `Message ${i}`,
        severity: 'medium',
      }));

      const response = await request(app)
        .post('/api/bugs/batch')
        .set('X-API-Key', apiKey)
        .send({ bugs })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/bugs/:id', () => {
    it('should retrieve bug details', async () => {
      const response = await request(app)
        .get(`/api/bugs/${bugId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bugId).toBe(bugId);
      expect(response.body.data.errorCode).toBe('PAYMENT_TIMEOUT');
      expect(response.body.data.projectId).toBe(projectId);
    });

    it('should return 404 for non-existent bug', async () => {
      const response = await request(app)
        .get('/api/bugs/BUG-20250101-NONEXIST')
        .set('X-API-Key', apiKey)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/bugs/search', () => {
    it('should search bugs by keyword', async () => {
      const response = await request(app)
        .get('/api/bugs/search')
        .set('X-API-Key', apiKey)
        .query({ q: 'payment' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should search with severity filter', async () => {
      const response = await request(app)
        .get('/api/bugs/search')
        .set('X-API-Key', apiKey)
        .query({ q: 'timeout', severity: 'critical' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            severity: 'critical',
          }),
        ])
      );
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/bugs/search')
        .set('X-API-Key', apiKey)
        .query({ q: 'error', limit: 5, offset: 0 })
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.offset).toBe(0);
      expect(response.body.data.pagination.currentPage).toBe(1);
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/bugs/search')
        .set('X-API-Key', apiKey)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/bugs', () => {
    it('should retrieve all bugs for project', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination on bug list', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('X-API-Key', apiKey)
        .query({ limit: 5, offset: 0 })
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/bugs/stats', () => {
    it('should retrieve bug statistics', async () => {
      const response = await request(app)
        .get('/api/bugs/stats')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('PATCH /api/bugs/:id/solution', () => {
    it('should update bug solution', async () => {
      const solutionData = {
        status: 'resolved',
        fix: 'Increased payment gateway timeout to 60 seconds and added retry logic',
        preventionTips: [
          'Use circuit breaker pattern',
          'Monitor payment gateway health',
          'Implement exponential backoff',
        ],
        rootCause: 'Payment gateway was responding slowly during peak hours',
      };

      const response = await request(app)
        .patch(`/api/bugs/${bugId}/solution`)
        .set('X-API-Key', apiKey)
        .send(solutionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.solution.fix).toBe(solutionData.fix);
      expect(response.body.data.solution.preventionTips).toEqual(solutionData.preventionTips);
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/bugs/${bugId}/solution`)
        .set('X-API-Key', apiKey)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await db.collection('bugs').deleteMany({ projectId });
  });
});