# Research Phase: BUG 管理知识库系统

**Feature**: BUG 管理知识库系统 | **Date**: 2025-10-27 | **Branch**: `001-bug-management`

## 研究总结

本阶段对系统的关键技术选型进行了深入研究，包括数据库搜索优化、速率限制实现、数据存储策略和高可用架构设计。

## 1. MongoDB 全文搜索优化

### 决策：采用 MongoDB Atlas Search

**理由**：
- Atlas Search 搜索速度快 60%，支持 10,000+ 并发查询
- 异步索引更新，不影响写性能
- 支持多个专业化索引，满足不同搜索场景
- 基于 Apache Lucene 引擎，行业标准

**对标方案**：
- MongoDB Text Index：性能不足，并发能力弱，仅支持 1 个索引
- 自建搜索系统：实现复杂，维护成本高

### 索引策略

```javascript
// 主搜索索引配置
{
  "analyzer": "lucene.standard",
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.standard",
        "foldDiacritics": false,
        "indexOptions": "offsets",
        "store": false
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english",
        "foldDiacritics": false
      },
      "errorCode": {
        "type": "string",
        "analyzer": "lucene.keyword",
        "indexOptions": "offsets"
      },
      "stackTrace": {
        "type": "string",
        "analyzer": "lucene.whitespace"
      },
      "severity": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "status": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "projectId": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "tags": {
        "type": "stringFacet"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

### 预期性能指标

- **查询延迟**：P95 < 1秒，P99 < 2秒
- **并发能力**：支持 10,000+ 并发查询
- **索引更新延迟**：< 5 秒
- **可用性**：99.9%+

## 2. API 速率限制实现

### 决策：Redis + 滑动窗口算法

**理由**：
- Redis 提供原子操作，确保分布式环境一致性
- 滑动窗口算法精确度高，适合精确的 200 req/min 限制
- 实现简单，性能高效

**限流配置**：
- 每项目每分钟 200 次请求
- 超额请求返回 429 状态码
- 返回剩余配额和重置时间

### 实现伪代码

```javascript
// Redis 滑动窗口限流
async function checkRateLimit(apiKey) {
  const now = Date.now();
  const windowStart = now - 60000; // 1分钟窗口
  const key = `ratelimit:${apiKey}`;

  // 删除过期记录
  await redis.zremrangebyscore(key, 0, windowStart);

  // 获取窗口内请求数
  const count = await redis.zcard(key);

  if (count >= 200) {
    return {
      allowed: false,
      remaining: 0,
      reset: Math.ceil((await redis.zrange(key, 0, 0, 'WITHSCORES'))[1] / 1000) + 60
    };
  }

  // 记录当前请求
  await redis.zadd(key, now, `${now}:${Math.random()}`);
  await redis.expire(key, 60);

  return {
    allowed: true,
    remaining: 200 - count - 1,
    reset: Math.ceil(now / 1000) + 60
  };
}
```

## 3. 数据永久存储策略

### 决策：MongoDB 分片 + 按月分区

**理由**：
- 分片支持无限扩展存储
- 按月分区便于数据管理和归档
- 支持热冷数据分离

**分片策略**：
- Shard Key：`projectId` 和 `createdAt` 的复合键
- 分片数：初始 4 个，后期可扩展
- 数据生命周期：永久保存，按年归档到冷存储

### 存储容量规划

```
假设场景：
- 100 个项目
- 平均每个项目每天 1000 条 BUG
- 平均 BUG 记录 2KB

计算：
100 × 1000 × 2KB = 200MB/天
200MB/天 × 365天 = 73GB/年
10年 = 730GB

建议：
- M50 集群起步（最大 2TB）
- 预留 50% 扩展空间
- 建立年度归档策略
```

## 4. 高可用架构设计

### 决策：MongoDB 副本集 + API 服务集群

**架构图**：

```
┌─────────────────────────────────────────┐
│      Client Applications (SDKs)         │
└─────────────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼──┐  ┌────▼──┐  ┌───▼────┐
    │ API-1 │  │ API-2 │  │ API-3  │
    │(Node) │  │(Node) │  │ (Node) │
    └────┬──┘  └────┬──┘  └───┬────┘
         │          │         │
    ┌────▼──────────▼─────────▼────┐
    │    Redis Cache Layer          │
    │  (Rate Limiting + Cache)      │
    └────┬───────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  MongoDB Replica Set (3 nodes)│
    │  ┌────────────────────────────┤
    │  │ Primary (Writes)           │
    │  ├────────────────────────────┤
    │  │ Secondary 1 (Reads)        │
    │  ├────────────────────────────┤
    │  │ Secondary 2 (Backup)       │
    │  └────────────────────────────┘
    └───────────────────────────────┘
```

**故障转移**：
- MongoDB 自动故障转移（< 30 秒）
- API 服务无状态，可直接替换
- 健康检查间隔 10 秒
- 自动重连机制

## 5. 客户端 SDK 集成方案

### 支持的集成方式

**自动捕获（推荐）**：
```javascript
const BugerClient = require('buger-client');
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  endpoint: 'https://buger.example.com'
});

// 自动捕获未处理异常
process.on('uncaughtException', (error) => {
  buger.report(error);
});
```

**手动上报**：
```javascript
buger.report({
  title: '用户登录失败',
  category: '认证',
  severity: 'high',
  context: { userId: 123 }
});
```

**离线缓存**：
- 网络断开时缓存 BUG 报告
- 最多缓存 1000 条
- 恢复后自动重试
- 支持批量上报

## 6. 性能优化关键点

### 缓存策略

| 对象 | TTL | 命中率目标 | 影响 |
|------|-----|---------|------|
| 搜索结果 | 5分钟 | 40-60% | 10-20x 加速 |
| 项目配置 | 1小时 | 70-80% | 减少数据库查询 |
| 热点 BUG | 15分钟 | 30-50% | 热点保护 |

### 数据库优化

1. **复合索引**：
   - (projectId, createdAt)：项目查询
   - (severity, status)：统计查询
   - (errorCode)：错误代码查询

2. **批量操作**：
   - 批量提交最多 20 个 BUG
   - 使用 bulkWrite 优化性能
   - 预期性能提升 5-10 倍

3. **连接池**：
   - 最小连接数：10
   - 最大连接数：100
   - 连接超时：30 秒

## 7. 环境变量配置

详见 `plan.md` 的 `.env` 部分。

**关键配置**：
```bash
MONGODB_URI=mongodb://mongo:c790414J@192.168.123.104:27017/buger
MONGODB_DATABASE=buger
RATE_LIMIT_MAX_REQUESTS=200
BATCH_SIZE_LIMIT=20
ENABLE_ATLAS_SEARCH=true
CACHE_TTL_SEARCH=300
```

## 下一阶段（Phase 1 设计）

1. ✅ **已完成**：技术研究和决策
2. 🔄 **进行中**：数据模型设计 (data-model.md)
3. ⏳ **待做**：API 契约定义 (contracts/openapi.yaml)
4. ⏳ **待做**：快速开始指南 (quickstart.md)

## 参考资源

- [MongoDB Atlas Search 官方文档](https://www.mongodb.com/docs/atlas/atlas-search/)
- [Redis Rate Limiting 最佳实践](https://redis.io/commands/rl/)
- [Node.js Express 性能优化](https://expressjs.com/en/advanced/best-practice-performance.html)