// src/middleware/auth.js
const logger = require('../utils/logger.js');

/**
 * API Key 认证中间件
 * 验证请求中的 X-API-Key 头并获取项目信息
 *
 * @param {Function} getProjectByApiKey - 获取项目信息的函数
 * @returns {Function} 中间件函数
 */
function createAuthMiddleware(getProjectByApiKey) {
  return async (req, res, next) => {
    try {
      // 从请求头获取 API Key
      const apiKey = req.headers['x-api-key'];

      // 如果某些路由不需要认证，在这里处理
      const publicRoutes = ['/health'];
      if (publicRoutes.some((route) => req.path.startsWith(route))) {
        logger.debug('Skipping authentication for public route', {
          path: req.path,
          method: req.method,
        });
        return next();
      }

      // 验证 API Key 是否存在
      if (!apiKey) {
        logger.warn('Missing API key', {
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        return res.status(401).json({
          success: false,
          message: 'Missing API key in X-API-Key header',
          code: 'MISSING_API_KEY',
        });
      }

      // 验证 API Key 格式
      logger.debug('Validating API key format', {
        apiKey: apiKey,
        startsWith: apiKey.startsWith('sk_'),
        length: apiKey.length,
        minLengthCheck: apiKey.length >= 10,
      });
      
      if (!apiKey.startsWith('sk_') || apiKey.length < 10) {
        logger.warn('Invalid API key format', {
          path: req.path,
          method: req.method,
          apiKey: apiKey,
          apiKeyLength: apiKey.length,
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid API key format',
          code: 'INVALID_API_KEY',
        });
      }

      // 从数据库查询项目信息
      let project;
      try {
        logger.debug('Querying project by API key', {
          apiKeyPrefix: apiKey.substring(0, 10),
        });
        project = await getProjectByApiKey(apiKey);
        logger.debug('Project query result', {
          project: project ? project.projectId : null,
        });
      } catch (error) {
        logger.error('Error querying project', {
          error: error.message,
          apiKeyPrefix: apiKey.substring(0, 10),
        });

        return res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        });
      }

      // 验证 API Key 是否有效
      if (!project) {
        logger.warn('Invalid API key', {
          path: req.path,
          method: req.method,
          apiKeyPrefix: apiKey.substring(0, 10),
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
        });
      }

      // 将项目信息和 API Key 附加到请求对象
      req.project = project;
      req.apiKey = apiKey;

      logger.debug('API authentication successful', {
        projectId: project.projectId,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Authentication middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
      });

      res.status(500).json({
        success: false,
        message: 'Authentication error',
        code: 'AUTH_ERROR',
      });
    }
  };
}

module.exports = { createAuthMiddleware };