# Data Model: BUG 管理知识库系统

**Feature**: BUG 管理知识库系统 | **Date**: 2025-10-27 | **Database**: MongoDB 6.0+

## 数据库架构概览

```
buger (主数据库)
├── bugs                  # BUG 报告集合 (主集合，全文索引)
├── projects             # 项目配置集合
├── solutions            # 解决方案集合
├── tags                 # 标签分类集合
├── audit_logs           # 审计日志集合
└── system.indexes       # MongoDB 索引元数据
```

## 集合定义

### 1. bugs - BUG 报告集合

**用途**：存储所有 BUG 报告的核心信息

**MongoDB Schema**：

```javascript
{
  _id: ObjectId,                         // MongoDB 自动生成的主键

  // 项目信息
  projectId: String,                     // 来源项目 ID (必需，索引)
  projectName: String,                   // 项目名称 (冗余，加快查询)

  // BUG 基本信息
  bugId: String,                         // 全局唯一 BUG ID (索引)
  title: String,                         // BUG 标题 (必需，全文索引)
  description: String,                   // 详细描述 (全文索引)
  category: String,                      // BUG 分类 (索引)
  severity: {                            // 严重程度
    type: String,
    enum: ["critical", "high", "medium", "low"],
    default: "medium"
  },
  status: {                              // BUG 状态 (索引)
    type: String,
    enum: ["open", "investigating", "resolved"],
    default: "open"
  },

  // 错误信息
  errorCode: String,                     // 错误代码 (索引)
  errorMessage: String,                  // 错误信息
  errorType: String,                     // 错误类型 (如 TypeError, NullPointerException)
  stackTrace: String,                    // 堆栈跟踪 (全文索引，最多 1MB)
  stackTraceHash: String,                // 堆栈跟踪哈希 (用于去重)

  // 环境信息
  environment: {
    os: String,                          // 操作系统
    runtime: String,                     // 运行时环境 (Node.js, Python, Java)
    runtimeVersion: String,              // 运行时版本
    appVersion: String,                  // 应用版本
    nodeVersion: String,                 // Node 版本 (可选)
    platform: String                     // 平台 (Linux, Windows, macOS)
  },

  // 上下文信息
  context: {
    userId: String,                      // 用户 ID (可选)
    sessionId: String,                   // 会话 ID (可选)
    requestId: String,                   // 请求 ID (可选)
    customData: Map                      // 自定义数据 (JSON 对象)
  },

  // 分类和标签
  tags: [String],                        // 标签数组 (索引)
  components: [String],                  // 涉及的组件

  // 解决方案关联
  solutionId: ObjectId,                  // 关联的解决方案 ID
  hasSolution: Boolean,                  // 是否有解决方案 (冗余，加快查询)

  // 统计信息
  occurrenceCount: {                     // 发生次数统计
    type: Number,
    default: 1,
    min: 1
  },
  lastOccurrenceAt: Date,                // 最后发生时间
  relatedBugIds: [String],               // 相关 BUG ID 列表 (用于关联)

  // 时间戳
  createdAt: {                           // 创建时间 (索引)
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {                           // 更新时间
    type: Date,
    default: Date.now
  },
  firstReportedAt: Date,                 // 首次上报时间

  // 元数据
  reportedBy: String,                    // 上报人 (SDK 版本)
  source: String,                        // 来源 (web, mobile, backend)

  // 数据保留
  archived: Boolean,                     // 是否已归档
  archivedAt: Date                       // 归档时间
}
```

**验证规则**：

```javascript
const bugSchema = new Schema({
  // 必填字段验证
  projectId: { type: String, required: true },
  title: { type: String, required: true, minlength: 5, maxlength: 500 },
  errorCode: { type: String, required: true, maxlength: 50 },

  // 长度限制
  description: { type: String, maxlength: 10000 },
  stackTrace: { type: String, maxlength: 1048576 }, // 1MB max

  // 枚举验证
  severity: { type: String, enum: ["critical", "high", "medium", "low"] },
  status: { type: String, enum: ["open", "investigating", "resolved"] },

  // 默认值
  createdAt: { type: Date, default: Date.now },
  occurrenceCount: { type: Number, default: 1, min: 1 }
});
```

**索引策略**：

