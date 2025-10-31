# Phase 1 执行指南：项目初始化和基础设施

**文档版本**: 1.0 | **日期**: 2025-10-27 | **目标**: Week 1 完成项目初始化和中间件

---

## 📍 当前状态

所有设计文档已完成，现在进入代码实现阶段。

### 已交付的设计物料
- ✅ spec.md - 功能规范（5个用户故事）
- ✅ data-model.md - MongoDB 数据模型（3个集合）
- ✅ openapi.yaml - API 规范（6个核心端点）
- ✅ tasks.md - 任务分解（90个任务）
- ✅ REDIS_INTEGRATION_GUIDE.md - Redis 集成指南
- ✅ .env.example - 环境配置模板

### 开发约束
- **周期**: 4周 MVP（优化方案）
- **成本**: ¥660k（vs 原 ¥1.3M）
- **目标并发**: 1,000用户
- **搜索延迟**: P95 < 2秒
- **交付成果**: 3个 P1 用户故事

---

## 🎯 Phase 1 目标分解

### Week 1: 基础设施和中间件
```
Day 1-2: 项目初始化 (T001-T011)
  └─ 交付: 启动脚本可运行，环境变量配置完整

Day 2-3: 中间件实现 (T012-T022)
  └─ 交付: 认证、限流、错误处理、日志系统完全可用

验收标准:
✓ npm start 可启动服务（port 3000）
✓ GET /health 返回 200 OK
✓ API Key 验证工作正常
✓ 速率限制在 Redis 生效（200 req/min）
```

---

## 🛠️ Day 1-2: 项目初始化详细步骤

### T001: 初始化 Node.js 项目结构

**目的**: 创建标准的 Node.js 项目目录架构

**步骤**:
```bash
cd /opt/iflow/buger

# 创建 backend 目录（如不存在）
mkdir -p backend
cd backend

# 创建核心目录结构
mkdir -p src/{config,middleware,api,services,models,utils}
mkdir -p src/api/{routes,controllers}
mkdir -p tests/{unit,integration,contract}
mkdir -p scripts
mkdir -p logs

# 创建初始文件
touch src/index.js
touch .env
touch .env.test
touch .gitignore
```

**验证**:
```bash
tree -L 2 -I 'node_modules'
# 应该显示完整的目录结构
```

---

### T002: 创建 package.json 并安装核心依赖

**生成的 package.json 内容** (路径: `/opt/iflow/buger/backend/package.json`):

```json
{
  "name": "buger-api",
  "version": "1.0.0",
  "description": "BUG Management Knowledge Base System API",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js --watch src --env-file=.env",
    "start": "node src/index.js",
    "test": "jest --coverage --detectOpenHandles",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit --coverage",
    "test:integration": "jest tests/integration --coverage",
    "test:contract": "jest tests/contract",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "db:init": "node scripts/init-db.js",
    "db:seed": "node scripts/seed-db.js",
    "db:drop": "node scripts/drop-db.js"
  },
  "keywords": [
    "bug",
    "knowledge-base",
    "api",
    "error-tracking"
  ],
  "author": "BUGer Team",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "redis": "^4.6.8",
    "dotenv": "^16.3.1",
    "joi": "^17.10.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "uuid": "^9.0.0",
    "pino": "^8.15.1",
    "pino-http": "^8.4.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.4",
    "eslint": "^8.49.0",
    "eslint-config-airbnb-base": "^15.0.0",
    "eslint-plugin-import": "^2.28.1"
  }
}
```

**安装步骤**:
```bash
cd /opt/iflow/buger/backend

# 安装依赖（约 2-3 分钟）
npm install

# 验证安装
npm list | head -20

# 应该显示所有依赖已安装，如：
# buger-api@1.0.0
# ├── express@4.18.2
# ├── mongoose@7.5.0
# ├── redis@4.6.8
# ├── ...
```

