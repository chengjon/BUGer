# 本地开发环境数据库服务启动成功

## 服务状态

我们已经成功启动了本地开发环境所需的数据库服务：

1. **MongoDB 服务**：
   - 容器名称：buger-mongodb
   - 镜像：mongo:latest
   - 端口映射：27017:27017
   - 管理员用户：mongo
   - 密码：c790414J
   - 数据库：buger_test

2. **Redis 服务**：
   - 容器名称：buger-redis
   - 镜像：redis:6-alpine
   - 端口映射：6380:6379（避免与现有 Redis 实例冲突）
   - 无密码保护（本地开发环境）

## 下一步操作

现在数据库服务已经正常运行，我们需要更新环境配置并运行测试。

### 1. 更新环境配置

我们需要修改 `.env` 文件以使用本地数据库服务：

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://mongo:c790414J@localhost:27017/buger_test?authSource=admin
MONGODB_DATABASE=buger_test

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=
REDIS_DB=1
```

### 2. 运行测试

在更新环境配置后，我们可以运行测试脚本：

```bash
cd /opt/iflow/buger/backend
./run-tests-local.sh
```

## 服务管理命令

### 停止服务
```bash
docker stop buger-mongodb buger-redis
```

### 查看服务日志
```bash
docker logs buger-mongodb
docker logs buger-redis
```

### 重启服务
```bash
docker restart buger-mongodb buger-redis
```

## 注意事项

1. 这些服务是临时的，容器停止后数据将丢失
2. 如果需要持久化数据，可以添加卷映射
3. 在生产环境中，请务必设置密码保护和访问控制

现在我们可以继续进行测试流程了。