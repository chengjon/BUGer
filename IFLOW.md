# BUGer 项目上下文 (IFLOW)

## 项目概述

BUGer 是一个用于记录和管理程序运行时遇到的各种 BUG 的知识库系统。它为不同类型的 BUG 提供了分类管理和保存功能。该系统通过 RESTful API 接收客户端提交的 BUG 报告，并使用 MongoDB 进行持久化存储，同时利用 Redis 进行缓存优化。

### 核心技术栈

- **后端框架**: Node.js (>=18.0.0) + Express.js
- **数据库**: MongoDB (通过 Mongoose 驱动)
- **缓存**: Redis
- **日志**: Pino
- **验证**: Joi
- **测试**: Jest
- **部署**: Docker, Kubernetes

## 目录结构

```
/opt/iflow/buger/
├── backend/                 # 后端 API 服务
│   ├── src/                 # 源代码
│   │   ├── api/             # API 路由和控制器
│   │   ├── config/          # 配置文件 (数据库, Redis, App)
│   │   ├── middleware/      # 中间件 (认证, 限流, 错误处理等)
│   │   ├── models/          # 数据模型 (Mongoose Schemas)
│   │   ├── repositories/    # 数据访问层
│   │   ├── services/        # 业务逻辑层
│   │   └── utils/           # 工具函数
│   ├── tests/               # 测试代码
│   ├── scripts/             # 数据库脚本
│   ├── k8s/                 # Kubernetes 部署文件
│   ├── package.json         # 项目依赖和脚本
│   └── ...
├── specs/                   # 项目规范和文档
└── ...                      # 其他文档文件
```

## 核心功能模块

### 1. BUG 管理 (`/api/bugs`)

- **上报单个 BUG**: `POST /api/bugs`
- **批量上报 BUG**: `POST /api/bugs/batch` (最多 20 个)
- **获取 BUG 详情**: `GET /api/bugs/:id`
- **搜索 BUG**: `GET /api/bugs/search` (支持全文搜索和过滤)
- **获取项目所有 BUG**: `GET /api/bugs` (分页)
- **获取统计信息**: `GET /api/bugs/stats`
- **更新解决方案**: `PATCH /api/bugs/:id/solution`

### 2. 高级分析 (`/api/advanced`)

- **高级搜索**: `GET /api/advanced/search`
- **健康度分析**: `GET /api/advanced/analytics/health`
- **对比分析**: `GET /api/advanced/analytics/comparison`
- **趋势分析**: `GET /api/advanced/analytics/timeseries`
- **热门趋势**: `GET /api/advanced/trends`
- **聚合统计**: `GET /api/advanced/aggregated-stats`
- **关键词提取**: `GET /api/advanced/keywords`
- **数据导出**: `POST /api/advanced/export`

### 3. 健康检查 (`/health`)

- **基础健康检查**: `GET /health`
- **深度健康检查**: `GET /health/deep` (包含数据库和 Redis 状态)

## 构建和运行

### 环境准备

1.  Node.js (>=18.0.0)
2.  npm (>=9.0.0)
3.  MongoDB
4.  Redis

### 安装依赖

```bash
cd backend
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并根据需要修改配置。

### 启动服务

```bash
# 开发模式 (带热重载)
npm run dev

# 生产模式
npm start
```

### 数据库初始化

```bash
# 初始化数据库和索引
npm run db:init

# 填充种子数据
npm run db:seed

# 删除数据库 (谨慎使用)
npm run db:drop
```

### 测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行契约测试
npm run test:contract

# 监听模式运行测试
npm run test:watch
```

### 代码质量

```bash
# 代码检查
npm run lint

# 自动修复代码风格问题
npm run lint:fix
```

## 开发约定

### 代码结构

-   遵循分层架构：控制器 (Controller) -> 服务 (Service) -> 仓库 (Repository) -> 数据库。
-   使用 ES6 模块 (import/export)。
-   所有业务逻辑放在 `services` 层。
-   所有数据库操作放在 `repositories` 层。

### 错误处理

-   使用自定义错误类 (`NotFoundError`, `ValidationError` 等)。
-   全局错误处理中间件会捕获并统一返回错误响应。

### 日志

-   使用 `pino` 进行日志记录。
-   HTTP 请求日志由 `pino-http` 中间件自动处理。
-   业务日志使用 `src/utils/logger.js`。

### 验证

-   使用 `Joi` 进行请求数据验证。
-   验证逻辑封装在 `src/middleware/validator.js` 中。

### 缓存

-   使用 Redis 缓存搜索结果和统计信息。
-   缓存键名遵循 `功能:标识符` 的命名约定。
-   相关数据更新时会自动清理对应缓存。

### 认证

-   基于 API Key 的简单认证机制。
-   API Key 通过请求头 `x-api-key` 传递。
-   项目信息存储在 `projects` 集合中。

### 安全

-   使用 `helmet` 设置安全相关的 HTTP 头。
-   使用 `cors` 处理跨域资源共享。
-   使用 `rate-limiter` 进行请求限流 (基于 Redis)。