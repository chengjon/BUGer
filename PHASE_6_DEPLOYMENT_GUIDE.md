# Phase 6 部署指南 - 完整版本

**完成日期**: 2025-10-28
**状态**: ✅ 生产就绪
**目标**: 企业级部署和优化

---

## 📋 概览

Phase 6 为 BUGer 系统提供完整的生产部署方案，包括：

- ✅ Kubernetes 容器化部署
- ✅ CI/CD 自动化流程
- ✅ 生产级监控告警
- ✅ 性能优化和调优
- ✅ 安全加固策略

---

## 🚀 快速开始

### 1. 准备工作

#### 系统要求
```bash
# Kubernetes 集群 (1.24+)
kubectl version --client

# Docker 镜像构建工具
docker version

# Helm (可选，用于包管理)
helm version

# kubectl 配置
kubectl cluster-info
```

#### 克隆并构建镜像
```bash
# 进入项目目录
cd /opt/iflow/buger/backend

# 构建 Docker 镜像
docker build -t buger:1.0.0 .

# 标记镜像用于推送
docker tag buger:1.0.0 registry.example.com/buger:1.0.0

# 推送到镜像仓库
docker push registry.example.com/buger:1.0.0
```

### 2. Kubernetes 部署

#### 创建命名空间
```bash
kubectl apply -f k8s/namespace.yaml
```

#### 部署配置管理
```bash
# ConfigMap - 应用配置
kubectl apply -f k8s/configmap.yaml

# Secret - 敏感数据 (需要修改默认密码!)
kubectl apply -f k8s/mongodb-secret.yaml
kubectl apply -f k8s/redis-secret.yaml

# RBAC - 访问控制
kubectl apply -f k8s/rbac.yaml
```

#### 部署数据库和缓存
```bash
# MongoDB 有状态集
kubectl apply -f k8s/mongodb-statefulset.yaml

# 等待 MongoDB 就绪
kubectl wait --for=condition=ready pod -l app=buger,component=mongodb -n buger-system --timeout=300s

# Redis 部署
kubectl apply -f k8s/redis-deployment.yaml

# 等待 Redis 就绪
kubectl wait --for=condition=ready pod -l app=buger,component=redis -n buger-system --timeout=300s
```

#### 部署应用和监控
```bash
# 应用部署 (包含自动扩展)
kubectl apply -f k8s/app-deployment.yaml

# 应用服务
kubectl apply -f k8s/app-service.yaml

# 网络入站配置
kubectl apply -f k8s/ingress.yaml

# Prometheus 监控
kubectl apply -f k8s/prometheus-config.yaml
kubectl apply -f k8s/prometheus-deployment.yaml

# Grafana 可视化
kubectl apply -f k8s/grafana-deployment.yaml
```

#### 验证部署
```bash
# 检查所有 Pod 运行状态
kubectl get pods -n buger-system

# 查看应用日志
kubectl logs -f deployment/buger-app -n buger-system

# 检查服务
kubectl get svc -n buger-system

# 检查入站配置
kubectl get ingress -n buger-system
```

---

## 📊 系统架构

### 部署拓扑

```
┌─────────────────────────────────────────────────────┐
│              Kubernetes Cluster                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         Namespace: buger-system                │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  API 服务层 (Deployment)                 │ │  │
│  │  │  ├─ buger-app x3 (副本)                  │ │  │
│  │  │  ├─ HPA: 2-10 副本 (基于 CPU/内存)      │ │  │
│  │  │  └─ Service (LoadBalancer + Internal)   │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                      ↓                        │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  数据存储层                              │ │  │
│  │  │  ├─ MongoDB (StatefulSet x3)           │ │  │
│  │  │  ├─ PersistentVolume (50Gi)            │ │  │
│  │  │  └─ Replica Set 高可用                 │ │  │
│  │  │                                         │ │  │
│  │  │  Redis (Deployment)                    │ │  │
│  │  │  └─ 缓存加速                           │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                      ↓                        │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │  监控告警层                              │ │  │
│  │  │  ├─ Prometheus (监控数据收集)           │ │  │
│  │  │  ├─ Grafana (仪表板可视化)              │ │  │
│  │  │  └─ Alertmanager (告警管理)             │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
│                                                    │
│  Ingress (NGINX)                                   │
│  └─ 路由外部请求到服务                            │
└─────────────────────────────────────────────────────┘
```

