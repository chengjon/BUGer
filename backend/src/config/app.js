// src/config/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('../utils/logger.js');
const { getDB } = require('./database.js');
const { getRedis } = require('./redis.js');
const {
  createAuthMiddleware,
  createRateLimiterMiddleware,
  errorHandler,
  requestLogger,
  metricsCollector,
} = require('../middleware/index.js');
const { createResponseMiddleware } = require('../utils/response.js');
const { ProjectRepository } = require('../repositories/projectRepository.js');

/**
 * 创建并配置 Express 应用
 * @returns {express.Application}
 */
async function createApp() {
  const app = express();

  // 安全头部设置
  app.use(helmet());

  // CORS 配置
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3050',
    credentials: true,
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  // HTTP 日志记录
  app.use(pinoHttp({ logger }));

  // 请求日志和监控
  const metrics = {};
  app.use(requestLogger());
  app.use(metricsCollector(metrics));

  // 请求体解析
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // 响应方法扩展
  app.use(createResponseMiddleware());

  // 初始化认证中间件所需的仓库
  const db = getDB();
  const projectRepo = new ProjectRepository(db);
  await projectRepo.initialize();

  // 认证中间件
  const authMiddleware = createAuthMiddleware((apiKey) =>
    projectRepo.getProjectByApiKey(apiKey)
  );
  app.use(authMiddleware);

  // 限流中间件
  const redis = getRedis();
  const rateLimiterMiddleware = createRateLimiterMiddleware(redis, {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200'),
  });
  app.use(rateLimiterMiddleware);

  // 注册路由
  const { createRoutes } = require('../api/routes/index.js');
  const routes = await createRoutes();
  app.use('/', routes);

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
      path: req.path,
      method: req.method,
      code: 'NOT_FOUND',
    });
  });

  // 全局错误处理中间件 (必须放在最后)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };