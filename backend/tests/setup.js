// tests/setup.js
require('dotenv/config');

// 确保环境变量正确设置
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
process.env.MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'buger';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6380';

const { connectDB, disconnectDB } = require('../src/config/database.js');
const { connectRedis, disconnectRedis } = require('../src/config/redis.js');
const logger = require('../src/utils/logger.js');

// 全局测试钩子
beforeAll(async () => {
  logger.info('🧪 Starting test suite...');

  try {
    // 使用测试数据库
    process.env.MONGODB_DATABASE = 'buger';
    await connectDB();
    logger.info('✓ Test database connected');

    // 连接 Redis（如果需要）
    try {
      await connectRedis();
      logger.info('✓ Redis connected for tests');
    } catch (error) {
      logger.warn('⚠️  Redis not available for tests, skipping');
    }
  } catch (error) {
    logger.warn('⚠️  Database not available for tests, skipping database setup');
    // Don't throw error for unit tests that don't need database
  }
}, 60000); // 增加超时时间到60秒

afterAll(async () => {
  logger.info('🧹 Cleaning up test suite...');

  try {
    await disconnectDB();
    logger.info('✓ Test database disconnected');

    try {
      await disconnectRedis();
      logger.info('✓ Redis disconnected');
    } catch (error) {
      logger.warn('⚠️  Could not disconnect Redis');
    }
  } catch (error) {
    logger.warn('⚠️  Could not disconnect database');
  }
}, 60000); // 增加超时时间到60秒

// 全局超时设置
jest.setTimeout(60000);