```javascript
// 1. 全文索引（用于搜索）
db.bugs.createIndex({
  title: "text",
  description: "text",
  errorCode: "text",
  stackTrace: "text"
}, { default_language: "english" });

// 2. 项目查询索引
db.bugs.createIndex({ projectId: 1, createdAt: -1 });

// 3. 状态和严重度查询
db.bugs.createIndex({ severity: 1, status: 1 });

// 4. 错误代码查询
db.bugs.createIndex({ errorCode: 1 });

// 5. 时间范围查询
db.bugs.createIndex({ createdAt: 1 });

// 6. 标签查询
db.bugs.createIndex({ tags: 1 });

// 7. 去重索引（堆栈跟踪哈希）
db.bugs.createIndex({ stackTraceHash: 1, projectId: 1 });

// 8. 复合查询索引（常见筛选条件）
db.bugs.createIndex({
  projectId: 1,
  severity: 1,
  status: 1,
  createdAt: -1
});
```

**集合配置**：

```javascript
// 时间序列集合配置（优化大数据量存储）
db.createCollection("bugs", {
  timeseries: {
    timeField: "createdAt",
    metaField: "metadata",
    granularity: "hours"  // 按小时分组，减少内存占用
  }
});
```

---

### 2. projects - 项目配置集合

**用途**：存储接入系统的项目信息和认证凭证

```javascript
{
  _id: ObjectId,

  // 项目基本信息
  projectId: String,                     // 项目唯一标识 (索引)
  projectName: String,                   // 项目名称 (必需)
  description: String,                   // 项目描述
  team: String,                          // 团队名称

  // 认证信息
  apiKey: String,                        // API Key (hash存储，索引)
  apiKeyHash: String,                    // API Key 哈希值 (实际存储)
  apiKeyCreatedAt: Date,                 // API Key 创建时间
  apiKeyRotatedAt: Date,                 // 最后轮换时间

  // 配置
  settings: {
    enabled: Boolean,                    // 是否启用
    autoCapture: Boolean,                // 是否自动捕获异常
    sampleRate: Number,                  // 采样率 (0-1)
    maxStackTraceLength: Number,          // 最大堆栈跟踪长度 (字节)
    enableNotification: Boolean           // 是否启用通知
  },

  // 速率限制
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 200
    },
    batchSizeLimit: {
      type: Number,
      default: 20
    }
  },

  // 统计信息
  stats: {
    totalBugs: { type: Number, default: 0 },
    totalReports: { type: Number, default: 0 },
    lastReportAt: Date,
    activeVersions: [String]
  },

  // 时间戳
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}
```

**索引**：

```javascript
db.projects.createIndex({ projectId: 1 }, { unique: true });
db.projects.createIndex({ apiKeyHash: 1 });
db.projects.createIndex({ createdAt: 1 });
```

---

### 3. solutions - 解决方案集合

**用途**：存储 BUG 的解决方案和相关信息

```javascript
{
  _id: ObjectId,

  // 关联信息
  bugId: String,                         // 关联的 BUG ID (索引)
  bugIds: [String],                      // 关联的多个 BUG ID (用于合并问题)

  // 解决方案内容
  title: String,                         // 解决方案标题
  description: String,                   // 详细描述
  fix: String,                           // 修复代码或步骤 (markdown 格式)
  steps: [                               // 修复步骤列表
    {
      order: Number,
      title: String,
      description: String,
      code: String
    }
  ],

  // 预防建议
  preventionTips: [String],              // 预防建议列表
  preventionCode: String,                // 预防代码示例

  // 状态
  status: {
    type: String,
    enum: ["draft", "verified", "deprecated"],
    default: "draft"
  },
  verifiedBy: String,                    // 验证人
  verifiedAt: Date,                      // 验证时间

  // 版本管理
  version: {
    type: Number,
    default: 1
  },
  previousVersionIds: [ObjectId],        // 历史版本 ID
  changelog: String,                     // 更新日志

  // 效果评价
  effectiveness: {                       // 解决方案有效性评分
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  feedbackCount: {
    type: Number,
    default: 0
  },

  // 相关资源
  tags: [String],                        // 标签
  references: [                          // 参考链接
    {
      title: String,
      url: String,
      type: String  // "documentation", "stackoverflow", "github", etc.
    }
  ],

  // 元数据
  createdBy: String,                     // 创建人
  updatedBy: String,                     // 最后修改人

  // 时间戳
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}
```

**索引**：

```javascript
db.solutions.createIndex({ bugId: 1 });
db.solutions.createIndex({ bugIds: 1 });
db.solutions.createIndex({ status: 1, createdAt: -1 });
```

---

### 4. tags - 标签分类集合

**用途**：管理 BUG 分类标签

