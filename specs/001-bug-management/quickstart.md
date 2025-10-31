# 快速开始指南：BUG 管理知识库系统

**文档版本**: 1.0.0 | **最后更新**: 2025-10-27

## 概述

本指南帮助开发者快速集成 BUGer 客户端 SDK 到他们的项目中，实现自动 BUG 上报、搜索和解决方案查询功能。

---

## 第一步：获取 API Key

### 1. 注册项目

向 BUGer 管理员提交项目信息：
- 项目名称
- 团队名称
- 项目描述
- 预期 BUG 上报量/月

### 2. 接收 API Key

管理员会为您的项目生成唯一的 API Key。示例：

```
API Key: proj_abc123def456ghi789jkl012
Endpoint: https://buger.example.com
```

---

## 第二步：安装客户端 SDK

### Node.js / JavaScript

```bash
npm install buger-client
```

或使用 yarn：

```bash
yarn add buger-client
```

### Python（后续支持）

```bash
pip install buger-client
```

---

## 第三步：基础配置（5 分钟）

### Node.js 示例

#### 方法 1：自动异常捕获（推荐）

```javascript
const BugerClient = require('buger-client');

// 初始化客户端
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  endpoint: 'https://buger.example.com',
  environment: {
    os: 'Linux',
    runtime: 'Node.js',
    runtimeVersion: process.version,
    appVersion: '1.0.0'
  }
});

// 自动捕获未处理的异常
process.on('uncaughtException', (error) => {
  buger.report({
    title: error.message,
    errorCode: error.code || 'UNCAUGHT_EXCEPTION',
    errorType: error.constructor.name,
    stackTrace: error.stack,
    severity: 'critical'
  });

  // 记录日志并优雅关闭
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// 自动捕获 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  buger.report({
    title: '未处理的 Promise rejection',
    errorCode: 'UNHANDLED_REJECTION',
    description: String(reason),
    severity: 'high'
  });

  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('✅ BUGer 客户端已初始化');
```

#### 方法 2：手动上报

```javascript
// 在您的代码中手动上报 BUG
try {
  // 您的代码
  const result = await database.query(sql);
} catch (error) {
  buger.report({
    title: '数据库查询失败',
    description: `执行 SQL 查询时出错: ${sql}`,
    errorCode: error.code,
    errorMessage: error.message,
    stackTrace: error.stack,
    severity: 'high',
    context: {
      userId: user.id,
      sessionId: req.sessionId,
      query: sql
    },
    tags: ['database', 'query'],
    components: ['user-service', 'database']
  });

  // 继续处理错误
  throw error;
}
```

#### 方法 3：集成到 Express 中间件

```javascript
const express = require('express');
const app = express();

// BUGer 请求日志中间件
app.use((req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // 记录响应信息供 BUG 报告使用
    res.bugContext = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      userAgent: req.get('user-agent')
    };

    return originalJson.call(this, data);
  };

  next();
});

// 错误处理中间件
app.use((error, req, res, next) => {
  buger.report({
    title: `${req.method} ${req.path} 请求处理错误`,
    errorCode: error.code || 'EXPRESS_ERROR',
    errorMessage: error.message,
    stackTrace: error.stack,
    severity: error.statusCode >= 500 ? 'critical' : 'high',
    context: {
      method: req.method,
      path: req.path,
      statusCode: error.statusCode || 500,
      userAgent: req.get('user-agent')
    }
  });

  res.status(error.statusCode || 500).json({
    error: error.message
  });
});

app.listen(3000);
```

### Python 示例（预告）

```python
from buger_client import BugerClient

# 初始化客户端
buger = BugerClient(
    api_key=os.environ['BUGER_API_KEY'],
    endpoint='https://buger.example.com'
)

# 捕获异常
try:
    result = database.query(sql)
except Exception as e:
    buger.report({
        'title': 'Database query failed',
        'error_code': str(type(e).__name__),
        'error_message': str(e),
        'stack_trace': traceback.format_exc(),
        'severity': 'high'
    })
```

---

## 环境变量配置

### .env 文件

在项目根目录创建 `.env` 文件：

```bash
# BUGer 配置
BUGER_API_KEY=proj_abc123def456ghi789jkl012
BUGER_ENDPOINT=https://buger.example.com
BUGER_ENABLED=true

# 应用信息
APP_VERSION=1.0.0
NODE_ENV=production
```