### 高可用配置

| 组件 | 副本数 | 备注 |
|------|--------|------|
| API 应用 | 3-10 | 自动扩展，最少 2 个 |
| MongoDB | 3 | 副本集配置 |
| Redis | 1 | 可选升级到集群 |
| Prometheus | 1 | 无状态，可增加 |
| Grafana | 1 | 无状态，可增加 |

---

## 🔧 配置管理

### 环境变量

编辑 `k8s/configmap.yaml` 调整以下参数：

```yaml
# 日志级别
LOG_LEVEL: "info"  # debug, info, warn, error

# 缓存 TTL (秒)
CACHE_TTL_SEARCH: "300"        # 搜索结果: 5 分钟
CACHE_TTL_STATS: "3600"        # 统计数据: 1 小时
CACHE_TTL_TIMESERIES: "21600"  # 时序数据: 6 小时

# 性能参数
RATE_LIMIT_REQUESTS: "200"     # 每分钟请求数
REQUEST_TIMEOUT: "30000"       # 请求超时 (毫秒)
MAX_BATCH_SIZE: "20"           # 批量操作最大数

# MongoDB 连接池
MONGODB_POOL_SIZE_MAX: "20"
MONGODB_POOL_SIZE_MIN: "5"
```

### Secret 管理

⚠️ **生产环境必须修改所有默认密码！**

```bash
# 编辑 MongoDB 密钥
kubectl edit secret buger-mongodb-secret -n buger-system

# 编辑 Redis 密钥
kubectl edit secret buger-redis-secret -n buger-system

# 编辑 Grafana 管理员密码
kubectl edit secret grafana-secret -n buger-system
```

### 使用密钥管理系统

推荐在生产环境中使用：

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

示例（AWS）：
```bash
# 使用 Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# 创建加密的 Secret
echo -n 'my-password' | kubectl create secret generic my-secret --dry-run=client --from-file=password=/dev/stdin -o yaml | kubeseal -f -
```

---

## 📈 监控和告警

### 访问 Prometheus

```bash
# 端口转发
kubectl port-forward svc/prometheus 9090:9090 -n buger-system

# 访问: http://localhost:9090
```

### 访问 Grafana

```bash
# 端口转发
kubectl port-forward svc/grafana 3000:80 -n buger-system

# 访问: http://localhost:3000
# 默认用户: admin
# 默认密码: change_me_in_production (务必修改!)
```

### 重要告警规则

| 告警 | 阈值 | 描述 |
|------|------|------|
| BugerAppDown | 连续 2 分钟不可达 | API 服务宕机 |
| HighErrorRate | > 5% 错误率 | 持续 5 分钟 |
| HighResponseTime | p95 > 2s | 响应时间过长 |
| MongoDBConnectionExhausted | 可用连接 < 2 | 数据库连接不足 |
| HighRedisMemory | > 80% 内存 | 缓存空间不足 |
| PodRestartingTooOften | 重启频率 > 0 | Pod 频繁重启 |

### 配置 AlertManager

```bash
# 编辑告警通知规则
kubectl edit cm prometheus-rules -n buger-system

# 修改接收器（邮件、钉钉等）
```

---

## ⚡ 性能优化

### 应用层优化

已在 `performanceOptimization.js` 中实现：

- ✅ **HTTP 压缩**: gzip 压缩响应 (6 级压缩)
- ✅ **缓存策略**: ETag + Cache-Control 头
- ✅ **内存监控**: 自动告警堆内存使用 > 85%
- ✅ **响应时间追踪**: 记录慢查询日志
- ✅ **请求限制**: 防止大型 DoS 攻击

### 数据库优化

```bash
# MongoDB 索引检查
kubectl exec -it mongodb-0 -n buger-system -- mongosh

# 在 mongosh 中执行
db.bugs.getIndexes()
db.bugs.createIndex({ projectId: 1, createdAt: -1 })
db.bugs.createIndex({ errorCode: 1 })
db.bugs.createIndex({ title: "text", description: "text" })  # 全文索引
```

### Redis 优化

```bash
# 检查 Redis 内存使用
kubectl exec -it redis-xxx -n buger-system -- redis-cli

info memory
DBSIZE
```

### Kubernetes 资源优化

