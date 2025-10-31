# Phase 3 快速参考 - 中间件实现完成

## 🎉 新增文件总览 (15 个)

### 中间件 (6 个)
```
✅ src/middleware/auth.js              # API Key 认证
✅ src/middleware/rateLimiter.js       # 请求限流
✅ src/middleware/validator.js         # 数据验证 (Joi)
✅ src/middleware/errorHandler.js      # 错误处理
✅ src/middleware/requestLogger.js     # 请求日志
✅ src/middleware/index.js             # 导出文件
```

### 工具函数 (3 个)
```
✅ src/utils/generator.js              # ID 生成工具
✅ src/utils/response.js               # 响应格式化
✅ src/utils/index.js                  # 导出文件
```

### 数据仓库 (2 个)
```
✅ src/repositories/projectRepository.js  # 项目数据操作
✅ src/repositories/bugRepository.js      # BUG 数据操作
```

### 路由和配置 (4 个)
```
✅ src/api/routes/health.js            # 健康检查路由
✅ src/api/routes/index.js             # 路由集成
✅ src/config/app.js                   # 应用配置 (已更新)
✅ src/index.js                        # 启动文件 (已更新)
```

## 🔑 核心功能

### 1. 认证 (auth.js)
```javascript
import { createAuthMiddleware } from '../middleware/auth.js';

const authMiddleware = createAuthMiddleware(projectRepo.getProjectByApiKey);
app.use(authMiddleware);

// 请求需要 X-API-Key 头
// 格式: sk_XXXXXXXXXXXXXXXX
// 自动跳过: /health, /api
```

### 2. 限流 (rateLimiter.js)
```javascript
import { createRateLimiterMiddleware } from '../middleware/rateLimiter.js';

const rateLimiter = createRateLimiterMiddleware(redis, {
  windowMs: 60000,     // 60 秒
  maxRequests: 200     // 每个 API Key 最多 200 次
});
app.use(rateLimiter);

// 响应头: X-RateLimit-*
// 超出限制: 429 Too Many Requests
```

### 3. 验证 (validator.js)
```javascript
import { createValidatorMiddleware, schemas } from '../middleware/validator.js';

app.post('/api/bugs',
  createValidatorMiddleware(schemas.createBug, { source: 'body' }),
  handleCreateBug
);

// 预定义模式:
// - schemas.createBug
// - schemas.createBugsBatch
// - schemas.searchBugs
// - schemas.updateSolution
```

### 4. 错误处理 (errorHandler.js)
```javascript
import { asyncHandler, ApiError, ValidationError } from '../middleware/errorHandler.js';

app.get('/path', asyncHandler(async (req, res) => {
  throw new ValidationError('Invalid input', details);
}));

// 自定义错误:
// - ApiError(message, status, code)
// - ValidationError(message, details)
// - UnauthorizedError(message)
// - NotFoundError(message)
// - ConflictError(message, details)
// - RateLimitError(message)
```

### 5. ID 生成 (generator.js)
```javascript
import {
  generateBugId,        // BUG-20251028-ABC123
  generateProjectId,    // proj_12345678
  generateApiKey,       // sk_xxxxxxxx...
  generateRequestId     // req_timestamp_random
} from '../utils/generator.js';
```

### 6. 响应格式化 (response.js)
```javascript
// 方法 1: 使用响应对象扩展
res.sendSuccess(data, message, statusCode);
res.sendError(message, code, statusCode, details);
res.sendPaginated(items, total, limit, offset);

// 方法 2: 使用工具函数
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

const response = successResponse(data, 'Created', 201);
const error = errorResponse('Error message', 'ERROR_CODE', 400);
const paginated = paginatedResponse(items, total, limit, offset);
```

## 📊 健康检查端点

### 基础检查
```bash
GET http://localhost:3050/health

响应:
{
  "status": "ok",
  "timestamp": "2025-10-28T10:30:00Z",
  "environment": "development",
  "uptime": 123.456,
  "memory": { ... },
  "services": {
    "mongodb": { "status": "connected", "readyState": 1 },
    "redis": { "status": "connected" }
  }
}
```

### 深度检查
```bash
GET http://localhost:3050/health/deep

响应:
{
  "status": "healthy",
  "timestamp": "2025-10-28T10:30:00Z",
  "checks": {
    "mongodb": { "status": "ok", "error": null },
    "redis": { "status": "ok", "error": null }
  },
  "system": {
    "uptime": 123,
    "memory": { "rss": "50MB", "heapUsed": "30MB" }
  }
}
```

## 🧪 测试认证流程