### 从环境变量加载

```javascript
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  endpoint: process.env.BUGER_ENDPOINT,
  enabled: process.env.BUGER_ENABLED === 'true'
});
```

---

## SDK 配置选项

### 完整配置示例

```javascript
const buger = new BugerClient({
  // 必需
  apiKey: 'your-api-key',

  // 可选
  endpoint: 'https://buger.example.com',  // 默认为官方端点

  // 环境信息
  environment: {
    os: 'Linux',
    runtime: 'Node.js',
    runtimeVersion: '18.0.0',
    appVersion: '1.0.0',
    platform: 'server'
  },

  // 行为配置
  enabled: true,                          // 是否启用 BUG 上报
  autoCapture: true,                      // 自动捕获异常
  sampleRate: 1.0,                        // 采样率 (0-1)
  maxStackTraceLength: 5000,               // 最大堆栈跟踪长度

  // 性能配置
  batchSize: 10,                          // 批量上报大小
  flushInterval: 30000,                   // 刷新间隔（毫秒）
  timeout: 5000,                          // 请求超时

  // 缓存配置
  enableCache: true,                      // 启用本地缓存
  maxCacheSize: 1000,                     // 最大缓存数量

  // 日志配置
  debug: false,                           // 调试模式
  logger: console                         // 自定义日志对象
});
```

---

## 常见集成场景

### 场景 1：Web 应用（Express + MongoDB）

```javascript
const express = require('express');
const mongoose = require('mongoose');
const BugerClient = require('buger-client');

const app = express();
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY
});

// 数据库连接错误
mongoose.connection.on('error', (error) => {
  buger.report({
    title: '数据库连接失败',
    errorCode: 'DB_CONNECTION_ERROR',
    errorMessage: error.message,
    severity: 'critical',
    context: {
      uri: process.env.MONGODB_URI
    }
  });
});

// 应用路由
app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (error) {
    buger.report({
      title: '创建用户失败',
      errorCode: error.code,
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: 'high',
      context: {
        userId: req.user?.id,
        endpoint: '/users'
      }
    });

    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### 场景 2：批量数据处理

```javascript
// 处理大量数据时，批量提交 BUG
const errors = [];

for (const item of items) {
  try {
    processItem(item);
  } catch (error) {
    errors.push({
      title: `处理项目 ${item.id} 失败`,
      errorCode: error.code,
      errorMessage: error.message,
      severity: 'medium',
      context: { itemId: item.id }
    });
  }
}

// 批量上报（最多 20 个）
if (errors.length > 0) {
  const batch = errors.slice(0, 20);
  await buger.reportBatch(batch);
}
```

### 场景 3：离线缓存和重试

```javascript
// SDK 自动处理离线缓存
// - 网络断开时，BUG 会被缓存到本地
// - 恢复连接后自动重试
// - 最多缓存 1000 条

const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  enableCache: true,
  maxCacheSize: 1000
});

// 获取缓存状态
const stats = buger.getCacheStats();
console.log(`缓存 BUG 数: ${stats.cachedCount}`);
console.log(`待上报: ${stats.pendingCount}`);

// 监听缓存事件
buger.on('cache:overflow', () => {
  console.warn('缓存已满，较早的 BUG 可能被丢弃');
});

buger.on('sync:success', (count) => {
  console.log(`成功同步 ${count} 条缓存的 BUG`);
});
```

---

## BUG 搜索和查询

### 在应用中搜索 BUG

```javascript
// 搜索相似问题
const results = await buger.search({
  q: 'database connection timeout',
  severity: ['high', 'critical'],
  projectId: 'my-project',
  pageSize: 20
});

console.log(`找到 ${results.total} 条相关 BUG`);
results.results.forEach(bug => {
  console.log(`- ${bug.title} (${bug.severity})`);
  if (bug.hasSolution) {
    console.log(`  ✅ 有解决方案`);
  }
});
```

### 获取单个 BUG 详情和解决方案

```javascript
const bugDetail = await buger.getBug(bugId);

