# 本地开发环境数据库服务启动说明

## 问题概述

在尝试使用 Docker Compose 启动本地数据库服务时，我们遇到了以下问题：

1. **网络连接问题**：无法从 Docker Hub 拉取镜像（超时错误）
2. **端口冲突**：Redis 默认端口 6379 已被占用
3. **MongoDB 兼容性**：MongoDB 5.0+ 需要支持 AVX 指令集的 CPU，但您的 NAS 不支持

## 解决方案

### 1. 使用本地已有镜像

我们已经修改了 `docker-compose-local.yml` 配置文件以适应本地环境：

- 使用 `mongo:4.4` 镜像（兼容不支持 AVX 的 CPU）
- 将 Redis 端口从 6379 改为 6380 以避免端口冲突
- 移除了密码保护以简化本地开发

### 2. 网络连接问题解决建议

由于无法从 Docker Hub 拉取镜像，建议您：

1. **检查网络连接**：
   - 确认可以访问互联网
   - 检查防火墙设置是否阻止了 Docker 的网络访问

2. **配置 Docker 镜像加速器**：
   - 如果您在中国大陆，建议配置 Docker 镜像加速器
   - 可以使用阿里云、腾讯云等提供的镜像加速服务

3. **手动拉取镜像**：
   - 在网络连接正常时，手动拉取所需的镜像：
     ```bash
     docker pull mongo:4.4
     docker pull redis:6-alpine
     ```

### 3. 启动服务的替代方法

如果 Docker Compose 仍然无法正常工作，您可以尝试直接使用 Docker 命令启动容器：

```bash
# 启动 MongoDB
docker run --rm -d --name buger-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=mongo \
  -e MONGO_INITDB_ROOT_PASSWORD=c790414J \
  -e MONGO_INITDB_DATABASE=buger_test \
  mongo:4.4

# 启动 Redis
docker run --rm -d --name buger-redis \
  -p 6380:6379 \
  redis:6-alpine
```

## 下一步操作

1. 解决网络连接问题或配置镜像加速器
2. 启动数据库服务（使用 Docker Compose 或直接 Docker 命令）
3. 验证数据库连接
4. 运行测试脚本

## 配置文件更新

我们已经更新了以下配置文件以适应本地开发环境：

1. `docker-compose-local.yml`：本地数据库服务配置
2. `.env`：环境变量配置（需要更新以匹配新的数据库配置）

一旦数据库服务成功启动，我们就可以继续运行自动化测试流程。