# Phase 1 Day 3-5: 中间件和认证系统实现

**文档版本**: 1.0 | **日期**: 2025-10-27 | **目标**: 完成 T012-T022 中间件实现

---

## 📋 任务概览

### 要实现的中间件 (T012-T022)

| 任务 | 模块 | 功能 | 优先级 | 难度 | 天 |
|------|------|------|--------|------|---|
| T012 | errorHandler | 全局错误处理 | P0 | ⭐ | 1 |
| T013 | auth | API Key 认证 | P0 | ⭐⭐ | 1 |
| T014 | rateLimiter | Redis 速率限制 | P0 | ⭐⭐⭐ | 1 |
| T015 | validator | 请求数据验证 | P1 | ⭐⭐ | 1 |
| T016 | logger | 请求日志 | P1 | ⭐ | 0.5 |
| T017 | logger (util) | 日志工具 | P0 | ⭐ | 0.5 |
| T018 | errorResponse | 错误响应格式 | P0 | ⭐ | 0.5 |
| T019 | generator | ID 生成器 | P0 | ⭐ | 0.5 |
| T020 | health route | 健康检查 | P1 | ⭐ | 0.5 |
| T021 | app registry | 注册路由 | P0 | ⭐⭐ | 1 |
| T022 | middleware tests | 单元测试 | P0 | ⭐⭐⭐ | 1.5 |

**总工作量**: 8.5 人·天（2人并行约4-5天）

---

## 🔧 实现步骤详解

### T017: 日志工具 (src/utils/logger.js) - 优先实现

**为什么优先?** 其他所有模块都依赖日志工具

**文件内容**:

```javascript
// src/utils/logger.js
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level: logLevel,
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      singleLine: false,
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
```

**验证**:
```bash
npm install pino pino-pretty
# 测试 logger
node -e "import('./src/utils/logger.js').then(m => m.default.info('Test'))"
```

---

### T018: 错误响应格式化 (src/utils/errorResponse.js)

**文件内容**:

```javascript
// src/utils/errorResponse.js

/**
 * 标准化错误响应格式
 * 用于所有 API 错误返回
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          stack: this.stack,
        }),
      },
    };
  }
}

// 预定义错误类
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(resetIn = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR');
    this.resetIn = resetIn;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resetIn: this.resetIn,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export default {
  AppError,
  ValidationError,
  AuthError,
  RateLimitError,
  NotFoundError,
  ConflictError,
};
```

---

### T019: ID 生成器 (src/utils/generator.js)

**文件内容**:

```javascript
// src/utils/generator.js
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成 BUG 报告 ID
 * 格式: BUG-YYYYMMDD-001
 */
export function generateBugId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BUG-${date}-${random}`;
}

/**
 * 生成项目 ID
 * 格式: PRJ-{uuid}
 */
export function generateProjectId() {
  return `PRJ-${uuidv4().split('-')[0]}`;
}

/**
 * 生成 API Key
 * 格式: sk_{date}_{random}_{checksum}
 */
export function generateAPIKey() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `sk_${timestamp}_${random}`;
}

/**
 * 生成通用 UUID
 */
export function generateUUID() {
  return uuidv4();
}

export default {
  generateBugId,
  generateProjectId,
  generateAPIKey,
  generateUUID,
};
```

**验证**:
```bash
node -e "import('./src/utils/generator.js').then(m => {
  console.log('BugID:', m.generateBugId());
  console.log('ProjectID:', m.generateProjectId());
  console.log('APIKey:', m.generateAPIKey());
})"
```

---

### T012: 全局错误处理中间件 (src/middleware/errorHandler.js)

**文件内容**:

```javascript
// src/middleware/errorHandler.js
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorResponse.js';

/**
 * Express 错误处理中间件
 * 必须是最后一个中间件，接收 4 个参数 (err, req, res, next)
 */
export function errorHandler(err, req, res, next) {
  // 记录错误
  logger.error({
    error: {
      message: err.message,
      code: err.code,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
    },
  });

  // 处理 AppError 类及其子类
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // 处理 Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const details = Object.entries(err.errors).reduce(
      (acc, [key, value]) => {
        acc[key] = value.message;
        return acc;
      },
      {},
    );
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 处理 Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY',
        message: `${field} already exists`,
        field,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 处理 Joi 验证错误（如果使用）
  if (err.isJoi || err.joi) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.details?.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 默认 500 错误
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 异步错误包装器
 * 用于 async/await 路由处理器
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { errorHandler, asyncHandler };
```

---

### T013: API Key 认证中间件 (src/middleware/auth.js)

**文件内容**:

```javascript
// src/middleware/auth.js
import logger from '../utils/logger.js';
import { AuthError } from '../utils/errorResponse.js';

