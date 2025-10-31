// src/config/redis.js
const { createClient } = require('redis');
const logger = require('../utils/logger.js');

let redisClient = null;

/**
 * 连接 Redis
 * @returns {Promise<redis.RedisClient>}
 */
async function connectRedis() {
  try {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT) || 6379;
    const db = parseInt(process.env.REDIS_DB) || 1;
    const password = process.env.REDIS_PASSWORD || undefined;

    logger.info('Connecting to Redis...', {
      host,
      port,
      db
    });

    redisClient = createClient({
      socket: {
        host: host,
        port: port,
      },
      password: password,
      database: db,
    });

    // 错误事件处理
    redisClient.on('error', (err) => {
      logger.error('Redis error', {
        error: err.message,
        code: err.code
      });
    });

    redisClient.on('connect', () => {
      logger.debug('Redis connected to server');
    });

    redisClient.on('ready', () => {
      logger.info('✓ Redis ready for use');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    // 测试连接
    await redisClient.connect();
    await redisClient.ping();

    logger.info('✓ Redis connected successfully', {
      host,
      port,
      db
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * 断开 Redis 连接
 */
async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('✓ Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis', {
        error: error.message
      });
    }
  }
}

/**
 * 获取 Redis 客户端
 * @returns {redis.RedisClient}
 */
function getRedis() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * 检查 Redis 连接状态
 * @returns {boolean}
 */
function isRedisConnected() {
  return redisClient && redisClient.isOpen;
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedis,
  isRedisConnected
};