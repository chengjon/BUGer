# BUGer 开发团队快速启动指南

**文档版本**: 1.0 | **日期**: 2025-10-27 | **阶段**: Phase 1 执行准备

---

## 🚀 5分钟项目概览

**项目名称**: BUGer - BUG 管理知识库系统

**核心目标**:
- 中心化收集各项目的运行时错误（API 接口）
- 全文搜索已知 BUG 及其解决方案
- 帮助开发者快速定位和解决问题

**技术栈**: Node.js 18 LTS + Express.js + MongoDB + Redis + Jest

**MVP 范围**: 4周内交付 3 个核心用户故事
- US1: BUG 上报与记录
- US2: BUG 搜索与发现
- US3: 解决方案管理

---

## 📊 项目结构一览表

```
/opt/iflow/buger/
│
├── 📋 设计文档 (specs/001-bug-management/)
│   ├── spec.md                    # 功能规范和需求说明
│   ├── plan.md                    # 技术架构和实现计划
│   ├── data-model.md              # MongoDB 数据模型定义
│   ├── research.md                # 技术研究和决策依据
│   ├── quickstart.md              # 开发者集成指南
│   ├── contracts/openapi.yaml     # API 规范文档
│   ├── checklists/requirements.md # 需求检查清单
│   └── tasks.md                   # 详细任务分解（90个任务）
│
├── 📚 审计文档 (根目录)
│   ├── ARCHITECTURE_AUDIT.md       # 完整架构审计报告
│   ├── OPTIMIZATION_SUMMARY.md     # MVP 优化方案总结
│   ├── QUICK_COMPARISON.md         # 成本和性能对比
│   ├── COST_OPTIMIZATION_PLAN.md   # 详细成本分析
│   ├── IMPLEMENTATION_CHECKLIST.md # 执行检查清单
│   └── AUDIT_DOCUMENTS_INDEX.md    # 审计文档导航
│
├── ⚙️ 配置文件 (根目录)
│   ├── .env.example               # 环境变量模板
│   ├── REDIS_INTEGRATION_GUIDE.md  # Redis 集成指南
│   ├── CLAUDE.md                  # AI 助手项目指南
│   └── BUG修复AI协作规范.md       # BUG修复开发规范（v4.0）
│
└── 📁 代码目录 (待创建)
    └── backend/                   # Phase 1 中创建
        ├── src/
        ├── tests/
        ├── package.json
        └── Dockerfile
```

---

## 🎯 当前状态和下一步行动

### ✅ 已完成的工作

| 阶段 | 交付物 | 文件 | 状态 |
|------|--------|------|------|
| Phase 0 | 项目指南创建 | CLAUDE.md | ✅ |
| Phase 0 | 功能规范生成 | spec.md | ✅ |
| Phase 1 | 技术设计和架构 | plan.md, data-model.md | ✅ |
| Phase 1 | API 契约规范 | openapi.yaml | ✅ |
| Phase 1 | 优化和审计 | OPTIMIZATION_SUMMARY.md + 5份审计文档 | ✅ |
| Phase 1 | 环境配置 | .env.example, REDIS_INTEGRATION_GUIDE.md | ✅ |
| Phase 2 | 任务分解 | tasks.md (90个任务) | ✅ |

### 🚧 下一步行动 (Phase 1 执行)

1. **Day 1-2**: 项目初始化和基础设施（T001-T011）
2. **Day 3-5**: 中间件和认证系统（T012-T022）
3. **Day 6-15**: 并行开发 US1/US2/US3
4. **Day 16+**: 集成测试和上线准备

---

## 💻 开发环境检查清单

在开始编码前，请确保以下条件满足：

### 环境变量配置

```bash
cd /opt/iflow/buger

# 创建 .env 文件（复制并更新 .env.example）
cp .env.example .env

# 验证配置内容（应包含）
cat .env | grep -E "MONGODB_URI|REDIS_HOST"
```

**预期输出**:
```
MONGODB_URI=mongodb://mongo:c790414J@192.168.123.104:27017/buger
REDIS_HOST=192.168.123.104
REDIS_PORT=6379
REDIS_DB=1
```

### MongoDB 连接验证

