// src/middleware/index.js
const { createAuthMiddleware } = require('./auth.js');
const { createRateLimiterMiddleware } = require('./rateLimiter.js');
const { createValidatorMiddleware, schemas: validationSchemas } = require('./validator.js');
const {
  errorHandler,
  asyncHandler,
  ApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} = require('./errorHandler.js');
const { requestLogger, metricsCollector } = require('./requestLogger.js');

module.exports = {
  createAuthMiddleware,
  createRateLimiterMiddleware,
  createValidatorMiddleware,
  validationSchemas,
  errorHandler,
  asyncHandler,
  ApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  requestLogger,
  metricsCollector,
};