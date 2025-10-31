// src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger.js');

let db = null;

/**
 * 连接 MongoDB 数据库
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment variables');
    }

    const dbName = process.env.MONGODB_DATABASE || 'buger';

    logger.info('Connecting to MongoDB...', {
      host: mongoUri.split('@')[1]?.split(':')[0] || 'unknown',
      database: dbName
    });

    const connection = await mongoose.connect(mongoUri, {
      dbName: dbName,
      maxPoolSize: 20,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
      retryWrites: true,
    });

    // 保存数据库连接对象
    db = connection.connection;

    logger.info('✓ MongoDB connected successfully', {
      host: db.host,
      database: db.name,
      readyState: db.readyState
    });

    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * 断开 MongoDB 连接
 */
async function disconnectDB() {
  if (db) {
    await mongoose.disconnect();
    logger.info('✓ MongoDB disconnected');
  }
}

/**
 * 获取数据库连接
 * @returns {mongoose.Connection}
 */
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

/**
 * 检查数据库连接状态
 * @returns {number} 0: 未连接, 1: 已连接, 2: 连接中, 3: 断开中
 */
function getConnectionStatus() {
  if (!db) return 0;
  return db.readyState;
}

module.exports = {
  connectDB,
  disconnectDB,
  getDB,
  getConnectionStatus
};