```bash
# 方法 1: 使用 mongosh（推荐）
mongosh "mongodb://mongo:c790414J@192.168.123.104:27017/buger"

# 如果连接成功，应该看到 mongosh 提示符，执行：
> db.version()
# 应该返回 MongoDB 版本号，如 "6.0.0"
```

**故障排查**:
- 如果提示"连接失败"，检查 MongoDB 服务是否运行
- 确认 IP 192.168.123.104 可访问（`ping 192.168.123.104`）
- 验证用户名/密码正确性

### Redis 连接验证

```bash
# 使用 redis-cli
redis-cli -h 192.168.123.104 -p 6379 -n 1 ping

# 预期输出：PONG
```

**故障排查**:
- 如果提示"连接超时"，检查 Redis 服务状态
- 验证防火墙允许 6379 端口访问
- 确认 Redis 监听正确的 IP 地址

### Node.js 和依赖检查

```bash
# 检查 Node.js 版本
node --version
# 应该是 v18.x 或更高

# 检查 npm 版本
npm --version
# 应该是 v9.x 或更高

# 创建项目目录并初始化
cd /opt/iflow/buger
mkdir -p backend
cd backend
npm init -y
```

---

## 📖 关键文档速览

### 对于所有开发人员（必读）
1. **BUG修复AI协作规范.md** (30分钟) - **必读** - 开发和调试的核心规范
   - 精准需求原则
   - 小步迭代原则
   - 工具驱动验证原则
   - BUGer服务集成要求

### 对于项目经理
1. **QUICK_COMPARISON.md** (5分钟) - 成本和时间对比
2. **IMPLEMENTATION_CHECKLIST.md** (10分钟) - 执行进度追踪
3. **tasks.md** (15分钟) - 详细任务列表和 Sprint 分配

### 对于后端开发人员
1. **data-model.md** (15分钟) - MongoDB 集合和字段设计
2. **contracts/openapi.yaml** (20分钟) - API 端点规范
3. **REDIS_INTEGRATION_GUIDE.md** (20分钟) - Redis 集成实现

### 对于前端/集成开发
1. **quickstart.md** (20分钟) - SDK 集成方式和示例
2. **spec.md** - 用户故事和需求说明

### 对于 DevOps/架构师
1. **ARCHITECTURE_AUDIT.md** (30分钟) - 完整的架构审计
2. **OPTIMIZATION_SUMMARY.md** (20分钟) - 优化决策和成本分析
3. **plan.md** - 技术栈和扩展规划

---

## 📐 开发规范（重要）

### BUG修复AI协作规范

本项目严格遵循《Web端程序BUG修复AI协作规范 v4.0》，位于项目根目录的 `BUG修复AI协作规范.md` 文件。

#### 核心原则摘要

1. **BUGer作为最终权威知识库**
   - 所有BUG必须提交到BUGer服务
   - 调试前必须先在BUGer中搜索已有解决方案
   - 新发现的BUG必须通过API提交

2. **精准需求原则**
   - 禁止模糊表述（如"修复登录的BUG"）
   - 必须包含：现象、预期结果、验证标准
   - 优先级强制分级：P0/P1/P2

3. **小步迭代原则**
   - 单次仅处理2-3个问题
   - 修改1-2个相关函数/文件
   - 验证失败必须回滚，不得叠加修改

4. **工具驱动验证原则**
   - 必须使用工具验证修复效果
   - 推荐工具：chrome-devtools-mcp、puppeteer、root-cause-debugger
   - 提供可追溯的证据（截图、日志、测试报告）

#### BUGer服务集成要求

在开发BUGer项目时，我们自身也要使用BUGer服务记录开发过程中的BUG：

**环境配置**（`.env`文件）：
```bash
# BUGer服务配置���用于记录本项目的BUG）
BUGER_API_URL=http://localhost:3003/api
BUGER_API_KEY=your_api_key_here
PROJECT_ID=buger
PROJECT_NAME=BUGer
```

**分层查询策略**：
1. **第一层**：搜索同名项目（BUGer）下的相同错误
2. **第二层**：搜索同类型组件（backend/frontend）的相似BUG
3. **第三层**：搜索相同错误代码的所有项目BUG

