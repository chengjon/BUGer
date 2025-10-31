# BUGer - BUG管理知识库系统

[![Node.js](https://img.shields.io/badge/Node.js-18_LTS-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)

BUGer 是一个用于记录程序运行时遇到的各种BUG的知识库系统，为各种类型的BUG提供分类管理、搜索和解决方案积累功能。

## 核心功能

- **BUG收集**：通过REST API接收来自各项目的BUG报告
- **智能搜索**：基于MongoDB全文索引的快速BUG搜索
- **解决方案库**：积累团队调试经验，规避重复问题
- **分层查询**：支持按项目、组件、错误码等多维度查询
- **API认证**：基于API Key的项目级访问控制

## 技术架构

- **后端框架**：Node.js 18 LTS + Express.js 4.x
- **数据库**：MongoDB 6.0+（文档存储 + 全文搜索）
- **缓存层**：Redis（可选，用于频繁查询优化）
- **任务队列**：Bull（可选，用于后台任务处理）

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm >= 9.0.0

### 安装依赖

```bash
cd backend
npm install
```

### 配置环境变量

创建 `.env` 文件：

```bash
# MongoDB配置
MONGODB_URI=mongodb://192.168.123.104:27017/buger

# 服务端口
PORT=3003

# API密钥（用于客户端认证）
API_SECRET=your_secret_key_here

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 启动服务

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3003` 启动。

## 数据库维护

BUGer提供完善的数据库健康检查和维护工具。

### 快速使用

```bash
cd backend

# 数据库健康检查（只读模式）
npm run db:check
# 或
node scripts/db-health-check.js

# 自动修复数据问题
npm run db:fix

# 合并重复BUG记录
npm run db:merge

# 归档90天前已解决的BUG
npm run db:archive

# 完整维护（修复+合并+归档）
npm run db:maintain

# 创建推荐的性能索引
npm run db:create-indexes
```

### 主要功能

| 功能 | 描述 | 命令 |
|------|------|------|
| **健康检查** | 检测重复数据、完整性问题、索引状态 | `npm run db:check` |
| **自动修复** | 修复缺失字段和无效值 | `npm run db:fix` |
| **智能合并** | 合并相同项目+错误码的重复BUG | `npm run db:merge` |
| **数据归档** | 归档90天前已解决的BUG到归档集合 | `npm run db:archive` |
| **索引优化** | 创建推荐索引，提升查询性能50-100倍 | `npm run db:create-indexes` |

### 性能改善

创建推荐索引后的性能提升：

- 按项目+错误码查询：**50x 快**（100ms → 2ms）
- 按项目名称查询：**53x 快**（80ms → 1.5ms）
- 归档查询：**50x 快**（150ms → 3ms）

### 维护建议

- **每日**：自动运行健康检查（可配置cron任务）
- **每周**：手动检查并根据建议执行修复和合并
- **每月**：执行数据归档释放存储空间
- **每季度**：完整优化（修复+合并+归档）

详细指南参见 [DB_MAINTENANCE_GUIDE.md](./DB_MAINTENANCE_GUIDE.md)

## API文档

### 核心端点

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/bugs` | 提交单个BUG | API Key |
| POST | `/api/bugs/batch` | 批量提交BUG | API Key |
| GET | `/api/bugs?search=<keyword>` | 搜索BUG | API Key |
| GET | `/api/bugs/:id` | 获取BUG详情 | API Key |
| PATCH | `/api/bugs/:id/solution` | 更新解决方案 | API Key |

### 请求示例

```bash
# 提交BUG
curl -X POST http://localhost:3003/api/bugs \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "errorCode": "API_ERROR_001",
    "title": "登录接口返回500错误",
    "message": "用户登录时API返回Internal Server Error",
    "severity": "high",
    "stackTrace": "Error: ...",
    "context": {
      "project": "my-project",
      "project_name": "MyProject",
      "component": "backend",
      "module": "auth",
      "file": "src/auth/login.js",
      "status": "OPEN"
    }
  }'

# 搜索BUG
curl -X GET "http://localhost:3003/api/bugs?search=登录&project=my-project" \
  -H "X-API-Key: your_api_key"
```

## 客户端集成

其他项目可以通过以下方式集成BUGer服务��

### 方式1：直接调用REST API

参考上面的API文档，使用HTTP客户端直接调用。

### 方式2：使用客户端SDK（规划中）

未来将提供多语言SDK，包括：
- Node.js SDK
- Python SDK
- Java SDK

## BUG数据结构

提交到BUGer的BUG必须遵循以下结构：

```javascript
{
  "errorCode": "string",         // 错误代码（如"API_ERROR_001"）
  "title": "string",             // 简明标题（≤50字符）
  "message": "string",           // 详细描述
  "severity": "critical|high|medium|low",  // 严重程度
  "stackTrace": "string",        // 完整错误堆栈
  "context": {
    "timestamp": "ISO 8601",     // 发现时间
    "project": "string",         // 项目ID
    "project_name": "string",    // 项目名称（必填）
    "project_root": "string",    // 项目根目录（必填）
    "component": "string",       // 组件（frontend/backend/database）
    "module": "string",          // 具体模块路径
    "file": "string",            // 文件路径
    "fix": "string",             // 修复方案描述
    "status": "OPEN|IN_PROGRESS|FIXED|CLOSED"
  }
}
```

## 开发规范

### BUG修复AI协作规范

本项目遵循《Web端程序BUG修复AI协作规范 v4.0》，详见项目根目录的 `BUG修复AI协作规范.md` 文件。

核心要求：
1. **BUGer作为最终权威知识库**：所有BUG必须提交到BUGer服务
2. **调试前先搜索**：修复前必须先在BUGer中搜索已有解决方案
3. **修复后必须提交**：新发现的BUG必须通过API提交到BUGer
4. **分层查询策略**：优先搜索同名项目 → 同类型组件 → 相同错误代码

### 代码规范

- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 提交前运行 `npm run lint`

## 项目文档

- [CLAUDE.md](./CLAUDE.md) - AI协作开发指南
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - 开发者入职文档
- [BUG修复AI协作规范.md](./BUG修复AI协作规范.md) - BUG修复规范（v4.0）
- [DB_MAINTENANCE_GUIDE.md](./DB_MAINTENANCE_GUIDE.md) - 数据库维护完整指南
- [DB_MAINTENANCE_FEATURE_SUMMARY.md](./DB_MAINTENANCE_FEATURE_SUMMARY.md) - 数据库维护功能总结
- [CLIENT_INTEGRATION_GUIDE.md](./CLIENT_INTEGRATION_GUIDE.md) - 客户端集成指南

## 数据库设计

### 主要集合

- `bugs` - BUG报告主集合（包含全文索引）
- `projects` - 注册项目信息
- `solutions` - 已验证的解决方案
- `tags` - BUG分类标签

### 索引策略

- 全文索引：`title`, `message`
- 复合索引：`projectId + timestamp`
- 单字段索引：`severity`, `status`, `errorCode`

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请提交 Issue。