**依赖说明**:
| 包 | 版本 | 用途 | 备注 |
|----|------|------|------|
| express | 4.18.2 | Web 框架 | 轻量, 高效 |
| mongoose | 7.5.0 | MongoDB ORM | 类型安全, 验证 |
| redis | 4.6.8 | Redis 客户端 | 异步支持 |
| dotenv | 16.3.1 | 环境变量 | .env 加载 |
| joi | 17.10.1 | 数据验证 | Schema 验证 |
| cors | 2.8.5 | CORS 中间件 | 跨域支持 |
| helmet | 7.0.0 | 安全头 | HTTP 安全 |
| uuid | 9.0.0 | ID 生成 | 唯一标识 |
| pino | 8.15.1 | 日志库 | 高性能, JSON |
| pino-http | 8.4.1 | HTTP 日志 | Express 集成 |

---

### T003: 创建环境变量文件

**步骤**:
```bash
cd /opt/iflow/buger/backend

# 从根目录复制 .env.example
cp ../.env.example .env

# 确保文件存在
ls -la .env

# 验证关键配置
grep -E "MONGODB_URI|REDIS_HOST|API_PORT" .env
```

**预期输出**:
```
MONGODB_URI=mongodb://mongo:c790414J@192.168.123.104:27017/buger
REDIS_HOST=192.168.123.104
REDIS_PORT=6379
API_PORT=3000
```

**创建测试环境文件**:
```bash
# 创建 .env.test 用于测试环境
cat > .env.test << 'EOF'
MONGODB_URI=mongodb://mongo:c790414J@192.168.123.104:27017/buger_test
REDIS_HOST=192.168.123.104
REDIS_PORT=6379
REDIS_DB=2
API_PORT=3001
NODE_ENV=test
LOG_LEVEL=error
RATE_LIMIT_MAX_REQUESTS=999999
EOF
```

---

### T004-T007: 创建配置和启动文件

#### T004: src/config/database.js - MongoDB 连接管理

**文件内容**:
```javascript
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let db = null;

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in environment');
    }

    db = await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DATABASE || 'buger',
      maxPoolSize: 20,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
      retryWrites: true,
    });

    logger.info('MongoDB connected successfully');
    return db;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectDB() {
  if (db) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

export function getDB() {
  return db;
}

export default { connectDB, disconnectDB, getDB };
```

**验证**:
```javascript
// 测试连接（在 src/index.js 中）
import { connectDB } from './config/database.js';

await connectDB();
console.log('✓ MongoDB 连接成功');
```

#### T005: src/config/redis.js - Redis 连接管理

**文件内容**:
```javascript
import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient = null;

export async function connectRedis() {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 1,
      socket: {
        connectTimeout: 30000,
        keepAlive: 30000,
      },
      retry: {
        maxRetries: 5,
        retryDelayBase: 100,
        retryDelayMax: 3000,
      },
    });

    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('ready', () => logger.info('Redis ready'));
    redisClient.on('reconnecting', () => logger.info('Redis reconnecting'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis disconnected');
  }
}

export function getRedis() {
  return redisClient;
}

export default { connectRedis, disconnectRedis, getRedis };
```

#### T006: src/config/app.js - Express 基础配置

**文件内容**:
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

export function createApp() {
  const app = express();

  // 安全头
  app.use(helmet());

  // CORS 配置
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }));

  // 日志中间件
  app.use(pinoHttp({ logger }));

  // Body 解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 健康检查路由
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method,
    });
  });

  return app;
}

export default { createApp };
```

#### T007: src/index.js - 应用启动点

**文件内容**:
```javascript
import dotenv from 'dotenv';
import { createApp } from './config/app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import logger from './utils/logger.js';

// 加载环境变量
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const PORT = parseInt(process.env.API_PORT) || 3000;
const app = createApp();

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

**启动验证**:
```bash
cd /opt/iflow/buger/backend

# 运行开发服务器
npm run dev

# 预期输出:
# ✓ MongoDB connected
# ✓ Redis connected
# ✓ Server listening on port 3000

# 新的终端窗口中测试
curl http://localhost:3000/health

# 应该返回:
# {"status":"OK","timestamp":"2025-10-27T...","uptime":1.234}
```

---

### T008-T011: 测试框架和脚本

