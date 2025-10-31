// src/api/routes/health.js
const { Router } = require('express');
const { getDB } = require('../../config/database.js');
const { getRedis, isRedisConnected } = require('../../config/redis.js');
const logger = require('../../utils/logger.js');

const router = Router();

/**
 * 健康检查端点
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const db = getDB();
    const dbStatus = db.readyState; // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const dbConnected = dbStatus === 1;

    const redisConnected = isRedisConnected();

    res.status(200).json({
      status: dbConnected && redisConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        mongodb: {
          status: dbConnected ? 'connected' : 'disconnected',
          readyState: dbStatus,
        },
        redis: {
          status: redisConnected ? 'connected' : 'disconnected',
        },
      },
    });
  } catch (error) {
    logger.error('Health check error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * 深度健康检查端点
 * GET /health/deep
 */
router.get('/health/deep', async (req, res) => {
  try {
    const db = getDB();
    const redis = getRedis();

    // 测试 MongoDB 连接
    let mongoStatus = 'ok';
    let mongoError = null;
    try {
      await db.collection('projects').findOne({});
    } catch (error) {
      mongoStatus = 'error';
      mongoError = error.message;
    }

    // 测试 Redis 连接
    let redisStatus = 'ok';
    let redisError = null;
    try {
      await redis.ping();
    } catch (error) {
      redisStatus = 'error';
      redisError = error.message;
    }

    const isHealthy = mongoStatus === 'ok' && redisStatus === 'ok';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        mongodb: {
          status: mongoStatus,
          error: mongoError,
          responseTime: 'N/A',
        },
        redis: {
          status: redisStatus,
          error: redisError,
          responseTime: 'N/A',
        },
      },
      system: {
        uptime: Math.floor(process.uptime()),
        memory: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        },
      },
    });
  } catch (error) {
    logger.error('Deep health check error', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Deep health check failed',
    });
  }
});

module.exports = router;