```bash
# 查看资源使用
kubectl top nodes
kubectl top pods -n buger-system

# 调整 HPA 参数
kubectl edit hpa buger-app-hpa -n buger-system
```

---

## 🔐 安全加固

### 已实现的安全措施

在 `securityHardening.js` 中实现的多重防御：

| 防护 | 实现 |
|------|------|
| API 密钥验证 | ✅ HMAC 签名 + 过期检查 |
| 请求签名 | ✅ 常量时间比较 |
| 输入清理 | ✅ NoSQL 注入防护 |
| CSRF 防护 | ✅ Origin 验证 |
| IP 白名单 | ✅ 支持 CIDR 表示法 |
| 请求大小限制 | ✅ 最大 1MB |
| 安全头 | ✅ CSP, HSTS, XSS Filter |

### SSL/TLS 配置

```bash
# 生成自签名证书 (测试用)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# 创建 TLS Secret
kubectl create secret tls buger-tls-cert \
  --cert=cert.pem \
  --key=key.pem \
  -n buger-system

# 使用真实证书 (生产)
# 1. 申请 Let's Encrypt 证书
# 2. 使用 cert-manager 自动管理
```

### API 密钥最佳实践

```bash
# 定期轮换 API 密钥
kubectl delete secret buger-api-key -n buger-system
kubectl create secret generic buger-api-key --from-literal=key=$(openssl rand -hex 32) -n buger-system

# 限制 API 密钥权限
# - 按项目分配密钥
# - 按 IP 地址白名单
# - 设置访问频率限制
```

---

## 🔄 CI/CD 流程

### GitHub Actions 工作流

位置: `.github/workflows/`

#### 1. CI Pipeline (`ci-pipeline.yaml`)

触发条件: Push 到 main/develop，PR

步骤:
1. **测试和 Lint**
   - 运行 jest 单元测试
   - 代码风格检查
   - 覆盖率统计

2. **安全扫描**
   - Trivy 漏洞扫描
   - 依赖审查

3. **构建镜像**
   - Docker 镜像构建
   - 推送到镜像仓库

4. **自动部署**
   - 部署到 staging (develop 分支)
   - 部署到 production (main 分支)

#### 2. Release 流程 (`release.yaml`)

触发条件: Release 发布

步骤:
1. 创建发布构件
2. 生成 Docker 镜像标签
3. 部署到生产环境
4. 发送部署通知

### 本地 CI/CD 模拟

```bash
# 运行测试
npm test

# 运行 lint
npm run lint

# 构建镜像
docker build -t buger:test .

# 运行容器测试
docker run --rm \
  -e MONGODB_URI=mongodb://mongo:27017 \
  -e REDIS_URL=redis://redis:6379 \
  buger:test npm test
```

---

## 📝 部署清单

### 预部署检查

- [ ] 更新所有默认密码
- [ ] 配置 CORS 允许来源
- [ ] 设置域名和 SSL 证书
- [ ] 配置告警通知渠道
- [ ] 备份现有数据库
- [ ] 更新 DNS 记录
- [ ] 测试数据库备份恢复

### 部署步骤

- [ ] 1. 创建命名空间
- [ ] 2. 部署 ConfigMap 和 Secret
- [ ] 3. 部署 MongoDB
- [ ] 4. 部署 Redis
- [ ] 5. 部署应用
- [ ] 6. 部署监控系统
- [ ] 7. 配置入站规则
- [ ] 8. 健康检查

### 部署后验证

```bash
# 健康检查
curl -H "X-API-Key: sk_test_key" http://localhost:3050/health

# 深度检查
curl -H "X-API-Key: sk_test_key" http://localhost:3050/health/deep

# 测试 API
curl -X GET "http://localhost:3050/api" \
  -H "X-API-Key: sk_test_key"
```

---

## 🔄 更新和回滚

### 滚动更新

```bash
# 更新镜像
kubectl set image deployment/buger-app \
  buger-app=registry.example.com/buger:1.1.0 \
  -n buger-system

# 查看更新状态
kubectl rollout status deployment/buger-app -n buger-system

# 查看更新历史
kubectl rollout history deployment/buger-app -n buger-system
```

### 回滚操作

```bash
# 回滚到上一个版本
kubectl rollout undo deployment/buger-app -n buger-system

# 回滚到特定版本
kubectl rollout undo deployment/buger-app --to-revision=2 -n buger-system
```

