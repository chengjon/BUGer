#!/bin/bash

# 本地测试执行脚本
# 用于手动执行 BUGer API 的测试流程

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "开始执行本地测试流程..."

# 1. 启动数据库容器
print_info "正在启动数据库容器..."
cd /opt/iflow/buger/backend

# 停止并删除已有的容器
if docker ps -a --format '{{.Names}}' | grep -q buger-mongodb; then
    print_info "停止并删除已有的 MongoDB 容器..."
    docker stop buger-mongodb > /dev/null 2>&1 || true
    docker rm buger-mongodb > /dev/null 2>&1 || true
fi

if docker ps -a --format '{{.Names}}' | grep -q buger-redis; then
    print_info "停止并删除已有的 Redis 容器..."
    docker stop buger-redis > /dev/null 2>&1 || true
    docker rm buger-redis > /dev/null 2>&1 || true
fi

# 启动 MongoDB 容器
if docker run --rm -d --name buger-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=mongo \
  -e MONGO_INITDB_ROOT_PASSWORD=c790414J \
  -e MONGO_INITDB_DATABASE=buger_test \
  mongo:latest > /dev/null 2>&1; then
    print_info "✓ MongoDB 容器启动成功"
    sleep 15
else
    print_error "✗ MongoDB 容器启动失败"
    exit 1
fi

# 启动 Redis 容器
if docker run --rm -d --name buger-redis \
  -p 6380:6379 \
  redis:6-alpine > /dev/null 2>&1; then
    print_info "✓ Redis 容器启动成功"
    sleep 5
else
    print_error "✗ Redis 容器启动失败"
    docker stop buger-mongodb > /dev/null 2>&1 || true
    exit 1
fi

# 清理函数
cleanup() {
    print_info "正在清理资源..."
    docker stop buger-mongodb buger-redis > /dev/null 2>&1 || true
}
trap cleanup EXIT

# 2. 验证数据库连接
print_info "正在验证数据库连接..."

# 检查 MongoDB 连接
if mongosh "mongodb://mongo:c790414J@localhost:27017/admin?authSource=admin" --eval "db.runCommand({ connectionStatus: 1 })" > /dev/null 2>&1; then
    print_info "✓ MongoDB 连接成功"
else
    print_error "✗ MongoDB 连接失败"
    exit 1
fi

# 检查 Redis 连接
if redis-cli -h localhost -p 6380 ping > /dev/null 2>&1; then
    print_info "✓ Redis 连接成功"
else
    print_error "✗ Redis 连接失败"
    exit 1
fi

# 3. 初始化数据库
print_info "正在初始化数据库..."
if MONGODB_URI="mongodb://mongo:c790414J@localhost:27017/buger_test?authSource=admin" node scripts/init-db.js; then
    print_info "✓ 数据库初始化成功"
else
    print_error "✗ 数据库初始化失败"
    exit 1
fi

# 4. 运行集成测试
print_info "正在运行集成测试..."
if npm run test:integration; then
    print_info "✓ 集成测试执行成功"
else
    print_error "✗ 集成测试执行失败"
    exit 1
fi

# 5. 生成测试覆盖率报告
print_info "正在生成测试覆盖率报告..."
if npm test -- --coverage; then
    print_info "✓ 测试覆盖率报告生成成功"
else
    print_error "✗ 测试覆盖率报告生成失败"
    exit 1
fi

print_info "========================================="
print_info "本地测试流程执行完成！"
print_info "========================================="
print_info "执行摘要："
print_info "  ✓ 数据库容器启动"
print_info "  ✓ 数据库连接验证"
print_info "  ✓ 数据库初始化"
print_info "  ✓ 集成测试执行"
print_info "  ✓ 覆盖率报告生成"
echo ""
print_info "测试结果已生成在以下位置："
print_info "  - 测试结果: 终端输出"
print_info "  - 覆盖率报告: /opt/iflow/buger/backend/coverage/index.html"