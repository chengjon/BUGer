# BUGer API - Backend

BUGer 是一个 BUG 管理知识库系统，帮助开发团队快速定位和解决已知问题。

## 项目结构

```
backend/
├── src/
│   ├── index.js              # 应用入口
│   ├── config/
│   │   ├── database.js       # MongoDB 连接配置
│   │   ├── redis.js          # Redis 连接配置
│   │   └── app.js            # Express 应用配置
│   ├── utils/
│   │   └── logger.js         # Pino 日志工具
│   ├── middleware/           # Express 中间件
│   ├── models/               # MongoDB 数据模型
│   ├── services/             # 业务逻辑层
│   ├── api/
│   │   └── routes/           # API 路由定义
│   └── utils/                # 工具函数
├── tests/
│   ├── setup.js              # 测试环境配置
│   ├── unit/                 # 单元测试
│   └── integration/          # 集成测试
├── scripts/
│   └── init-mongo.js         # MongoDB 初始化脚本
├── docker-compose.yml        # Docker Compose 配置
├── Dockerfile                # Docker 镜像定义
├── jest.config.cjs           # Jest 测试框架配置
├── .env.example              # 环境变量示例
├── .gitignore                # Git 忽略配置
├── package.json              # 项目依赖和脚本
└── README.md                 # 本文件
```

## 快速开始

### 前置条件

- Node.js 18 LTS 或更高版本
- npm 或 yarn
- MongoDB 6.0+ (可选，使用 Docker 自动启动)
- Redis 7+ (可选，使用 Docker 自动启动)

### 开发环境设置

#### 选项 1: 使用 Docker Compose (推荐)

```bash
# 启动所有服务 (MongoDB, Redis, API)
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止所有服务
docker-compose down
```

#### 选项 2: 本地安装

1. **复制环境变量文件**
   ```bash
   cp .env.example .env
   ```

2. **编辑 .env 文件，配置数据库连接**
   ```bash
   # 修改以下配置为你的本地 MongoDB 和 Redis
   MONGODB_URI=mongodb://admin:password@localhost:27017/buger?authSource=admin
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **启动 MongoDB 和 Redis**
   ```bash
   # 使用 Docker 只启动数据库
   docker-compose up -d mongodb redis
   ```

4. **安装依赖**
   ```bash
   npm install
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

   应用将在 `http://localhost:3050` 启动。

## npm 脚本

```bash
# 开发服务 (支持热重载)
npm run dev

# 生产环境启动
npm start

# 运行所有测试
npm test

# 监听模式运行测试 (开发时使用)
npm run test:watch

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 代码检查
npm run lint

# 自动修复代码风格问题
npm run lint:fix
```

## API 端点

### 健康检查

```bash
GET /health

# 响应示例
{
  "status": "ok",
  "timestamp": "2025-10-28T10:30:00.000Z",
  "environment": "development"
}
```

访问地址: `http://localhost:3050/health`

### BUG 管理接口

详见 `contracts/openapi.yaml` 了解完整的 API 规范。

**主要端点：**

- `POST /api/bugs` - 上报新的 BUG
- `POST /api/bugs/batch` - 批量上报 BUG
- `GET /api/bugs/search` - 搜索 BUG
- `GET /api/bugs/:id` - 获取 BUG 详情
- `PATCH /api/bugs/:id/solution` - 更新解决方案

## 环境变量说明

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| NODE_ENV | 运行环境 | development | production |
| PORT | 服务端口 | 3000 | 3000 |
| MONGODB_URI | MongoDB 连接字符串 | - | mongodb://admin:password@localhost:27017 |
| MONGODB_DATABASE | 数据库名称 | buger | buger |
| REDIS_HOST | Redis 主机 | localhost | redis |
| REDIS_PORT | Redis 端口 | 6379 | 6379 |
| REDIS_PASSWORD | Redis 密码 | - | password |
| REDIS_DB | Redis 数据库号 | 1 | 1 |
| CORS_ORIGIN | CORS 允许来源 | http://localhost:3000 | * |
| LOG_LEVEL | 日志级别 | debug | info, warn, error |

## 数据库初始化

使用 Docker Compose 时，MongoDB 会自动初始化，包括：
- 创建 bugs, projects, solutions 集合
- 创建必要的索引
- 插入示例数据

手动初始化：
```bash
mongosh mongodb://admin:password@localhost:27017/buger --authenticationDatabase admin < scripts/init-mongo.js
```

## 测试

### 运行所有测试

```bash
npm test
```

### 开发时监听测试

```bash
npm run test:watch
```

### 运行特定测试文件

```bash
npm test -- tests/unit/logger.test.js
```

### 生成覆盖率报告

```bash
npm test -- --coverage
```

## 日志

应用使用 Pino 进行结构化日志记录。

### 日志级别

- `debug` - 开发时使用，包含详细调试信息
- `info` - 标准信息日志
- `warn` - 警告日志
- `error` - 错误日志
- `fatal` - 致命错误

### 控制日志级别

通过环境变量：
```bash
LOG_LEVEL=info npm start
```

## Docker 部署

### 构建镜像

```bash
docker build -t buger-api:latest .
```

### 运行容器

```bash
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://admin:password@mongodb:27017/buger?authSource=admin" \
  -e REDIS_HOST="redis" \
  buger-api:latest
```

### 健康检查

Docker 镜像包含内置的健康检查，每 30 秒检查一次 `/health` 端点。

## 性能监控

应用会自动记录：
- API 响应时间
- 数据库查询性能
- Redis 缓存命中率
- 错误和异常

## 故障排除

### 无法连接 MongoDB

**症状：** `Failed to connect to MongoDB`

**解决方案：**
1. 检查 MongoDB 是否运行：`mongosh --version`
2. 验证 MONGODB_URI 是否正确
3. 确保用户名和密码正确

### 无法连接 Redis

**症状：** `Redis error: ECONNREFUSED`

**解决方案：**
1. 检查 Redis 是否运行：`redis-cli ping`
2. 验证 REDIS_HOST 和 REDIS_PORT
3. 检查 Redis 密码是否正确

### 端口已被占用

**症状：** `Error: listen EADDRINUSE :::3000`

**解决方案：**
```bash
# 使用不同的端口
PORT=3060 npm start
```

## 贡献指南

参见 `CONTRIBUTING.md`

## 许可证

MIT

## 支持

遇到问题？请查看文档或提交 issue。

---

**最后更新:** 2025-10-28
**版本:** 1.0.0-alpha
