# BUGer 项目设置和测试指南

本指南将帮助您一步步设置 BUGer 项目的运行环境并完成测试。

## 问题诊断

从之前的尝试可以看出，项目启动遇到了以下问题：

1. Docker 命令执行超时，可能是因为系统资源不足或 Docker 服务响应缓慢
2. MongoDB 和 Redis 服务未正常启动
3. 环境变量配置可能存在问题
4. 依赖包可能需要重新安装

## 解决方案

我们将采用分步方式进行设置和测试：

### 第一步：验证和安装依赖

1. 确保 Node.js 版本 >= 18.0.0：
   ```bash
   node --version
   npm --version
   ```

2. 重新安装所有依赖：
   ```bash
   cd /opt/iflow/buger/backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### 第二步：手动启动数据库服务

由于 Docker Compose 启动存在问题，我们将分别启动数据库服务：

1. 启动 MongoDB：
   ```bash
   docker run --rm -d --name buger-mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     -e MONGO_INITDB_DATABASE=buger \
     mongo:latest
   ```

2. 启动 Redis：
   ```bash
   docker run --rm -d --name buger-redis \
     -p 6379:6379 \
     redis:6-alpine redis-server --requirepass password
   ```

### 第三步：验证数据库连接

1. 检查容器是否正常运行：
   ```bash
   docker ps
   ```

2. 使用 MongoDB 客户端连接测试：
   ```bash
   # 如果系统没有安装 mongosh，可以使用以下命令进入容器内部测试
   docker exec -it buger-mongodb mongosh admin -u admin -p password
   ```

3. 使用 Redis 客户端连接测试：
   ```bash
   # 进入 Redis 容器测试
   docker exec -it buger-redis redis-cli -a password ping
   ```

### 第四步：配置环境变量

确保 `.env` 文件配置正确：
```bash
# Environment Configuration for BUGer API
NODE_ENV=development
PORT=3050

# MongoDB Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/buger?authSource=admin
MONGODB_DATABASE=buger

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password
REDIS_DB=1

# Application Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### 第五步：初始化数据库

运行数据库初始化脚本：
```bash
cd /opt/iflow/buger/backend
npm run db:init
```

### 第六步：启动应用服务

```bash
cd /opt/iflow/buger/backend
npm start
```

### 第七步：运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration
```

## 故障排除

如果在上述步骤中遇到问题，请参考以下解决方案：

1. **Docker 启动失败**：
   - 检查系统资源是否充足
   - 重启 Docker 服务
   - 使用 `docker system prune` 清理无用资源

2. **数据库连接失败**：
   - 检查防火墙设置
   - 确认端口未被占用
   - 验证用户名和密码

3. **应用启动失败**：
   - 检查日志输出，定位具体错误
   - 确认所有环境变量已正确设置
   - 验证数据库和 Redis 服务是否正常运行

4. **测试失败**：
   - 确保应用服务已正常启动
   - 检查测试环境配置
   - 查看测试日志，定位失败原因

## 验证部署

当服务正常启动后，可以通过以下方式验证：

1. 访问健康检查端点：
   ```bash
   curl http://localhost:3050/health
   ```

2. 查看 API 信息：
   ```bash
   curl http://localhost:3050/api
   ```

3. 运行集成测试验证功能：
   ```bash
   npm run test:integration
   ```

按照以上步骤操作，应该能够成功设置并运行 BUGer 项目。如果在任何步骤遇到问题，请提供具体的错误信息以便进一步诊断。