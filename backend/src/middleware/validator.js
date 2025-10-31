// src/middleware/validator.js
const joi = require('joi');
const logger = require('../utils/logger.js');

/**
 * 请求数据验证中间件
 * 使用 Joi 验证请求体、查询参数等
 *
 * @param {Object} schema - Joi 验证模式
 * @param {Object} options - 验证选项
 * @returns {Function} 中间件函数
 */
function createValidatorMiddleware(schema, options = {}) {
  const { source = 'body', abortEarly = false } = options;

  return async (req, res, next) => {
    try {
      const data = req[source];
      
      logger.debug('Validating request data', {
        source: source,
        path: req.path,
        method: req.method,
        data: data,
      });

      // 验证数据
      const { error, value } = schema.validate(data, {
        abortEarly,
        stripUnknown: true,
        convert: true,
      });

      // 如果验证失败
      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        logger.warn('Validation error', {
          source: source,
          path: req.path,
          method: req.method,
          details: details,
          projectId: req.project?.projectId,
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: details,
        });
      }

      // 将验证后的数据替换原始数据
      req[source] = value;

      logger.debug('Validation passed', {
        source: source,
        path: req.path,
        fields: Object.keys(value),
      });

      next();
    } catch (error) {
      logger.error('Validator middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
      });

      res.status(500).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
      });
    }
  };
}

/**
 * 预定义的验证模式
 */
const schemas = {
  // BUG 上报模式
  createBug: joi.object({
    errorCode: joi
      .string()
      .required()
      .pattern(/^[A-Z0-9_]+$/)
      .max(100)
      .messages({
        'string.pattern.base':
          'errorCode must contain only uppercase letters, numbers and underscores',
      }),
    title: joi.string().required().max(200),
    message: joi.string().required().max(1000),
    stackTrace: joi.string().optional().max(5000),
    severity: joi
      .string()
      .required()
      .valid('critical', 'high', 'medium', 'low'),
    context: joi.object().optional().max(1000),
  }),

  // BUG 批量上报模式
  createBugsBatch: joi.object({
    bugs: joi
      .array()
      .items(
        joi.object({
          errorCode: joi
            .string()
            .required()
            .pattern(/^[A-Z0-9_]+$/)
            .max(100),
          title: joi.string().required().max(200),
          message: joi.string().required().max(1000),
          stackTrace: joi.string().optional().max(5000),
          severity: joi
            .string()
            .required()
            .valid('critical', 'high', 'medium', 'low'),
          context: joi.object().optional(),
        })
      )
      .required()
      .max(20)
      .messages({
        'array.max': 'Maximum 20 bugs per batch',
      }),
  }),

  // BUG 搜索模式
  searchBugs: joi.object({
    q: joi.string().required().max(200),
    severity: joi
      .string()
      .optional()
      .valid('critical', 'high', 'medium', 'low'),
    status: joi
      .string()
      .optional()
      .valid('open', 'investigating', 'resolved', 'duplicate'),
    limit: joi.number().optional().min(1).max(100).default(10),
    offset: joi.number().optional().min(0).default(0),
  }),

  // 解决方案更新模式
  updateSolution: joi.object({
    status: joi
      .string()
      .required()
      .valid('open', 'investigating', 'resolved', 'duplicate'),
    fix: joi.string().optional().max(2000),
    preventionTips: joi.array().items(joi.string().max(500)).optional(),
    rootCause: joi.string().optional().max(1000),
  }),
};

module.exports = { createValidatorMiddleware, schemas };