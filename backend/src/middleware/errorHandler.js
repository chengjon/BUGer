// src/middleware/errorHandler.js
const logger = require('../utils/logger.js');

/**
 * 错误处理中间件
 * 统一处理应用中的错误
 *
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 默认状态码和消息
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // 处理特定错误类型
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    code = 'UNAUTHORIZED';
    message = 'Unauthorized access';
  } else if (err.name === 'NotFoundError') {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    status = 409;
    code = 'CONFLICT';
    message = 'Resource conflict';
  }

  // 日志记录
  if (status >= 500) {
    logger.error('Error Handler - Server Error', {
      status: status,
      code: code,
      message: message,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      projectId: req.project?.projectId,
    });
  } else if (status >= 400) {
    logger.warn('Error Handler - Client Error', {
      status: status,
      code: code,
      message: message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      projectId: req.project?.projectId,
    });
  }

  // 构建错误响应
  const response = {
    success: false,
    message: message,
    code: code,
  };

  // 在开发环境下包含详细错误信息
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      message: err.message,
      stack: err.stack?.split('\n'),
      details: err.details || null,
    };
  }

  // 发送响应
  res.status(status).json(response);
}

/**
 * 异步路由包装器
 * 自动捕获异步路由处理器中的错误
 *
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 自定义错误类
 */
class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends ApiError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  ApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};