#### T008: 创建 tests 目录结构和配置

**步骤**:
```bash
cd /opt/iflow/buger/backend

# 创建 jest.config.cjs
cat > jest.config.cjs << 'EOF'
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  maxWorkers: 2,
  setupFilesAfterEnv: ['./tests/setup.js'],
};
EOF

# 创建测试设置文件
cat > tests/setup.js << 'EOF'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// 设置测试超时
jest.setTimeout(10000);

// 监听未处理的 Promise 拒绝
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
EOF
```

#### T009: .gitignore 和 README

**创建 .gitignore**:
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log
package-lock.json

# Environment variables
.env
.env.local
.env.test

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/
.nyc_output/

# Build
dist/
build/

# Temporary
tmp/
temp/
EOF
```

**创建基础 README**:
```bash
cat > README.md << 'EOF'
# BUGer API - BUG 管理知识库系统

## 快速开始

### 环境要求
- Node.js 18+
- MongoDB 6.0+
- Redis 6.0+

### 安装

```bash
npm install
npm run dev
```

### 环境配置

复制 .env.example 到 .env，配置 MongoDB 和 Redis 连接。

### API 文档

API 规范见 [contracts/openapi.yaml](../specs/001-bug-management/contracts/openapi.yaml)

### 测试

```bash
npm test              # 运行所有测试
npm run test:unit    # 单元测试
npm run test:integration  # 集成测试
```

## 项目结构

```
src/
├── config/          # 配置管理
├── middleware/      # Express 中间件
├── api/            # API 路由和控制器
├── services/       # 业务逻辑
├── models/         # MongoDB 模型
└── utils/          # 工具函数
```

## 更多文档

- [设计规范](../specs/001-bug-management/spec.md)
- [实现计划](../specs/001-bug-management/plan.md)
- [数据模型](../specs/001-bug-management/data-model.md)
- [Redis 集成](../REDIS_INTEGRATION_GUIDE.md)
EOF
```

#### T010: Docker 配置

**创建 Dockerfile**:
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY src ./src
COPY .env ./.env

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/index.js"]
EOF
```

**创建 docker-compose.yml**:
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongo
      MONGO_INITDB_ROOT_PASSWORD: c790414J
      MONGO_INITDB_DATABASE: buger
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --databases 16

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://mongo:c790414J@mongodb:27017/buger
      REDIS_HOST: redis
      REDIS_PORT: 6379
      API_PORT: 3000
    depends_on:
      - mongodb
      - redis

volumes:
  mongodb_data:
EOF
```

#### T011: npm 脚本

已在 package.json 中定义，确认以下脚本可运行：

```bash
cd /opt/iflow/buger/backend

# 验证脚本
npm run --list

# 应该看到所有 scripts 命令
```

---

## ✅ Week 1 Day 1-2 验收清单

在开始 Day 3 (中间件实现) 前，确认以下内容：

- [ ] 项目目录结构完整 (`tree -L 2`)
- [ ] package.json 存在且依赖已安装 (`npm list | head -10`)
- [ ] .env 文件存在且包含正确配置
- [ ] MongoDB 连接测试通过 (`npm run dev` 启动后看到 "MongoDB connected")
- [ ] Redis 连接测试通过 (看到 "Redis connected")
- [ ] 服务器能在 port 3000 启动 (`curl http://localhost:3000/health`)
- [ ] 健康检查返回 200 OK
- [ ] npm test 能运行（即使 0 个测试）
- [ ] .gitignore 已创建
- [ ] Docker 文件已创建

---

## 🔗 Day 2-3 预告：中间件实现

下一步将实现以下中间件：
1. **认证中间件** (T013) - API Key 验证
2. **速率限制** (T014) - Redis 基础限流
3. **请求验证** (T015) - JSON Schema 验证
4. **日志中间件** (T016) - HTTP 请求日志
5. **错误处理** (T012) - 全局错误捕获

每个中间件都会有对应的单元测试和集成测试。

---

**下一文档**: PHASE_1_DAY3_MIDDLEWARE.md (中间件实现详细步骤)

