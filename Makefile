# BUGer 系统 - Makefile
# 用于简化常见的开发和运维操作

.PHONY: help dev prod start-dev stop-dev test lint lint-fix db-init db-seed db-drop docker-build docker-up docker-down k8s-deploy k8s-status k8s-logs clean

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# 帮助目标
help:
	@echo "$(BLUE)BUGer 系统 - Makefile 命令参考$(NC)"
	@echo ""
	@echo "$(YELLOW)开发命令:$(NC)"
	@echo "  make dev              - 启动开发环境 (包括 Docker)"
	@echo "  make start-dev        - 仅启动 npm 开发服务器"
	@echo "  make stop-dev         - 停止开发环境"
	@echo "  make test             - 运行所有测试"
	@echo "  make test:unit        - 运行单元测试"
	@echo "  make test:integration - 运行集成测试"
	@echo "  make lint             - 代码检查 (ESLint)"
	@echo "  make lint:fix         - 自动修复代码风格"
	@echo ""
	@echo "$(YELLOW)数据库命令:$(NC)"
	@echo "  make db-init          - 初始化数据库索引"
	@echo "  make db-seed          - 填充测试数据"
	@echo "  make db-drop          - 清空数据库"
	@echo ""
	@echo "$(YELLOW)Docker 命令:$(NC)"
	@echo "  make docker-build     - 构建 Docker 镜像"
	@echo "  make docker-up        - 启动 Docker 容器 (compose)"
	@echo "  make docker-down      - 停止 Docker 容器 (compose)"
	@echo ""
	@echo "$(YELLOW)Kubernetes 命令:$(NC)"
	@echo "  make k8s-deploy       - 部署到 Kubernetes"
	@echo "  make k8s-status       - 检查 K8s 部署状态"
	@echo "  make k8s-logs         - 查看 K8s 日志"
	@echo ""
	@echo "$(YELLOW)其他命令:$(NC)"
	@echo "  make clean            - 清理临时文件"
	@echo "  make help             - 显示此帮助"
	@echo ""

# 开发环境
dev: docker-up start-dev

start-dev:
	@echo "$(GREEN)启动开发服务器...$(NC)"
	cd backend && npm run dev

stop-dev:
	@echo "$(GREEN)停止开发服务器...$(NC)"
	@pkill -f "node src/index.js" || true

# 测试命令
test:
	@echo "$(GREEN)运行所有测试...$(NC)"
	cd backend && npm test

test-unit:
	@echo "$(GREEN)运行单元测试...$(NC)"
	cd backend && npm run test:unit

test-integration:
	@echo "$(GREEN)运行集成测试...$(NC)"
	cd backend && npm run test:integration

# Lint 命令
lint:
	@echo "$(GREEN)运行代码检查...$(NC)"
	cd backend && npm run lint

lint-fix:
	@echo "$(GREEN)自动修复代码风格...$(NC)"
	cd backend && npm run lint:fix

# 数据库命令
db-init:
	@echo "$(GREEN)初始化数据库...$(NC)"
	cd backend && npm run db:init

db-seed:
	@echo "$(GREEN)填充测试数据...$(NC)"
	cd backend && npm run db:seed

db-drop:
	@echo "$(YELLOW)清空数据库...$(NC)"
	cd backend && npm run db:drop

# Docker 命令
docker-build:
	@echo "$(GREEN)构建 Docker 镜像...$(NC)"
	cd backend && docker build -t buger:1.0.0 .

docker-up:
	@echo "$(GREEN)启动 Docker 容器...$(NC)"
	cd backend && docker-compose up -d
	@echo "$(GREEN)Docker 容器已启动，等待初始化...$(NC)"
	@sleep 3
	@echo "$(GREEN)初始化数据库...$(NC)"
	@cd backend && npm run db:init 2>/dev/null || true

docker-down:
	@echo "$(GREEN)停止 Docker 容器...$(NC)"
	cd backend && docker-compose down

docker-logs:
	@echo "$(GREEN)显示 Docker 日志...$(NC)"
	cd backend && docker-compose logs -f

# Kubernetes 命令
k8s-deploy:
	@echo "$(GREEN)部署到 Kubernetes...$(NC)"
	cd backend && kubectl apply -f k8s/

k8s-status:
	@echo "$(GREEN)检查 Kubernetes 部署状态...$(NC)"
	@kubectl get pods -n buger-system
	@echo ""
	@echo "$(GREEN)Kubernetes 服务:$(NC)"
	@kubectl get svc -n buger-system
	@echo ""
	@echo "$(GREEN)Kubernetes 入站:$(NC)"
	@kubectl get ingress -n buger-system

k8s-logs:
	@echo "$(GREEN)查看 Kubernetes 日志...$(NC)"
	@kubectl logs -f deployment/buger-app -n buger-system

k8s-shell:
	@echo "$(GREEN)进入 Pod 容器...$(NC)"
	@kubectl exec -it $$(kubectl get pods -n buger-system -l app=buger,component=api -o jsonpath='{.items[0].metadata.name}') -n buger-system -- /bin/sh

# 清理命令
clean:
	@echo "$(YELLOW)清理临时文件...$(NC)"
	cd backend && rm -rf coverage .nyc_output
	@echo "$(GREEN)清理完成$(NC)"

# 实用命令
prod:
	@echo "$(GREEN)启动生产环境...$(NC)"
	cd backend && npm run start

install:
	@echo "$(GREEN)安装依赖...$(NC)"
	cd backend && npm install

reinstall:
	@echo "$(GREEN)重新安装依赖...$(NC)"
	cd backend && rm -rf node_modules package-lock.json && npm install

# 信息命令
info:
	@echo "$(BLUE)项目信息:$(NC)"
	@echo "项目名称: BUGer 系统"
	@echo "版本: 1.0.0"
	@echo "描述: Bug 管理知识库系统"
	@echo ""
	@echo "$(BLUE)技术栈:$(NC)"
	@echo "后端: Node.js + Express"
	@echo "数据库: MongoDB"
	@echo "缓存: Redis"
	@echo "部署: Docker + Kubernetes"
	@echo "监控: Prometheus + Grafana"
	@echo ""
	@echo "$(BLUE)默认端口:$(NC)"
	@echo "API: http://localhost:3050"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"
	@echo "Prometheus: localhost:9090"
	@echo "Grafana: localhost:3000"

# 环境检查
check-env:
	@echo "$(GREEN)检查开发环境...$(NC)"
	@echo "Node.js:"
	@node --version
	@echo "npm:"
	@npm --version
	@echo "Docker:"
	@docker --version || echo "Docker 未安装"
	@echo "Kubernetes:"
	@kubectl version --short 2>/dev/null || echo "kubectl 未安装或未配置"
