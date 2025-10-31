// src/middleware/rateLimiter.js
const logger = require('../utils/logger.js');

/**
 * Redis 驱动的请求速率限制中间件
 * 使用 Redis 实现分布式速率限制
 *
 * @param {Redis} redisClient - Redis 客户端实例
 * @param {Object} options - 限流选项
 * @returns {Function} 中间件函数
 */
function createRateLimiterMiddleware(redisClient, options = {}) {
  const {
    windowMs = 60000, // 时间窗口: 1 分钟
    maxRequests = 200, // 最大请求数
    keyGenerator = (req) => `ratelimit:${req.project.projectId}:${req.apiKey}`,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return async (req, res, next) => {
    try {
      // 跳过不需要限流的路由
      const skipRoutes = ['/health', '/api'];
      if (skipRoutes.some((route) => req.path.startsWith(route))) {
        return next();
      }

      // 如果没有项目信息，跳过限流
      if (!req.project) {
        return next();
      }

      // 生成限流 key
      const key = keyGenerator(req);

      // 获取当前计数
      const current = await redisClient.incr(key);

      // 如果是第一个请求，设置过期时间
      if (current === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      // 设置响应头
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = await redisClient.ttl(key);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + resetTime * 1000).toISOString()
      );

      // 检查是否超过限制
      if (current > maxRequests) {
        logger.warn('Rate limit exceeded', {
          projectId: req.project.projectId,
          apiKeyPrefix: req.apiKey.substring(0, 10),
          current: current,
          maxRequests: maxRequests,
          windowMs: windowMs,
          path: req.path,
        });

        return res.status(429).json({
          success: false,
          message: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: resetTime,
        });
      }

      logger.debug('Rate limit check passed', {
        projectId: req.project.projectId,
        current: current,
        maxRequests: maxRequests,
        remaining: remaining,
      });

      next();
    } catch (error) {
      logger.error('Rate limiter middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
      });

      // 限流失败时，允许请求通过但记录错误
      next();
    }
  };
}

module.exports = { createRateLimiterMiddleware };