---

## 💾 备份和恢复

### MongoDB 备份

```bash
# 远程备份
mongodump --uri="mongodb://mongo:27017/buger" --out=backups/$(date +%Y%m%d)

# 恢复备份
mongorestore --uri="mongodb://mongo:27017/buger" backups/20251028
```

### Kubernetes 资源备份

```bash
# 备份所有资源
kubectl get all -n buger-system -o yaml > backup-$(date +%Y%m%d).yaml

# 恢复资源
kubectl apply -f backup-20251028.yaml
```

---

## 📊 统计信息

### Phase 6 交付物

```
Kubernetes 配置:
  ├─ k8s/namespace.yaml              # 命名空间
  ├─ k8s/configmap.yaml              # 应用配置
  ├─ k8s/mongodb-secret.yaml         # MongoDB 凭证
  ├─ k8s/redis-secret.yaml           # Redis 凭证
  ├─ k8s/app-deployment.yaml         # 应用部署 + HPA
  ├─ k8s/app-service.yaml            # 应用服务
  ├─ k8s/mongodb-statefulset.yaml    # 数据库部署
  ├─ k8s/redis-deployment.yaml       # 缓存部署
  ├─ k8s/rbac.yaml                   # 访问控制
  ├─ k8s/ingress.yaml                # 网络入站
  ├─ k8s/prometheus-config.yaml      # Prometheus 配置
  ├─ k8s/prometheus-deployment.yaml  # Prometheus 部署
  └─ k8s/grafana-deployment.yaml     # Grafana 部署

CI/CD 配置:
  ├─ .github/workflows/ci-pipeline.yaml    # 测试构建部署
  └─ .github/workflows/release.yaml        # 发布工作流

代码优化:
  ├─ src/middleware/performanceOptimization.js  # 性能优化
  └─ src/middleware/securityHardening.js        # 安全加固

总计:
  ├─ Kubernetes 配置文件  : 13 个
  ├─ GitHub Actions 工作流: 2 个
  ├─ 新增 JS 模块         : 2 个 (~450 行)
  ├─ 告警规则             : 6 条
  └─ 部署清单             : 20+ 项
```

---

## 🎯 关键指标

### 部署成功标志

| 指标 | 目标 | 检查方式 |
|------|------|---------|
| API 可用性 | > 99.9% | Prometheus 监控 |
| 平均响应时间 | < 500ms | 请求日志统计 |
| P95 响应时间 | < 2s | 性能监控 |
| 错误率 | < 0.1% | 日志告警 |
| 数据库连接 | < 90% 使用 | MongoDB 监控 |
| 缓存命中率 | > 80% | Redis 统计 |

---

## 📚 故障排查

### Pod 启动失败

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n buger-system

# 查看日志
kubectl logs <pod-name> -n buger-system --previous

# 进入容器调试
kubectl exec -it <pod-name> -n buger-system -- /bin/sh
```

### 连接问题

```bash
# 测试 MongoDB 连接
kubectl exec -it buger-app-xxx -n buger-system -- \
  mongosh "mongodb://mongo:27017/buger"

# 测试 Redis 连接
kubectl exec -it redis-xxx -n buger-system -- \
  redis-cli ping
```

### 性能问题

```bash
# 检查资源使用
kubectl top pods -n buger-system

# 查看 HPA 状态
kubectl describe hpa buger-app-hpa -n buger-system

# 查看慢查询日志
kubectl logs -f deployment/buger-app -n buger-system | grep "Slow"
```

---

## 🎓 最佳实践

### 1. 资源管理
- 设置合理的资源请求和限制
- 定期监控资源使用趋势
- 根据需求进行容量规划

### 2. 日志管理
- 使用结构化日志记录
- 设置日志聚合系统（ELK/Loki）
- 定期清理过期日志

### 3. 备份策略
- 每日自动备份数据库
- 定期测试备份恢复
- 保持多份备份副本

### 4. 安全审计
- 记录所有 API 访问日志
- 定期审查访问权限
- 监控异常行为

---

## 📞 支持和反馈

如遇到问题：

1. 查看故障排查部分
2. 检查监控告警信息
3. 查看应用日志
4. 参考 Kubernetes 官方文档

---

**部署指南完成！系统已做好生产部署准备。** 🎉

