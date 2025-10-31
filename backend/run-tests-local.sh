#!/bin/bash

# 自动化测试脚本 (本地开发环境版本)
# 用于执行 BUGer API 的完整测试流程

set -e  # 遇到错误时退出

# 配置变量 (使用本地 Docker 环境)
WORKING_DIR="/opt/iflow/buger/backend"
MONGODB_HOST="localhost"
MONGODB_PORT=27017
MONGODB_USERNAME="mongo"
MONGODB_PASSWORD="c790414J"
MONGODB_DATABASE="buger"
MONGODB_AUTH_SOURCE="admin"

REDIS_HOST="localhost"
REDIS_PORT=6380
REDIS_PASSWORD=""
REDIS_DATABASE=1

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

# 启动本地 MongoDB 容器
print_info "正在启动本地 MongoDB 容器..."
docker run --rm -d --name buger-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=${MONGODB_USERNAME} \
  -e MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD} \
  -e MONGO_INITDB_DATABASE=${MONGODB_DATABASE} \
  mongo:latest > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_info "✓ MongoDB 容器启动成功"
    # 等待 MongoDB 启动
    sleep 10
else
    print_error "✗ MongoDB 容器启动失败"
    exit 1
fi

# 清理函数
cleanup() {
    print_info "正在清理资源..."
    docker stop buger-mongodb > /dev/null 2>&1 || true
}
trap cleanup EXIT

# 1. 验证数据库连接
print_info "正在验证数据库连接..."

# 检查 MongoDB 连接
print_info "正在测试 MongoDB 连接..."
if command -v mongosh &> /dev/null; then
    mongosh "mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/admin?authSource=${MONGODB_AUTH_SOURCE}" --eval "db.runCommand({ connectionStatus: 1 })" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_info "✓ MongoDB 连接成功"
    else
        print_error "✗ MongoDB 连接失败"
        exit 1
    fi
else
    print_warning "mongosh 命令未找到，跳过 MongoDB 连接测试"
fi

# 检查 Redis 连接
print_info "正在测试 Redis 连接..."
if command -v redis-cli &> /dev/null; then
    if [ -z "${REDIS_PASSWORD}" ]; then
        redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -n ${REDIS_DATABASE} ping > /dev/null 2>&1
    else
        redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD} -n ${REDIS_DATABASE} ping > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_info "✓ Redis 连接成功"
    else
        print_error "✗ Redis 连接失败"
        exit 1
    fi
else
    print_warning "redis-cli 命令未找到，跳过 Redis 连接测试"
fi

# 2. 更新环境配置
print_info "正在更新环境配置..."
cd ${WORKING_DIR}

# 备份原始 .env 文件
if [ -f ".env" ]; then
    BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env ${BACKUP_NAME}
    print_info "✓ 原始 .env 文件已备份为 ${BACKUP_NAME}"
else
    print_warning "原始 .env 文件不存在，将创建新的配置文件"
fi

# 创建新的 .env 文件
cat > .env << EOF
# Environment Configuration for BUGer API
NODE_ENV=development
PORT=3050

# MongoDB Configuration
MONGODB_URI=mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=${MONGODB_AUTH_SOURCE}
MONGODB_DATABASE=${MONGODB_DATABASE}

# Redis Configuration
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=${REDIS_DATABASE}

# Application Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug

# API Configuration
API_KEY_PREFIX=sk_

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200

# Cache Configuration
CACHE_TTL_SEARCH=300
CACHE_TTL_PROJECT=3600

# Security
BCRYPT_ROUNDS=10
EOF
print_info "✓ 新的 .env 文件已创建"

# 3. 安装项目依赖
print_info "正在检查并安装项目依赖..."
if [ ! -d "node_modules" ]; then
    print_info "正在安装项目依赖..."
    npm install
    if [ $? -eq 0 ]; then
        print_info "✓ 依赖安装成功"
    else
        print_error "✗ 依赖安装失败"
        exit 1
    fi
else
    print_info "✓ 依赖已存在，跳过安装"
fi

# 4. 初始化数据库
print_info "正在初始化数据库..."
npm run db:init
if [ $? -eq 0 ]; then
    print_info "✓ 数据库初始化成功"
else
    print_error "✗ 数据库初始化失败"
    exit 1
fi

# 5. 执行集成测试
print_info "正在运行集成测试..."
npm run test:integration
if [ $? -eq 0 ]; then
    print_info "✓ 集成测试执行成功"
else
    print_error "✗ 集成测试执行失败"
    exit 1
fi

# 6. 生成测试覆盖率报告
print_info "正在生成测试覆盖率报告..."
npm test -- --coverage
if [ $? -eq 0 ]; then
    print_info "✓ 测试覆盖率报告生成成功"
    print_info "报告位置: ${WORKING_DIR}/coverage/"
else
    print_error "✗ 测试覆盖率报告生成失败"
    exit 1
fi

# 7. 清理说明
print_info "清理测试数据说明："
echo "1. 测试数据存储在 ${MONGODB_DATABASE} 数据库中"
echo "2. 测试完成后，MongoDB 容器将自动停止"
echo "3. 如需清理 Redis 数据，请手动执行相关操作"
echo "4. 测试完成后，可以恢复原始 .env 文件："
echo "   cp .env.backup.* .env (选择最新的备份文件)"

print_info "========================================="
print_info "自动化测试工作流执行完成！"
print_info "========================================="
print_info "执行摘要："
print_info "  ✓ MongoDB 容器启动"
print_info "  ✓ 数据库连接验证"
print_info "  ✓ 环境配置更新"
print_info "  ✓ 依赖安装"
print_info "  ✓ 数据库初始化"
print_info "  ✓ 集成测试执行"
print_info "  ✓ 覆盖率报告生成"
echo ""
print_info "请查看以下输出以获取详细结果："
print_info "  - 测试结果: 终端输出"
print_info "  - 覆盖率报告: ${WORKING_DIR}/coverage/index.html"
echo ""
print_info "如需恢复原始配置，请执行："
print_info "  cp ${WORKING_DIR}/.env.backup.* ${WORKING_DIR}/.env"