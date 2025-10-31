/**
 * 安全加固中间件
 * 包含多重防御机制
 */

import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import logger from '../utils/logger.js';

/**
 * SQL/NoSQL 注入防护
 * 清理用户输入
 *
 * @returns {Function} Express 中间件
 */
export function createInputSanitizationMiddleware() {
  // MongoDB 注入防护
  const mongoSanitizeMiddleware = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn('Potentially malicious input detected', {
        key,
        ip: req.ip,
        path: req.path,
      });
    },
  });

  return (req, res, next) => {
    // 清理 query, body, params
    mongoSanitizeMiddleware(req, res, () => {
      // 额外的文本清理
      if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
      }
      next();
    });
  };
}

/**
 * 递归清理对象
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // 移除特殊字符
      obj[key] = obj[key]
        .replace(/[<>\"']/g, '')
        .substring(0, 10000);  // 限制字符串长度
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * CSRF 防护
 * 验证 API 请求的来源
 *
 * @returns {Function} Express 中间件
 */
export function createCSRFProtectionMiddleware() {
  return (req, res, next) => {
    // 对于非 GET 请求，验证来源
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const origin = req.get('origin') || req.get('referer');
      const apiKey = req.get('X-API-Key');

      // 检查 API Key 是否存在
      if (!apiKey) {
        logger.warn('CSRF prevention: Missing API Key', {
          ip: req.ip,
          method: req.method,
          path: req.path,
        });
        return res.status(403).json({
          success: false,
          error: 'API Key required',
          code: 'MISSING_API_KEY',
        });
      }
    }

    next();
  };
}

/**
 * API 密钥验证加强
 * 包含密钥轮换和过期检查
 *
 * @returns {Function} Express 中间件
 */
export function createAdvancedApiKeyMiddleware(getProjectByApiKey) {
  return async (req, res, next) => {
    const publicPaths = ['/health', '/api', '/health/deep'];

    if (publicPaths.includes(req.path)) {
      return next();
    }

    const apiKey = req.get('X-API-Key');

    if (!apiKey) {
      logger.warn('Missing API Key', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: 'API Key required',
        code: 'MISSING_API_KEY',
      });
    }

    try {
      // 验证 API 密钥格式
      if (!apiKey.startsWith('sk_') || apiKey.length < 20) {
        logger.warn('Invalid API Key format', {
          ip: req.ip,
          keyPrefix: apiKey.substring(0, 5),
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key format',
          code: 'INVALID_API_KEY_FORMAT',
        });
      }

      // 获取项目信息
      const project = await getProjectByApiKey(apiKey);

      if (!project) {
        logger.warn('API Key not found', {
          ip: req.ip,
          keyPrefix: apiKey.substring(0, 10),
        });
        return res.status(401).json({
          success: false,
          error: 'API Key not found',
          code: 'API_KEY_NOT_FOUND',
        });
      }

      // 检查密钥是否过期
      if (project.apiKeyExpiresAt && new Date(project.apiKeyExpiresAt) < new Date()) {
        logger.warn('API Key expired', {
          ip: req.ip,
          projectId: project.projectId,
        });
        return res.status(401).json({
          success: false,
          error: 'API Key expired',
          code: 'API_KEY_EXPIRED',
        });
      }

      // 检查项目是否被禁用
      if (project.status === 'disabled' || project.status === 'suspended') {
        logger.warn('Project suspended or disabled', {
          ip: req.ip,
          projectId: project.projectId,
          status: project.status,
        });
        return res.status(403).json({
          success: false,
          error: 'Project is suspended',
          code: 'PROJECT_SUSPENDED',
        });
      }

      req.project = project;
      req.apiKey = apiKey;

      next();
    } catch (error) {
      logger.error('Error validating API Key', {
        error: error.message,
        ip: req.ip,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * 请求大小限制
 * 防止大型 DoS 攻击
 *
 * @returns {Function} Express 中间件
 */
export function createRequestLimitMiddleware() {
  return (req, res, next) => {
    const maxSize = 1024 * 1024;  // 1MB

    if (req.is('application/json')) {
      if (req.get('content-length') > maxSize) {
        logger.warn('Request body too large', {
          ip: req.ip,
          size: req.get('content-length'),
          maxSize,
        });
        return res.status(413).json({
          success: false,
          error: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE',
        });
      }
    }

    next();
  };
}

/**
 * IP 白名单检查
 * 仅允许授权的 IP 地址
 *
 * @param {Array<string>} whitelist - 允许的 IP 地址列表
 * @returns {Function} Express 中间件
 */
export function createIPWhitelistMiddleware(whitelist = []) {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next();  // 白名单为空，允许所有
    }

    const clientIp = req.ip || req.connection.remoteAddress;

    // 检查是否在白名单中
    const isWhitelisted = whitelist.some((ip) => {
      if (ip === '*') return true;  // 允许所有
      if (ip.includes('/')) {
        // CIDR 表示法
        return isIpInCIDR(clientIp, ip);
      }
      return clientIp === ip;
    });

    if (!isWhitelisted) {
      logger.warn('IP not whitelisted', {
        ip: clientIp,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        error: 'IP not whitelisted',
        code: 'IP_NOT_ALLOWED',
      });
    }

    next();
  };
}

/**
 * CIDR 表示法 IP 检查
 */
function isIpInCIDR(ip, cidr) {
  const [cidrIp, bits] = cidr.split('/');
  const ipInt = ipToInt(ip);
  const cidrInt = ipToInt(cidrIp);
  const mask = -1 << (32 - bits);

  return (ipInt & mask) === (cidrInt & mask);
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

/**
 * 请求签名验证
 * 使用 HMAC 验证请求完整性
 *
 * @param {string} secret - 密钥
 * @returns {Function} Express 中间件
 */
export function createRequestSignatureMiddleware(secret) {
  return async (req, res, next) => {
    // 仅对特定路径验证签名
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    const signature = req.get('X-Signature');
    const timestamp = req.get('X-Timestamp');

    if (!signature || !timestamp) {
      return next();  // 可选的签名验证
    }

    try {
      const crypto = require('crypto');

      // 检查时间戳（防止重放攻击）
      const requestTime = parseInt(timestamp, 10);
      const currentTime = Date.now();

      if (Math.abs(currentTime - requestTime) > 300000) {  // 5 分钟
        logger.warn('Request timestamp too old', {
          ip: req.ip,
          timeDiff: currentTime - requestTime,
        });
        return res.status(401).json({
          success: false,
          error: 'Request timestamp expired',
          code: 'TIMESTAMP_EXPIRED',
        });
      }

      // 计算签名
      const payload = `${req.method}${req.path}${timestamp}${JSON.stringify(req.body || {})}`;
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // 常量时间比较（防止时序攻击）
      if (!timingSafeEqual(signature, computedSignature)) {
        logger.warn('Invalid request signature', {
          ip: req.ip,
          path: req.path,
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid request signature',
          code: 'INVALID_SIGNATURE',
        });
      }

      next();
    } catch (error) {
      logger.error('Error validating request signature', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * 常量时间比较
 */
function timingSafeEqual(a, b) {
  const crypto = require('crypto');
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * 导出所有安全加固中间件
 */
export default {
  createInputSanitizationMiddleware,
  createCSRFProtectionMiddleware,
  createAdvancedApiKeyMiddleware,
  createRequestLimitMiddleware,
  createIPWhitelistMiddleware,
  createRequestSignatureMiddleware,
};