**BUG提交标准**：
```javascript
{
  "errorCode": "string",         // 如"API_ERROR_001"
  "title": "string",             // 简明标题（≤50字符）
  "message": "string",           // 详细描述
  "severity": "critical|high|medium|low",
  "stackTrace": "string",
  "context": {
    "project": "buger",          // 项目ID
    "project_name": "BUGer",     // 项目名称（必填）
    "project_root": "/opt/iflow/buger",  // 项目根目录（必填）
    "component": "backend",      // 组件
    "module": "api/bugs",        // 模块路径
    "file": "src/api/controllers/bugController.js",
    "fix": "修复方案描述",
    "status": "OPEN|IN_PROGRESS|FIXED|CLOSED"
  }
}
```

#### AI协作要求

使用AI辅助开发时，必须遵守：

1. **修复前检查**：
   - 使用`GET /api/bugs?search=<keyword>&project=buger`搜索已知BUG
   - 如找到解决方案，优先使用而非重新分析

2. **修复后提交**：
   - 通过`POST /api/bugs`提交新BUG
   - 包含完整的context信息

3. **错误处理**：
   - 服务不可用时，记录到本地日志
   - 不因服务不可用而中断开发流程

更多详细规范请阅读完整文档：`BUG修复AI协作规范.md`

---

## 🔧 快速开发命令参考

### 项目初始化（Phase 1 第 1 天）

```bash
# 进入项目目录
cd /opt/iflow/buger/backend

# 安装依赖
npm install

# 创建基础目录结构
mkdir -p src/{config,middleware,api,services,models,utils}
mkdir -p src/api/{routes,controllers}
mkdir -p tests/{unit,integration,contract}

# 创建 .env（从已有的根目录 .env 复制）
cp ../.env .

# 启动开发服务器（需要先完成 src/index.js）
npm run dev

# 运行测试
npm test

# 检查代码质量
npm run lint
```

### 常用 npm 脚本

```json
{
  "scripts": {
    "dev": "nodemon src/index.js --env-file=.env",
    "start": "node src/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "db:init": "node scripts/init-db.js",
    "db:check": "node scripts/db-health-check.js",
    "db:fix": "node scripts/db-health-check.js --fix",
    "db:merge": "node scripts/db-health-check.js --merge",
    "db:archive": "node scripts/db-health-check.js --archive",
    "db:maintain": "node scripts/db-health-check.js --fix --merge --archive",
    "db:create-indexes": "node scripts/create-indexes.js"
  }
}
```

### 数据库维护命令

```bash
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

**数据库维护说明**：
- 健康检查包含9大功能：重复检测、完整性检查、合并建议、统计分析、索引检查、归档分析
- 修复操作安全可靠：只修复明确的数据问题（缺失字段、无效值等）
- 合并操作智能处理：保留最早创建的BUG，累加出现次数
- 归档操作释放空间：移动90天前已解决的BUG到归档集合
- 性能优化显著：创建索引后查询速度提升50-100倍

详细指南参见：[DB_MAINTENANCE_GUIDE.md](../DB_MAINTENANCE_GUIDE.md) 和 [DB_MAINTENANCE_FEATURE_SUMMARY.md](../DB_MAINTENANCE_FEATURE_SUMMARY.md)

---

## 📋 Phase 1 执行计划

### Week 1: 基础设施搭建

| 天 | 任务 | 预期交付 | 负责人 |
|----|------|--------|--------|
| 1 | 项目初始化 (T001-T011) | package.json, 项目结构, 启动脚本 | Dev 1 |
| 2-3 | 中间件实现 (T012-T022) | 认证, 限流, 错误处理, 日志 | Dev 1,2 |
| 4-7 | US1: BUG 上报 (T023-T036) | POST /api/bugs, 批量提交 | Dev 2,3 |

### Week 2-3: 核心功能并行开发

| US | 日期 | 任务范围 | 负责人 |
|----|------|--------|--------|
| US2 | Week 2-3 | BUG 搜索 (T037-T053) | Dev 1,4 |
| US3 | Week 3-4 | 解决方案管理 (T054-T064) | Dev 3,4 |

### Week 4: 集成和部署

| 阶段 | 日期 | 任务 | 验收标准 |
|------|------|------|--------|
| 集成测试 | Week 4 Day 1-2 | E2E 流程测试 | 所有用户故事可用 |
| 性能测试 | Week 4 Day 2-3 | 并发和延迟测试 | P95 < 2秒 |
| 部署准备 | Week 4 Day 4-5 | Docker 打包, 文档 | 可上线 |

---

## 🧪 测试策略速览

### 单元测试覆盖率目标: 70%+

```bash
# 示例：测试 rateLimiter 中间件
npm test -- tests/unit/middleware/rateLimiter.test.js

