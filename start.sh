#!/bin/bash

# BUGer 系统 - 快速启动脚本
# 用于快速启动开发或生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要的工具
check_tools() {
    print_info "检查依赖工具..."

    local tools=("node" "npm" "docker" "kubectl")
    local missing=0

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_warning "$tool 未安装"
            missing=1
        else
            local version=$($tool --version 2>&1 | head -1)
            print_success "$tool: $version"
        fi
    done

    if [ $missing -eq 1 ]; then
        print_warning "部分工具未安装，部分功能可能无法使用"
    fi
}

# 启动开发环境
start_dev() {
    print_info "启动开发环境..."

    cd backend

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        print_info "安装 npm 依赖..."
        npm install
    fi

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在，从示例文件创建..."
        cp .env.example .env
        print_info "请编辑 .env 文件配置必要的参数"
    fi

    # 启动 Docker Compose（数据库和缓存）
    print_info "启动 Docker 容器（MongoDB 和 Redis）..."
    docker-compose up -d

    # 等待容器就绪
    print_info "等待容器就绪..."
    sleep 5

    # 初始化数据库
    print_info "初始化数据库..."
    npm run db:init

    # 填充测试数据
    print_info "填充测试数据..."
    npm run db:seed

    # 启动应用
    print_success "启动应用服务器..."
    npm run dev
}

# 启动生产环境
start_prod() {
    print_info "启动生产环境..."

    cd backend

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        npm ci --only=production
    fi

    # 构建 Docker 镜像
    print_info "构建 Docker 镜像..."
    docker build -t buger:1.0.0 .

    # 应用 Kubernetes 配置
    print_info "应用 Kubernetes 配置..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/mongodb-secret.yaml
    kubectl apply -f k8s/redis-secret.yaml
    kubectl apply -f k8s/rbac.yaml
    kubectl apply -f k8s/mongodb-statefulset.yaml
    kubectl apply -f k8s/redis-deployment.yaml
    kubectl apply -f k8s/app-deployment.yaml
    kubectl apply -f k8s/app-service.yaml
    kubectl apply -f k8s/ingress.yaml
    kubectl apply -f k8s/prometheus-config.yaml
    kubectl apply -f k8s/prometheus-deployment.yaml
    kubectl apply -f k8s/grafana-deployment.yaml

    print_success "生产环境启动完成"
    print_info "使用 'kubectl get pods -n buger-system' 检查应用状态"
}

# 停止环境
stop() {
    print_info "停止所有服务..."

    cd backend

    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        print_success "Docker 容器已停止"
    fi

    print_success "所有服务已停止"
}

# 运行测试
run_tests() {
    print_info "运行测试..."

    cd backend

    # 启动 Docker Compose（如果未运行）
    if ! docker-compose ps | grep -q "mongo"; then
        print_info "启动测试数据库..."
        docker-compose up -d
        sleep 5
    fi

    # 运行测试
    npm test
}

# 显示日志
show_logs() {
    print_info "显示应用日志..."
    kubectl logs -f deployment/buger-app -n buger-system
}

# 显示状态
show_status() {
    print_info "系统状态检查..."

    print_info "\nDocker 容器状态:"
    docker ps -a --filter "name=buger" --format "table {{.Names}}\t{{.Status}}"

    print_info "\nKubernetes Pod 状态:"
    kubectl get pods -n buger-system 2>/dev/null || print_warning "Kubernetes 不可用或 buger-system 命名空间不存在"

    print_info "\n应用健康检查:"
    curl -s http://localhost:3050/health | jq '.' || print_warning "应用未运行或无法连接"
}

# 帮助信息
show_help() {
    cat << EOF
BUGer 系统 - 快速启动脚本

使用方法:
  ./start.sh [命令]

可用命令:
  dev              启动开发环境（包括 Docker 和 npm）
  prod             启动生产环境（Kubernetes）
  stop             停止所有服务
  test             运行测试
  logs             显示应用日志
  status           显示系统状态
  help             显示此帮助信息

示例:
  ./start.sh dev       - 启动开发环境
  ./start.sh prod      - 启动生产环境
  ./start.sh status    - 检查系统状态

EOF
}

# 主程序
main() {
    print_info "BUGer 系统启动脚本"
    print_info "版本: 1.0.0\n"

    # 检查是否在项目根目录
    if [ ! -f "README.md" ]; then
        print_error "请在项目根目录运行此脚本"
        exit 1
    fi

    # 检查工具
    check_tools

    print_info ""

    # 根据命令执行
    case "${1:-help}" in
        dev)
            start_dev
            ;;
        prod)
            start_prod
            ;;
        stop)
            stop
            ;;
        test)
            run_tests
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        help)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