```bash
# 1. 获取示例项目信息 (在 MongoDB 中已插入示例数据)
# API Key: sk_test_xyz123
# Project ID: test-project

# 2. 测试认证中间件
curl -X GET http://localhost:3050/api \
  -H "X-API-Key: sk_test_xyz123"

# 3. 测试限流 (快速发送多个请求)
for i in {1..200}; do
  curl -X GET http://localhost:3050/api \
    -H "X-API-Key: sk_test_xyz123"
done

# 第 201 个请求会返回 429

# 4. 无 API Key 请求 (公共路由可用)
curl -X GET http://localhost:3050/health
curl -X GET http://localhost:3050/api  # 失败: 需要认证
```

## 📚 数据库操作示例

### 项目仓库
```javascript
import { ProjectRepository } from '../repositories/projectRepository.js';

const projectRepo = new ProjectRepository(db);
await projectRepo.initialize();

// 获取项目
const project = await projectRepo.getProjectByApiKey('sk_...');

// 创建项目
await projectRepo.createProject({
  projectId: 'my-app',
  apiKey: 'sk_...',
  name: 'My App',
  rateLimit: 200
});

// 更新项目
await projectRepo.updateProject('my-app', {
  rateLimit: 500
});
```

### BUG 仓库
```javascript
import { BugRepository } from '../repositories/bugRepository.js';

const bugRepo = new BugRepository(db);
await bugRepo.initialize();

// 创建 BUG
await bugRepo.createBug({
  bugId: 'BUG-20251028-ABC123',
  projectId: 'my-app',
  errorCode: 'PAYMENT_TIMEOUT',
  title: '支付超时',
  message: 'Request timeout',
  severity: 'critical'
});

// 搜索 BUG
const { bugs, total } = await bugRepo.searchBugs(
  'payment',
  { severity: 'critical' },
  10,
  0
);

// 获取统计
const stats = await bugRepo.getStats('my-app');
```

## 🚀 启动和测试

### 1. 启动应用
```bash
docker-compose up -d
# 或
npm run dev
```

### 2. 查看日志
```bash
# Docker
docker-compose logs -f app

# 本地
npm run dev (会看到彩色 pretty 日志)
```

### 3. 验证所有中间件加载
```bash
curl -X GET http://localhost:3050/health
# 应该返回 200 并显示所有服务状态为 connected
```

## 📈 请求处理流程

```
客户端请求
  ↓
helmet (安全头)
  ↓
cors (CORS 检查)
  ↓
pinoHttp (HTTP 日志)
  ↓
requestLogger (请求日志)
  ↓
metricsCollector (性能监控)
  ↓
express.json() (解析)
  ↓
createResponseMiddleware (扩展 res)
  ↓
认证中间件 (验证 API Key)
  ↓
限流中间件 (检查请求数)
  ↓
路由处理 (业务逻辑)
  ↓
错误处理 (如有错误)
  ↓
响应返回
```

## 🎯 下一步 (Phase 4)

### 待实现的 API 端点

```
POST /api/bugs               # 上报单个 BUG
POST /api/bugs/batch        # 批量上报 BUG
GET /api/bugs/search        # 搜索 BUG
GET /api/bugs/:id           # 获取 BUG 详情
GET /api/bugs/stats         # 获取统计信息
PATCH /api/bugs/:id/solution # 更新解决方案
```

### 实现顺序

1. POST /api/bugs (单个 BUG 上报)
2. POST /api/bugs/batch (批量 BUG 上报)
3. GET /api/bugs/:id (获取详情)
4. GET /api/bugs/search (搜索)
5. GET /api/bugs/stats (统计)
6. PATCH /api/bugs/:id/solution (更新方案)

---

## 💡 常用代码片段

### 创建新的 API 端点
```javascript
import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createValidatorMiddleware, schemas } from '../middleware/validator.js';

const router = Router();

router.post('/api/bugs',
  createValidatorMiddleware(schemas.createBug, { source: 'body' }),
  asyncHandler(async (req, res) => {
    const { bugId, projectId, errorCode, title, message, severity, context } = req.body;

    // 业务逻辑

    res.sendSuccess(
      { bugId, projectId },
      'Bug created successfully',
      201
    );
  })
);

export default router;
```

### 处理错误
```javascript
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

// 找不到资源
if (!bug) {
  throw new NotFoundError(`Bug ${bugId} not found`);
}

// 验证失败
if (!isValid) {
  throw new ValidationError('Invalid data', errorDetails);
}
```

### 返回分页响应
```javascript
const { bugs, total } = await bugRepo.searchBugs(q, filters, limit, offset);

res.sendPaginated(
  bugs,
  total,
  limit,
  offset,
  'Search completed'
);
```

---

**系统现在已完全准备好！** 🚀

所有基础中间件已实现，可以立即开始实现业务逻辑 (Phase 4)。