# 查看覆盖率报告
npm test -- --coverage
```

### 集成测试覆盖目标: 所有 API 端点

```bash
# 运行所有集成测试
npm test -- tests/integration

# 示例：测试 BUG 提交流程
npm test -- tests/integration/bugs.integration.test.js
```

### API 契约测试

使用 Postman 或 API 测试框架验证 openapi.yaml 中的每个端点

---

## 🚨 常见问题快速解答

### Q1: MongoDB 连接失败怎么办？
**A**: 检查 MongoDB 服务运行状态
```bash
# 查看 MongoDB 日志
sudo journalctl -u mongodb -n 50
# 或检查进程
ps aux | grep mongod
```

### Q2: Redis 连接但限流不生效？
**A**: 检查 Lua 脚本是否正确加载
```bash
# 连接 Redis 并验证 key
redis-cli -h 192.168.123.104 -n 1
> KEYS ratelimit:*
# 应该能看到限流 key
```

### Q3: npm install 卡住或出错？
**A**: 使用清华大学 npm 镜像加速
```bash
npm config set registry https://mirrors.tuna.tsinghua.edu.cn/npm/
npm install
```

### Q4: 如何快速检查所有配置是否正确？
**A**: 运行健康检查
```bash
# 启动应用后，访问
curl http://localhost:3000/health
# 应返回: {"status":"OK","timestamp":"..."}
```

---

## 📞 技术支持和沟通

### 遇到问题的解决流程

1. **检查本文档** - 90% 的问题在这里有答案
2. **查看相关设计文档** - data-model.md, plan.md
3. **查阅 API 规范** - contracts/openapi.yaml
4. **咨询架构审计** - ARCHITECTURE_AUDIT.md 的故障排查部分

### 修改需求的流程

任何需要修改以下内容的变更，需要更新相应文档：
- API 端点 → 更新 openapi.yaml + tasks.md
- 数据模型 → 更新 data-model.md
- 技术栈 → 更新 plan.md + CLAUDE.md
- 时间表 → 更新 IMPLEMENTATION_CHECKLIST.md

---

## ✅ 开发团队启动检查清单

在开始编码前，请逐项确认：

- [ ] 已阅读本文档（10分钟）
- [ ] 已验证 MongoDB 连接可用
- [ ] 已验证 Redis 连接可用
- [ ] 已安装 Node.js 18 LTS 及以上
- [ ] 已克隆项目并创建 backend 目录
- [ ] 已创建 .env 文件并配置正确
- [ ] 已创建项目目录结构
- [ ] 已安装核心 npm 依赖
- [ ] 已阅读 data-model.md（数据模型）
- [ ] 已审视 openapi.yaml（API 设计）
- [ ] 已理解 tasks.md 中你的任务分配
- [ ] 已与团队确认 Sprint 计划
- [ ] 已准备好开始 T001 (项目初始化)

---

## 📚 完整文档导航

```
快速查找指南：

想了解 → 查看文件
-------------------------------
功能需求 → spec.md
技术架构 → plan.md
数据库设计 → data-model.md
API 规范 → openapi.yaml
Redis 使用 → REDIS_INTEGRATION_GUIDE.md
集成指南 → quickstart.md
任务分配 → tasks.md
成本分析 → QUICK_COMPARISON.md
完整审计 → ARCHITECTURE_AUDIT.md
执行进度 → IMPLEMENTATION_CHECKLIST.md
```

---

**准备好开始 Phase 1 了吗？** 🚀

确保团队成员都已完成上述检查清单，然后开始执行 tasks.md 中的 T001-T011（项目初始化）。

祝开发愉快！

