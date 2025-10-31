# BUGer 数据库维护指南

**文档版本**: 1.0
**更新时间**: 2025-10-31
**适用版本**: BUGer v1.0+

---

## 📋 目录

- [健康检查工具](#健康检查工具)
- [索引管理](#索引管理)
- [数据去重与合并](#数据去重与合并)
- [数据归档](#数据归档)
- [定期维护建议](#定期维护建议)

---

## 健康检查工具

### 功能概述

`db-health-check.js` 是一个综合的数据库健康检查工具，提供以下功能：

1. **重复数据检测** - 识别完全重复的BUG记录
2. **数据完整性检查** - 验证必填字段和数据格式
3. **合并建议分析** - 识别可合并的相似BUG
4. **数据库统计** - 提供详细的数据分析
5. **索引健康检查** - 验证索引配置
6. **归档建议** - 分析可归档的历史数据

### 使用方法

#### 基础检查（只读模式）

```bash
cd /opt/iflow/buger/backend
node scripts/db-health-check.js
```

**输出示例**:
```
🏥 BUGer 数据库健康检查开始...

🔍 1. 检测重复数据...
   ✅ 未发现完全重复的BUG记录

🔍 2. 检查数据完整性...
   ✅ 数据完整性检查通过

📊 4. 数据库统计分析...
   总BUG数: 13
   总出现次数: 41
   平均出现次数: 3.15
```

#### 自动修复模式

自动修复检测到的数据完整性问题：

```bash
node scripts/db-health-check.js --fix
```

**会修复的问题**:
- ✅ 缺失的 `severity` 字段（设为默认值 'medium'）
- ✅ 无效的 `severity` 值（修正为 'medium'）
- ✅ 无效的 `status` 值（修正为 'open'）
- ✅ 缺失的 `occurrences` 字段（设为默认值 1）

#### 合并重复BUG

合并相同 `projectId` + `errorCode` 的多条记录：

```bash
node scripts/db-health-check.js --merge
```

**合并策略**:
- 保留最早创建的BUG记录
- 合并所有 `occurrences` 计数
- 删除其他重复记录
- 更新 `updatedAt` 时间戳

**示例**:
```
   合并 IMPORT_ERROR_001:
     保留: BUG-20251030-EA812A
     合并: BUG-20251030-EA812B, BUG-20251030-EA812C
     ✅ 已合并 2 条记录
```

#### 归档历史数据

归档90天前已解决的BUG：

```bash
node scripts/db-health-check.js --archive
```

**归档操作**:
- 将符合条件的BUG移动到 `bugs_archive` 集合
- 从主 `bugs` 集合删除
- 保留归档时间戳 `archivedAt`

**归档条件**:
- `status` = 'resolved'
- `updatedAt` < 90天前

#### 组合使用

可以同时执行多个操作：

```bash
# 检查 + 修复 + 合并
node scripts/db-health-check.js --fix --merge

# 完整维护（检查、修复、合并、归档）
node scripts/db-health-check.js --fix --merge --archive
```

---

## 索引管理

### 创建推荐索引

```bash
cd /opt/iflow/buger/backend
node scripts/create-indexes.js
```

### 推荐索引列表

| 索引名称 | 索引字段 | 用途 |
|---------|---------|------|
| `projectId_1_errorCode_1` | `{ projectId: 1, errorCode: 1 }` | 快速查找重复BUG |
| `context.project_name_1` | `{ 'context.project_name': 1 }` | 分层查询策略 |
| `context.component_1` | `{ 'context.component': 1 }` | 按组件查询 |
| `updatedAt_1` | `{ updatedAt: 1 }` | 归档查询 |
| `status_1_updatedAt_1` | `{ status: 1, updatedAt: 1 }` | 归档查询优化 |

### 查看现有索引

```bash
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.getIndexes().forEach(index => {
    print(index.name + ': ' + JSON.stringify(index.key));
  });
"
```

### 删除索引（如需要）

```bash
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.dropIndex('索引名称');
"
```

---

## 数据去重与合并

### 场景1: 完全重复的BUG

**问题**: 相同的BUG被多次提交，字段完全一致

**检测**:
```bash
node scripts/db-health-check.js
```

查看输出中的 "检测重复数据" 部分。

**解决方案**: 手动删除（工具暂不自动删除完全重复数据）

```javascript
// MongoDB Shell 示例
db.bugs.deleteOne({ bugId: 'BUG-DUPLICATE-ID' });
```

### 场景2: 相似BUG需要合并

**问题**: 相同 `projectId` + `errorCode` 但有多条记录

**自动合并**:
```bash
node scripts/db-health-check.js --merge
```

**手动合并** (如需精细控制):
```javascript
// 1. 查找需要合并的BUG
const bugs = db.bugs.find({
  projectId: 'mystocks',
  errorCode: 'IMPORT_ERROR_001'
}).toArray();

// 2. 保留主BUG，更新occurrences
db.bugs.updateOne(
  { bugId: bugs[0].bugId },
  {
    $inc: { occurrences: bugs[1].occurrences + bugs[2].occurrences },
    $set: { updatedAt: new Date() }
  }
);

// 3. 删除其他BUG
db.bugs.deleteMany({
  bugId: { $in: [bugs[1].bugId, bugs[2].bugId] }
});
```

---

## 数据归档

### 归档策略

**归档条件**:
- 状态为 `resolved`（已解决）
- 最后更新时间 > 90天前

**归档操作**:
```bash
node scripts/db-health-check.js --archive
```

### 手动归档

```javascript
// MongoDB Shell
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

// 复制到归档集合
db.bugs.find({
  status: 'resolved',
  updatedAt: { $lt: ninetyDaysAgo }
}).forEach(bug => {
  db.bugs_archive.insertOne({
    ...bug,
    archivedAt: new Date()
  });
});

// 从主集合删除
db.bugs.deleteMany({
  status: 'resolved',
  updatedAt: { $lt: ninetyDaysAgo }
});
```

### 恢复归档数据

```javascript
// 从归档集合恢复到主集合
db.bugs_archive.find({ bugId: 'BUG-ID' }).forEach(bug => {
  const { archivedAt, ...bugData } = bug; // 移除归档时间戳
  db.bugs.insertOne(bugData);
});

// 从归档集合删除
db.bugs_archive.deleteOne({ bugId: 'BUG-ID' });
```

---

## 定期维护建议

### 每日维护（自动化）

创建 cron 任务：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨2点执行）
0 2 * * * cd /opt/iflow/buger/backend && node scripts/db-health-check.js --fix >> /var/log/buger-health-check.log 2>&1
```

### 每周维护（手动）

**周一检查**:
```bash
# 1. 运行完整健康检查
node scripts/db-health-check.js

# 2. 查看报告，根据建议执行修复
node scripts/db-health-check.js --fix

# 3. 如发现需要合并的BUG，执行合并
node scripts/db-health-check.js --merge
```

### 每月维护（手动）

**月初归档**:
```bash
# 1. 检查归档候选
node scripts/db-health-check.js

# 2. 备份数据库（可选但推荐）
mongodump --uri="mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --out=/backup/buger-$(date +%Y%m%d)

# 3. 执行归档
node scripts/db-health-check.js --archive

# 4. 验证归档集合
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  print('主集合BUG数:', db.bugs.countDocuments());
  print('归档集合BUG数:', db.bugs_archive.countDocuments());
"
```

### 季度维护（手动）

**季度末优化**:
```bash
# 1. 完整健康检查
node scripts/db-health-check.js

# 2. 执行所有修复和优化
node scripts/db-health-check.js --fix --merge --archive

# 3. 重建索引（如性能下降）
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.reIndex();
"

# 4. 数据库统计分析
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.stats();
"
```

---

## 性能监控

### 查询性能分析

```javascript
// MongoDB Shell
// 查看慢查询
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty();

// 分析查询计划
db.bugs.find({ 'context.project_name': 'MyStocks' }).explain('executionStats');
```

### 集合统计

```bash
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  const stats = db.bugs.stats();
  print('集合大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  print('文档数:', stats.count);
  print('平均文档大小:', (stats.avgObjSize / 1024).toFixed(2), 'KB');
  print('索引数:', stats.nindexes);
  print('索引大小:', (stats.totalIndexSize / 1024 / 1024).toFixed(2), 'MB');
"
```

---

## 故障排查

### 问题1: 健康检查脚本运行失败

**可能原因**:
- MongoDB连接失败
- 权限不足

**解决方法**:
```bash
# 1. 检查MongoDB服务状态
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "db.serverStatus()"

# 2. 验证权限
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.runCommand({ connectionStatus: 1 })
"
```

### 问题2: 索引创建失败

**可能原因**:
- 磁盘空间不足
- 重复的索引名称

**解决方法**:
```bash
# 1. 检查磁盘空间
df -h

# 2. 查看现有索引
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.getIndexes()
"

# 3. 删除冲突的索引
mongosh "mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --quiet --eval "
  db.bugs.dropIndex('索引名称')
"
```

### 问题3: 归档操作过慢

**优化方法**:
```bash
# 1. 分批归档（修改脚本）
# 在 executeArchive() 方法中添加 limit

# 2. 后台执行
node scripts/db-health-check.js --archive &

# 3. 查看进度
tail -f /var/log/buger-health-check.log
```

---

## 最佳实践

### 1. 备份优先

**所有维护操作前都应备份数据**:
```bash
mongodump --uri="mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin" --out=/backup/buger-$(date +%Y%m%d)
```

### 2. 测试环境验证

在生产环境执行前，先在测试环境验证：
```bash
# 1. 复制生产数据到测试环境
mongorestore --uri="mongodb://test-mongo:27017/buger_test" /backup/buger-20251031

# 2. 在测试环境运行维护脚本
node scripts/db-health-check.js --fix --merge --archive

# 3. 验证结果
node scripts/db-health-check.js
```

### 3. 监控日志

设置日志记录：
```bash
# 创建日志目录
mkdir -p /var/log/buger

# 运行时记录日志
node scripts/db-health-check.js --fix 2>&1 | tee -a /var/log/buger/health-check-$(date +%Y%m%d).log
```

### 4. 性能敏感时段

避免在业务高峰期执行维护操作：
- ✅ 推荐: 凌晨2-4点（业务低峰）
- ❌ 避免: 工作日9-18点（业务高峰）

---

## 相关文档

- [BUG修复AI协作规范.md](./BUG修复AI协作规范.md) - BUG修复开发规范
- [CLIENT_INTEGRATION_GUIDE.md](./CLIENT_INTEGRATION_GUIDE.md) - 客户端集成指南
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - 开发者入职文档

---

## 技术支持

如有问题或需要帮助，请：
1. 查阅本文档的故障排查部分
2. 运行健康检查获取详细报告
3. 查看 MongoDB 日志：`tail -f /var/log/mongodb/mongod.log`

---

**文档维护**: Claude (AI Assistant)
**最后更新**: 2025-10-31
**版本**: 1.0
