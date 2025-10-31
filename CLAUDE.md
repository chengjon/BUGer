# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

BUGer 是一个 BUG 管理知识库系统，主要功能包括：
- 通过 API 接口收集各项目运行时的 BUG 报告
- 使用 MongoDB 存储和管理 BUG 数据
- 提供 BUG 搜索和解决方案查询功能
- 帮助开发者快速定位已知问题的解决方法
- 积累团队调试经验，规避重复问题

## 系统架构与技术栈

### 核心组件
1. **API 服务层**：提供 RESTful 接口用于 BUG 上报和查询
2. **数据存储层**：MongoDB 数据库存储 BUG 数据
3. **客户端集成**：SDK/CLI 工具供其他项目接入
4. **搜索引擎**：全文搜索能力用于 BUG 发现

### 技术选型
- **后端框架**：Node.js/Express 或 Python/FastAPI（根据团队偏好选择）
- **数据库**：MongoDB（灵活的文档结构，支持全文搜索）
- **API 协议**：RESTful API + JSON 数据格式
- **认证方式**：基于 API Key 的项目认证

## 开发命令

### 初始化设置
```bash
# 安装依赖（选定框架后）
npm install  # Node.js 项目
# 或
pip install -r requirements.txt  # Python 项目

# 配置 MongoDB 连接
export MONGODB_URI="mongodb://localhost:27017/buger"

# 初始化数据库
npm run db:init  # 或 python scripts/init_db.py
```

### 开发运行
```bash
# 启动开发服务器（支持热重载）
npm run dev  # 或 python -m uvicorn main:app --reload

# 运行测试
npm test  # 或 pytest

# 运行特定测试文件
npm test -- --testPathPattern=api.test.js  # 或 pytest tests/test_api.py

# 代码检查
npm run lint  # 或 pylint src/
```

### 数据库操作
```bash
# 备份数据库
mongodump --uri=$MONGODB_URI --out=backups/$(date +%Y%m%d)

# 恢复数据库
mongorestore --uri=$MONGODB_URI backups/[日期]

# 访问 MongoDB Shell
mongosh $MONGODB_URI
```

## BUG 报告数据结构

BUG 报告应遵循以下数据模型：
```javascript
{
  "projectId": "string",        // 来源项目唯一标识
  "timestamp": "ISO 8601",      // BUG 发生时间
  "environment": {
    "os": "string",            // 操作系统
    "runtime": "string",       // 运行时环境
    "version": "string"        // 版本信息
  },
  "bug": {
    "title": "string",         // 简要描述
    "category": "string",      // BUG 分类
    "severity": "critical|high|medium|low",  // 严重程度
    "stackTrace": "string",    // 堆栈跟踪
    "context": "object",       // 附加调试信息
    "errorCode": "string"      // 错误代码
  },
  "solution": {
    "status": "open|investigating|resolved",  // 解决状态
    "fix": "string",           // 解决方案描述
    "preventionTips": "array"  // 预防建议
  }
}
```

## API 接口设计

### 核心接口列表
- `POST /api/bugs` - 提交新的 BUG 报告
- `GET /api/bugs/search` - 搜索 BUG（支持关键词和过滤器）
- `GET /api/bugs/:id` - 获取特定 BUG 详情
- `PATCH /api/bugs/:id/solution` - 更新 BUG 解决方案
- `GET /api/projects/:id/bugs` - 获取项目的所有 BUG
- `GET /api/stats` - 获取 BUG 统计和趋势

## 客户端项目集成指南

其他项目接入 BUGer 的方式：
1. **SDK 安装**：提供各语言的 SDK 包
2. **错误捕获**：自动捕获未处理异常
3. **手动上报**：提供手动上报 API
4. **配置管理**：API Key 和端点配置

集成示例：
```javascript
// 客户端项目集成代码
const BugerClient = require('buger-client');
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  endpoint: 'https://buger.example.com'
});

// 自动捕获错误
process.on('uncaughtException', (error) => {
  buger.report(error);
});

// 手动上报 BUG
buger.report({
  title: '用户登录失败',
  category: '认证',
  severity: 'high',
  context: { userId: 123 }
});
```

## MongoDB 集合设计

