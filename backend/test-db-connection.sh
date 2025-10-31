#!/bin/bash

# 测试数据库连接脚本 (修正版)
# 使用您提供的数据库配置进行连接测试

set -e

# 配置变量
MONGODB_HOST="localhost"
MONGODB_PORT=27017
MONGODB_USERNAME="mongo"
MONGODB_PASSWORD="c790414J"
MONGODB_AUTH_SOURCE="admin"

REDIS_HOST="localhost"
REDIS_PORT=6380
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

print_info "开始测试数据库连接..."

# 1. 测试 MongoDB 网络连通性
print_info "正在测试 MongoDB 网络连通性..."
if nc -z ${MONGODB_HOST} ${MONGODB_PORT} > /dev/null 2>&1; then
    print_info "✓ MongoDB 网络连通性正常"
else
    print_error "✗ MongoDB 网络连通性异常"
    exit 1
fi

# 2. 测试 Redis 网络连通性
print_info "正在测试 Redis 网络连通性..."
if nc -z ${REDIS_HOST} ${REDIS_PORT} > /dev/null 2>&1; then
    print_info "✓ Redis 网络连通性正常"
else
    print_error "✗ Redis 网络连通性异常"
    exit 1
fi

print_info "数据库连接测试完成！"
print_info "测试结果："
print_info "  ✓ MongoDB 网络连通性: 正常"
print_info "  ✓ Redis 网络连通性: 正常"
print_info ""
print_info "注意：由于缺少 mongosh 和 redis-cli 客户端工具，无法进行更详细的数据库连接测试。"
print_info "但从端口连通性来看，MongoDB 和 Redis 服务应该是可访问的。"