// 在实际应用中，这应该从数据库查询
// 目前使用环境变量演示
const VALID_API_KEYS = (process.env.VALID_API_KEYS || 'test-api-key-001').split(',');

/**
 * API Key 认证中间件
 * 验证请求的 API Key 有效性
 *
 * 预期: Header: X-API-Key: <api-key>
 */
export function authMiddleware(req, res, next) {
  try {
    // 获取 API Key
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      logger.warn('Missing API Key', { path: req.path });
      throw new AuthError('Missing API Key in headers (X-API-Key)');
    }

    // 验证 API Key 格式（可选）
    if (!apiKey.startsWith('sk_')) {
      logger.warn('Invalid API Key format', { apiKey: apiKey.substring(0, 10) });
      throw new AuthError('Invalid API Key format');
    }

    // 验证 API Key 有效性
    if (!VALID_API_KEYS.includes(apiKey)) {
      logger.warn('Invalid API Key', { apiKey: apiKey.substring(0, 10) });
      throw new AuthError('Invalid API Key');
    }

    // 将 API Key 存储在请求对象中，供下游使用
    req.apiKey = apiKey;

    // 从 API Key 提取项目 ID（实际应该通过查询数据库）
    // 格式假设: sk_projectid_timestamp_random
    req.projectId = apiKey.split('_')[1];

    logger.debug('API Key authenticated', { projectId: req.projectId });

    next();
  } catch (error) {
    next(error);
  }
}

export default { authMiddleware };
```

---

### T014: 速率限制中间件 (src/middleware/rateLimiter.js) ⭐ 重点

**文件内容**:

```javascript
// src/middleware/rateLimiter.js
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';
import { RateLimitError } from '../utils/errorResponse.js';

/**
 * Redis 基础速率限制实现
 * 使用滑动窗口算法：每个 API Key 60 秒内最多 200 次请求
 *
 * Redis Lua 脚本保证原子性
 */

// Lua 脚本：原子性的速率限制检查
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 获取当前计数
local count = redis.call('GET', key)

if not count then
  -- 首次请求
  redis.call('SET', key, 1, 'EX', window)
  return {1, limit - 1, window}
else
  count = tonumber(count)
  if count < limit then
    -- 在限制内，增加计数
    redis.call('INCR', key)
    local ttl = redis.call('TTL', key)
    return {count + 1, limit - count - 1, ttl}
  else
    -- 超过限制
    local ttl = redis.call('TTL', key)
    return {count, 0, ttl}
  end
end
`;

/**
 * 速率限制中间件
 */
export async function rateLimiterMiddleware(req, res, next) {
  try {
    const redis = getRedis();
    if (!redis) {
      logger.warn('Redis not connected, skipping rate limit');
      return next();
    }

    // 使用 API Key 作为限流键
    const apiKey = req.apiKey || req.headers['x-api-key'] || 'anonymous';
    const projectId = req.projectId || 'unknown';
    const rateLimitKey = `ratelimit:${projectId}:${apiKey}`;

    // 从环境变量读取限制配置
    const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200');
    const window = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000; // 转换为秒
    const now = Math.floor(Date.now() / 1000);

    // 执行 Lua 脚本
    const [count, remaining, resetIn] = await redis.eval(
      RATE_LIMIT_SCRIPT,
      {
        keys: [rateLimitKey],
        arguments: [limit.toString(), window.toString(), now.toString()],
      },
    );

    // 设置速率限制响应头
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + resetIn);

    logger.debug('Rate limit check', {
      projectId,
      count,
      remaining,
      limit,
    });

    // 如果超过限制，返回 429
    if (remaining < 0) {
      logger.warn('Rate limit exceeded', {
        projectId,
        apiKey: apiKey.substring(0, 10),
        resetIn,
      });
      throw new RateLimitError(resetIn);
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default { rateLimiterMiddleware };
```

