/**
 * 性能优化中间件
 * 包含缓存、压缩、CDN 支持等优化策略
 */

import compression from 'compression';
import helmet from 'helmet';
import logger from '../utils/logger.js';

/**
 * 创建性能优化中间件
 *
 * @returns {Function} Express 中间件
 */
export function createPerformanceMiddleware() {
  return (req, res, next) => {
    // 记录请求开始时间
    const startTime = Date.now();

    // 记录响应完成时间
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      res.set('X-Response-Time', `${duration}ms`);

      // 记录性能数据
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: duration,
          statusCode: res.statusCode,
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * 启用 HTTP 压缩
 * 减少传输数据大小
 *
 * @returns {Function} Express 中间件
 */
export function createCompressionMiddleware() {
  return compression({
    level: 6,  // 压缩级别 (0-9)，平衡速度和压缩率
    threshold: 1024,  // 只压缩超过 1KB 的响应
    filter: (req, res) => {
      // 不压缩某些内容类型
      if (res.getHeader('content-type')?.includes('application/octet-stream')) {
        return false;
      }
      return compression.filter(req, res);
    },
  });
}

/**
 * 启用安全 HTTP 头
 * 防止常见的安全漏洞
 *
 * @returns {Function} Express 中间件
 */
export function createSecurityHeadersMiddleware() {
  return helmet({
    // 内容安全策略
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // 阻止 MIME 类型嗅探
    noSniff: true,
    // 启用 XSS 过滤
    xssFilter: true,
    // 防止点击劫持
    frameguard: { action: 'deny' },
    // 启用 HSTS
    hsts: {
      maxAge: 31536000,  // 1 年
      includeSubDomains: true,
      preload: true,
    },
  });
}

/**
 * 缓存控制中间件
 * 根据资源类型设置不同的缓存策略
 *
 * @returns {Function} Express 中间件
 */
export function createCacheControlMiddleware() {
  return (req, res, next) => {
    const path = req.path;

    // API 响应 - 不缓存
    if (path.startsWith('/api/')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    // 静态资源 - 长期缓存
    else if (/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2)$/.test(path)) {
      res.set('Cache-Control', 'public, max-age=31536000');  // 1 年
    }
    // 健康检查 - 不缓存
    else if (path === '/health' || path === '/health/deep') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // 默认 - 短期缓存
    else {
      res.set('Cache-Control', 'public, max-age=3600');  // 1 小时
    }

    next();
  };
}

/**
 * ETag 支持
 * 用于客户端缓存验证
 *
 * @returns {Function} Express 中间件
 */
export function createETagMiddleware() {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      // 生成 ETag
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      res.set('ETag', `"${hash}"`);

      // 检查 If-None-Match
      if (req.get('If-None-Match') === `"${hash}"`) {
        return res.status(304).end();
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 数据库查询优化统计
 * 跟踪数据库查询性能
 *
 * @returns {Object} 性能追踪对象
 */
export class PerformanceTracker {
  constructor() {
    this.queries = [];
    this.slowQueryThreshold = 100;  // 毫秒
  }

  /**
   * 记录查询
   */
  recordQuery(operation, duration, collection = null, query = null) {
    const entry = {
      timestamp: new Date(),
      operation,
      duration,
      collection,
      query,
      isSlow: duration > this.slowQueryThreshold,
    };

    this.queries.push(entry);

    if (entry.isSlow) {
      logger.warn('Slow database query', {
        operation,
        duration,
        collection,
      });
    }
  }

  /**
   * 获取性能统计
   */
  getStats() {
    if (this.queries.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        maxDuration: 0,
      };
    }

    const slowCount = this.queries.filter((q) => q.isSlow).length;
    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const maxDuration = Math.max(...this.queries.map((q) => q.duration));

    return {
      totalQueries: this.queries.length,
      slowQueries: slowCount,
      avgDuration: (totalDuration / this.queries.length).toFixed(2),
      maxDuration,
      slowPercentage: ((slowCount / this.queries.length) * 100).toFixed(2),
    };
  }

  /**
   * 重置统计
   */
  reset() {
    this.queries = [];
  }
}

/**
 * 内存使用监控
 */
export function createMemoryMonitoring() {
  return setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsedPercent > 85) {
      logger.warn('High memory usage detected', {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        usagePercent: heapUsedPercent.toFixed(2),
      });
    }
  }, 30000);  // 每 30 秒检查一次
}

/**
 * 导出所有优化中间件工厂函数
 */
export default {
  createPerformanceMiddleware,
  createCompressionMiddleware,
  createSecurityHeadersMiddleware,
  createCacheControlMiddleware,
  createETagMiddleware,
  PerformanceTracker,
  createMemoryMonitoring,
};