### 主要集合
- `bugs` - 主 BUG 报告集合，包含全文索引
- `projects` - 注册项目及其配置信息
- `solutions` - 已验证的解决方案和变通方法
- `tags` - BUG 分类和标签系统

### 索引策略
- 在标题和描述上创建文本索引用于搜索
- 在 projectId + timestamp 上创建复合索引用于过滤
- 在 severity 和 status 上创建索引用于仪表板查询

## 安全考虑

- 实现 API Key 轮换机制
- 按项目进行速率限制防止滥用
- 输入数据清理防止注入攻击
- 敏感错误上下文数据加密
- 实现项目级别的访问控制

## 性能优化策略

- 为频繁搜索实现缓存层
- 大结果集分页返回
- 重度处理任务使用后台作业
- 数据库连接池管理
- 考虑读写分离优化搜索性能

## 监控与日志

- 跟踪 API 响应时间
- 监控数据库查询性能
- 记录所有 BUG 提交用于审计
- 关键 BUG 提交时发送告警
- 提供 BUG 趋势和模式分析仪表板

## BUG修复AI协作规范

本项目遵循《Web端程序BUG修复AI协作规范 v4.0》，该规范位于项目根目录的 `BUG修复AI协作规范.md` 文件。

### 核心原则
1. **BUGer作为最终权威知识库**：所有BUG必须提交到BUGer服务
2. **调试前先搜索**：修复前必须先在BUGer中搜索已有解决方案
3. **修复后必须提交**：新发现的BUG必须通过API提交到BUGer
4. **分层查询策略**：优先搜索同名项目 → 同类型组件 → 相同错误代码

### BUG数据结构标准

提交到BUGer的BUG必须遵循以下结构：

```javascript
{
  "errorCode": "string",         // 错误代码（如"API_ERROR_001"）
  "title": "string",             // 简明标题（50字符以内）
  "message": "string",           // 详细描述
  "severity": "critical|high|medium|low",
  "stackTrace": "string",        // 完整错误堆栈
  "context": {
    "timestamp": "ISO 8601",     // 发现时间
    "project": "string",         // 项目ID（如"buger"）
    "project_name": "string",    // 项目名称（必填，如"BUGer"）
    "project_root": "string",    // 项目根目录（必填）
    "component": "string",       // 组件（frontend/backend/database）
    "module": "string",          // 具体模块路径
    "file": "string",            // 文件路径
    "fix": "string",             // 修复方案描述
    "status": "OPEN|IN_PROGRESS|FIXED|CLOSED"
  }
}
```

### 客户端集成要求

其他项目集成BUGer服务时，应使用客户端SDK或直接调用API：

1. **环境配置**（`.env`文件）：
   ```bash
   BUGER_API_URL=http://localhost:3003/api
   BUGER_API_KEY=your_api_key_here
   PROJECT_ID=your_project_id
   ```

2. **API端点**：
   - `POST /api/bugs` - 提交单个BUG
   - `POST /api/bugs/batch` - 批量提交BUG
   - `GET /api/bugs?search=<keyword>&project=<project_id>` - 搜索BUG

3. **认证方式**：通过 `X-API-Key` 请求头

### AI协作要求

在使用AI修复BUG时，必须遵守以下规范：

1. **修复前检查**：
   - 使用BUGer API搜索同名项目下的相同错误
   - 如找到已知解决方案，优先使用

2. **修复后提交**：
   - 新发现的BUG必须提交到BUGer
   - 提交必须包含完整的context信息

3. **错误处理**：
   - BUGer服务不可用时，记录到本地日志
   - 不因BUGer不可用而中断修复流程

更多详细规范请参考项目根目录的 `BUG修复AI协作规范.md` 文件。

## Active Technologies
- Node.js 18 LTS / Express.js 4.x + Express.js, Mongoose (MongoDB ODM), Redis (缓存层), Bull (任务队列) (001-bug-management)
- MongoDB 6.0+ (已提供配置: 192.168.123.104:27017) (001-bug-management)

## Recent Changes
- 001-bug-management: Added Node.js 18 LTS / Express.js 4.x + Express.js, Mongoose (MongoDB ODM), Redis (缓存层), Bull (任务队列)