**性能测试**:
```bash
# 运行 100 个并发请求
for i in {1..100}; do
  curl -H "X-API-Key: sk_test_123" \
       http://localhost:3000/health &
done
wait

# 检查 RateLimit 响应头
curl -i -H "X-API-Key: sk_test_123" http://localhost:3000/health | grep RateLimit
```

---

### T015: 请求验证中间件 (src/middleware/validator.js)

**文件内容**:

```javascript
// src/middleware/validator.js
import Joi from 'joi';
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errorResponse.js';

/**
 * 通用验证中间件工厂
 * 使用 Joi 进行 Schema 验证
 */
export function validateSchema(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.reduce((acc, detail) => {
          const field = detail.path.join('.');
          acc[field] = detail.message;
          return acc;
        }, {});

        logger.warn('Validation failed', { details, path: req.path });
        throw new ValidationError('Invalid request data', details);
      }

      // 将验证后的数据替换到 req.body
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * 预定义的常用 Schema
 */
export const schemas = {
  // BUG 上报 Schema
  submitBug: Joi.object({
    errorCode: Joi.string().required().max(50),
    title: Joi.string().required().max(200),
    message: Joi.string().required().max(5000),
    stackTrace: Joi.string().optional().max(10000),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
    context: Joi.object().optional(),
  }),

  // 批量提交 Schema
  batchSubmit: Joi.object({
    bugs: Joi.array()
      .items(Joi.object({
        errorCode: Joi.string().required(),
        title: Joi.string().required(),
        message: Joi.string().required(),
        severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
      }))
      .max(20)
      .required(),
  }),

  // 搜索 Schema
  search: Joi.object({
    q: Joi.string().required().max(200),
    severity: Joi.string().optional(),
    projectId: Joi.string().optional(),
    page: Joi.number().optional().min(1),
    limit: Joi.number().optional().min(1).max(100),
  }),

  // 更新解决方案 Schema
  updateSolution: Joi.object({
    status: Joi.string().valid('open', 'investigating', 'resolved').required(),
    solution: Joi.string().optional().max(5000),
    preventionTips: Joi.array().items(Joi.string()).optional(),
  }),
};

export default { validateSchema, schemas };
```

---

### T016: 请求日志中间件 (src/middleware/logger.js)

**文件内容**:

```javascript
// src/middleware/logger.js
import logger from '../utils/logger.js';

/**
 * HTTP 请求日志中间件
 * 记录请求开始、响应完成和错误
 */
export function loggerMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // 存储到请求对象中，供下游使用
  req.requestId = requestId;

  // 记录请求
  logger.debug('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    apiKey: req.headers['x-api-key']?.substring(0, 10),
  });

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
        : 'info';

    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
}

export default { loggerMiddleware };
```

---

### T020: 健康检查路由 (src/api/routes/health.js)

**文件内容**:

```javascript
// src/api/routes/health.js
import express from 'express';
import { getDB } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /health - 基础健康检查
 * 不需要认证，快速返回
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/deep - 深度健康检查
 * 检查数据库和 Redis 连接
 */
router.get('/health/deep', async (req, res, next) => {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {},
    };

    // 检查 MongoDB
    try {
      const db = getDB();
      if (db && db.connection.readyState === 1) {
        checks.checks.mongodb = { status: 'OK', latency: 0 };
      } else {
        checks.checks.mongodb = { status: 'DOWN', error: 'Not connected' };
      }
    } catch (error) {
      checks.checks.mongodb = { status: 'ERROR', error: error.message };
    }

    // 检查 Redis
    try {
      const redis = getRedis();
      if (redis && redis.isOpen) {
        const pingStart = Date.now();
        await redis.ping();
        const latency = Date.now() - pingStart;
        checks.checks.redis = { status: 'OK', latency: `${latency}ms` };
      } else {
        checks.checks.redis = { status: 'DOWN', error: 'Not connected' };
      }
    } catch (error) {
      checks.checks.redis = { status: 'ERROR', error: error.message };
    }

    // 如果任何服务不可用，返回 503
    const allOK = Object.values(checks.checks).every(c => c.status === 'OK');
    const statusCode = allOK ? 200 : 503;

    res.status(statusCode).json(checks);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /health/ready - 就绪检查
 * 用于 Kubernetes 或其他编排系统
 */
router.get('/health/ready', async (req, res) => {
  try {
    const db = getDB();
    const redis = getRedis();

    if (db?.connection?.readyState === 1 && redis?.isOpen) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

export default router;
```

