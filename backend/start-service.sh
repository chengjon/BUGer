#!/bin/bash

# 启动应用服务脚本
# 用于启动 BUGer API 服务

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

print_info "正在启动 BUGer API 服务..."

# 检查 Node.js 版本
print_info "检查 Node.js 版本..."
NODE_VERSION=$(node --version)
print_info "Node.js 版本: ${NODE_VERSION}"

# 检查 npm 版本
print_info "检查 npm 版本..."
NPM_VERSION=$(npm --version)
print_info "npm 版本: ${NPM_VERSION}"

# 检查环境变量
print_info "检查环境变量..."
if [ -f ".env" ]; then
    print_info "找到 .env 文件"
else
    print_warning "未找到 .env 文件，将使用默认配置"
fi

# 检查依赖
print_info "检查项目依赖..."
if [ -d "node_modules" ]; then
    print_info "依赖已安装"
else
    print_warning "依赖未安装，正在安装..."
    npm install
fi

# 启动服务
print_info "启动服务..."
node src/index.js