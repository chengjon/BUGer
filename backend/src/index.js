// src/index.js
require('dotenv/config');
const logger = require('./utils/logger.js');
const { connectDB, getDB, getConnectionStatus } = require('./config/database.js');
const { connectRedis, getRedis, isRedisConnected } = require('./config/redis.js');
const { createApp } = require('./config/app.js');

const PORT = process.env.PORT || 3050;

/**
 * 应用启动函数
 */
async function startServer() {
  try {
    logger.info('🚀 Starting BUGer API Server...');

    // 连接 MongoDB
    logger.info('📦 Connecting to MongoDB...');
    await connectDB();
    const dbStatus = getConnectionStatus();
    logger.info(`✓ MongoDB ready (status: ${dbStatus})`);

    // 连接 Redis
    logger.info('🔴 Connecting to Redis...');
    await connectRedis();
    const redisConnected = isRedisConnected();
    logger.info(`✓ Redis ready (connected: ${redisConnected})`);

    // 创建 Express 应用
    const app = await createApp();

    // 启动 HTTP 服务器
    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════╗
║   🎉 BUGer API Server Started          ║
║   Listening on: http://localhost:${PORT}   ║
╚════════════════════════════════════════╝
      `);
      logger.info('📊 System Status:');
      logger.info(`  ✓ MongoDB: Connected`);
      logger.info(`  ✓ Redis: Connected`);
      logger.info(`  ✓ API: Ready`);
    });

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      logger.info(`\n📍 Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('✓ HTTP server closed');

        try {
          const { disconnectDB } = require('./config/database.js');
          const { disconnectRedis } = require('./config/redis.js');

          await disconnectDB();
          logger.info('✓ MongoDB disconnected');

          await disconnectRedis();
          logger.info('✓ Redis disconnected');

          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', {
            error: error.message,
            stack: error.stack,
          });
          process.exit(1);
        }
      });

      // 如果服务器没有在 10 秒内关闭，强制退出
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // 处理未处理的 Promise rejection
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: String(promise),
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// 启动服务器
startServer();