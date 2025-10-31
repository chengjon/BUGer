# 测试说明

由于系统环境限制，无法直接运行集成测试，但我们已经完成了以下准备工作：

1. 修复了所有测试文件的模块导入语法，从 ES6 `import` 语法改为 CommonJS `require` 语法
2. 更新了 Jest 配置文件以支持 ES6 模块转换
3. 安装了必要的 Babel 依赖
4. 增加了测试超时时间
5. 创建了 `babel.config.cjs` 配置文件

## 集成测试运行步骤

要在支持 Docker 的环境中运行集成测试，请按以下步骤操作：

1. 启动 MongoDB 和 Redis 服务：
   ```bash
   # 启动 MongoDB
   docker run --rm -d --name buger-mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     -e MONGO_INITDB_DATABASE=buger \
     mongo:latest

   # 启动 Redis
   docker run --rm -d --name buger-redis \
     -p 6379:6379 \
     redis:6-alpine redis-server --requirepass password
   ```

2. 初始化数据库：
   ```bash
   cd /opt/iflow/buger/backend
   npm run db:init
   ```

3. 运行集成测试：
   ```bash
   cd /opt/iflow/buger/backend
   npm run test:integration
   ```

## 单元测试

由于单元测试目录 `/opt/iflow/buger/backend/tests/unit` 下没有测试文件，无法运行单元测试。

## 代码覆盖率

当集成测试可以正常运行时，可以通过以下命令生成覆盖率报告：
```bash
npm run test -- --coverage
```

或者专门运行集成测试并生成覆盖率报告：
```bash
npm run test:integration -- --coverage
```

## 总结

我们已经完成了所有必要的代码修改和配置更新，使测试套件能够在适当的环境中运行。由于当前环境的限制（Docker 命令超时），无法直接启动所需的数据库服务来运行集成测试，但所有代码层面的准备工作已经完成。