---

### T021: 在 src/index.js 中注册中间件

**更新 src/index.js**:

```javascript
import dotenv from 'dotenv';
import { createApp } from './config/app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { loggerMiddleware } from './middleware/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiterMiddleware } from './middleware/rateLimiter.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import healthRoutes from './api/routes/health.js';
import logger from './utils/logger.js';

// 加载环境变量
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const PORT = parseInt(process.env.API_PORT) || 3000;
const app = createApp();

// 注册全局中间件（顺序很重要）
app.use(loggerMiddleware);              // 1. 日志（最早）
app.use(healthRoutes);                  // 2. 健康检查（无需认证）

// API 认证和限流（需要 X-API-Key 的请求）
const protectedRoutes = express.Router();
protectedRoutes.use(authMiddleware);    // 3. 认证
protectedRoutes.use(rateLimiterMiddleware); // 4. 限流

// TODO: 在这里注册受保护的路由
// protectedRoutes.use('/api/bugs', bugsRoutes);
// protectedRoutes.use('/api/projects', projectsRoutes);
// protectedRoutes.use('/api/stats', statsRoutes);

app.use('/api', protectedRoutes);

// 错误处理（最后）
app.use(errorHandler);

// 优雅启动
async function start() {
  try {
    // 连接数据库
    await connectDB();
    logger.info('✓ MongoDB connected');

    // 连接 Redis
    await connectRedis();
    logger.info('✓ Redis connected');

    // 启动服务器
    const server = app.listen(PORT, () => {
      logger.info(`✓ Server listening on port ${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ Rate limit: ${process.env.RATE_LIMIT_MAX_REQUESTS} requests per ${process.env.RATE_LIMIT_WINDOW_MS}ms`);
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        await disconnectRedis();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
```

---

### T022: 中间件单元测试

**文件: tests/unit/middleware/auth.test.js**:

```javascript
import request from 'supertest';
import app from '../../../src/index.js';

describe('Auth Middleware', () => {
  describe('API Key validation', () => {
    test('should reject request without API Key', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .send({ errorCode: 'TEST_001' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_ERROR');
    });

    test('should accept valid API Key', async () => {
      const response = await request(app)
        .get('/health')
        .set('X-API-Key', 'sk_valid_key');

      expect(response.status).toBe(200);
    });

    test('should reject invalid API Key format', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('X-API-Key', 'invalid-format')
        .send({ errorCode: 'TEST_001' });

      expect(response.status).toBe(401);
    });
  });
});
```

**文件: tests/unit/middleware/rateLimiter.test.js**:

```javascript
import request from 'supertest';
import { getRedis } from '../../../src/config/redis.js';
import app from '../../../src/index.js';

describe('Rate Limiter Middleware', () => {
  beforeEach(async () => {
    const redis = getRedis();
    if (redis) {
      await redis.flushDb();
    }
  });

  test('should allow requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .get('/health')
        .set('X-API-Key', 'sk_test_key');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    }
  });

  test('should include rate limit headers in response', async () => {
    const response = await request(app)
      .get('/health')
      .set('X-API-Key', 'sk_test_key');

    expect(response.headers['x-ratelimit-limit']).toBe('200');
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });
});
```

---

## ✅ Day 3-5 验收清单

在开始 Week 2 (用户故事开发) 前：

- [ ] 所有日志输出都能看到（开发模式）
- [ ] 没有 API Key 的请求被拒绝（401）
- [ ] 有效 API Key 的请求通过认证
- [ ] 速率限制在 200 req/min 工作正常
- [ ] 超过限制的请求返回 429
- [ ] 所有错误响应包含标准格式
- [ ] 健康检查端点返回 200 OK
- [ ] 深度健康检查能检查 MongoDB 和 Redis 状态
- [ ] npm test 运行所有中间件测试，覆盖率 > 70%
- [ ] 没有 unhandled rejection 或 uncaught exception

---

## 🚀 Day 6-7 预告：US1 实现

接下来将实现 BUG 上报功能：
- MongoDB Bug 模型设计
- POST /api/bugs - 提交单个 BUG
- POST /api/bugs/batch - 批量提交
- 批量验证和数据库插入优化

**下一文档**: PHASE_1_US1_IMPLEMENTATION.md