if (bugDetail.hasSolution) {
  console.log('解决方案：', bugDetail.solution);
  bugDetail.solution.steps.forEach(step => {
    console.log(`${step.order}. ${step.title}`);
    console.log(`   ${step.description}`);
  });
}
```

---

## 错误处理和重试

### 处理 API 错误

```javascript
try {
  await buger.report(bugInfo);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.warn('超过速率限制，3 秒后重试...');
    setTimeout(() => buger.report(bugInfo), 3000);
  } else if (error.code === 'INVALID_API_KEY') {
    console.error('API Key 无效，请检查配置');
  } else if (error.code === 'VALIDATION_ERROR') {
    console.error('请求参数验证失败:', error.details);
  }
}
```

### 健康检查

```javascript
// 定期检查连接状态
setInterval(async () => {
  const isHealthy = await buger.healthCheck();
  if (!isHealthy) {
    console.error('BUGer 服务不可用');
    // 采取备用措施
  }
}, 60000);
```

---

## 最佳实践

### ✅ 推荐做法

1. **使用有意义的 BUG 标题**
   ```javascript
   // ✅ 好
   buger.report({
     title: '用户登录时数据库连接超时',
     errorCode: 'DB_TIMEOUT'
   });

   // ❌ 不好
   buger.report({
     title: 'Error',
     errorCode: 'ERR'
   });
   ```

2. **分类和标签**
   ```javascript
   buger.report({
     title: '...',
     category: '数据库',
     tags: ['数据库', '性能', '高并发'],
     components: ['user-service', 'authentication']
   });
   ```

3. **包含足够的上下文**
   ```javascript
   buger.report({
     title: '...',
     context: {
       userId: user.id,
       sessionId: req.sessionId,
       customerId: customer.id,
      operationName: 'checkout'
     }
   });
   ```

4. **使用批量上报优化性能**
   ```javascript
   // ✅ 好 - 批量上报
   await buger.reportBatch([bug1, bug2, bug3]);

   // ❌ 不好 - 逐个上报
   await buger.report(bug1);
   await buger.report(bug2);
   await buger.report(bug3);
   ```

5. **设置合理的采样率**
   ```javascript
   const buger = new BugerClient({
     apiKey: process.env.BUGER_API_KEY,
     sampleRate: 0.1  // 生产环境采样 10%，减少流量
   });
   ```

### ❌ 避免的做法

1. **不要在循环中逐个上报大量 BUG**
2. **不要包含敏感信息（密码、API Key、个人隐私数据）**
3. **不要上报过大的堆栈跟踪（> 1MB）**
4. **不要在同步代码中等待上报完成**
5. **不要硬编码 API Key**

---

## 故障排查

### 问题 1：BUG 未被上报

**检查清单**：
- [ ] API Key 是否正确配置
- [ ] BUGER_ENABLED 是否为 true
- [ ] 网络连接是否正常
- [ ] 检查 SDK 日志 (`debug: true`)

```javascript
const buger = new BugerClient({
  apiKey: process.env.BUGER_API_KEY,
  debug: true  // 启用调试日志
});

// 查看日志输出
```

### 问题 2：速率限制错误

**原因**：超过每分钟 200 次请求的限制

**解决方案**：
```javascript
// 1. 降低采样率
sampleRate: 0.5  // 只上报 50% 的 BUG

// 2. 增加批量大小
batchSize: 20

// 3. 增加刷新间隔
flushInterval: 60000  // 60 秒后批量提交
```

### 问题 3：API Key 验证失败

```javascript
// 验证 API Key 格式
const isValid = /^proj_[a-z0-9]{30,}$/.test(apiKey);

// 重新生成 API Key
// 联系管理员获取新的 API Key
```

---

## 下一步

1. **[查看 OpenAPI 文档](./contracts/openapi.yaml)**：了解所有可用的 API 端点
2. **[查看数据模型](./data-model.md)**：理解数据结构
3. **[查看完整示例](https://github.com/buger-team/buger-client-examples)**
4. **[联系支持](mailto:support@buger.example.com)**

---

## 支持和反馈

- 📧 Email: support@buger.example.com
- 💬 Discord: [BUGer Community](https://discord.gg/buger)
- 📝 Issues: [GitHub Issues](https://github.com/buger-team/buger-client/issues)

---

## 许可证

MIT License - 详见 LICENSE 文件