```javascript
{
  _id: ObjectId,

  // 标签信息
  name: String,                          // 标签名称 (必需，唯一，索引)
  description: String,                   // 标签描述
  color: String,                         // 前端显示颜色
  priority: Number,                      // 优先级

  // 统计
  bugCount: {
    type: Number,
    default: 0
  },

  // 时间戳
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

**索引**：

```javascript
db.tags.createIndex({ name: 1 }, { unique: true });
```

---

### 5. audit_logs - 审计日志集合

**用途**：记录所有重要操作用于审计和故障排查

```javascript
{
  _id: ObjectId,

  // 操作信息
  action: String,                        // 操作类型 (create, update, delete, search)
  resource: String,                      // 资源类型 (bug, solution, project)
  resourceId: String,                    // 资源 ID

  // 请求信息
  apiKey: String,                        // API Key (hash)
  projectId: String,                     // 项目 ID
  ipAddress: String,                     // IP 地址
  userAgent: String,                     // User Agent

  // 结果
  status: {
    type: String,
    enum: ["success", "failure"],
    default: "success"
  },
  statusCode: Number,                    // HTTP 状态码
  error: String,                         // 错误信息 (如果有)

  // 时间戳
  timestamp: { type: Date, default: Date.now, index: true }
}
```

**索引**：

```javascript
db.audit_logs.createIndex({ timestamp: 1, projectId: 1 });
db.audit_logs.createIndex({ action: 1 });
```

---

## 数据关系图

```
┌──────────────┐
│   Projects   │
└──────┬───────┘
       │ 1
       │ (projectId)
       │ ∞
       │
┌──────▼────────┐         ┌─────────────┐
│     Bugs      │◄────────┤  Solutions  │
└──────┬────────┘ has     └─────────────┘
       │ multiple
       │
┌──────▼────────┐
│     Tags      │
└───────────────┘

关系说明：
- 1个Project : ∞个Bugs (一对多)
- 1个Bug : 0或1个Solution (一对一或一对零)
- ∞个Bugs : ∞个Tags (多对多)
```

---

## 数据一致性和完整性

### 事务支持

MongoDB 4.0+ 支持多文档事务，用于保证数据一致性：

```javascript
// 示例：创建 BUG 时自动更新项目统计
const session = await client.startSession();
session.startTransaction();

try {
  // 创建 BUG
  await bugs.insertOne(bugDoc, { session });

  // 更新项目统计
  await projects.updateOne(
    { projectId: bugDoc.projectId },
    {
      $inc: { 'stats.totalBugs': 1 },
      $set: { 'stats.lastReportAt': new Date() }
    },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

### 唯一性约束

```javascript
// BUG ID 全局唯一
db.bugs.createIndex({ bugId: 1 }, { unique: true });

// 项目 ID 唯一
db.projects.createIndex({ projectId: 1 }, { unique: true });

// 标签名唯一
db.tags.createIndex({ name: 1 }, { unique: true });
```

---

## 性能优化建议

### 1. 字段冗余

在 bugs 集合中冗余 projectName，避免每次查询都需要 join：

```javascript
// 查询时不需要 lookup，直接获取项目名
db.bugs.findOne({ _id: ObjectId(...) })
// 返回的文档已包含 projectName
```

### 2. 批量操作

使用 bulkWrite 提高批量插入性能：

```javascript
const bulkOps = bugs.map(bug => ({
  insertOne: { document: bug }
}));
const result = await db.collection('bugs').bulkWrite(bulkOps);
```

### 3. 分片键选择

```javascript
// 推荐：(projectId, createdAt)
// - projectId 保证数据均匀分布
// - createdAt 支持时间范围查询
db.bugs.createIndex({ projectId: 1, createdAt: -1 });
```

### 4. TTL 索引

如果需要自动删除某些日志：

```javascript
// 自动删除 30 天后的审计日志
db.audit_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000 }  // 30天
);
```

---

## 数据导入/导出

### 导出 BUG 数据（备份）

```bash
mongoexport --uri "mongodb://mongo:c790414J@192.168.123.104:27017/buger" \
  --collection bugs \
  --out bugs_backup_$(date +%Y%m%d).json
```

### 导入 BUG 数据

```bash
mongoimport --uri "mongodb://mongo:c790414J@192.168.123.104:27017/buger" \
  --collection bugs \
  --file bugs_backup_20251027.json
```

---

## 容量规划

| 场景 | 月增长 | 年数据量 | 存储需求 |
|------|--------|---------|---------|
| 小型（1-10项目） | 30万 BUG | 360万 | ~7.2GB |
| 中型（10-50项目） | 150万 BUG | 1800万 | ~36GB |
| 大型（50+项目） | 500万 BUG | 6000万 | ~120GB |

**建议**：
- 小型项目：单机 M30 (10GB)
- 中型项目：M40 副本集 (40GB)
- 大型项目：M50 分片集群 (200GB+)