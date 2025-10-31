# Phase 6 快速参考 - 部署命令速查

## 🚀 一键部署

```bash
# 1. 构建镜像
docker build -t buger:1.0.0 .

# 2. 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 3. 部署配置和数据库
kubectl apply -f k8s/configmap.yaml k8s/mongodb-secret.yaml k8s/redis-secret.yaml k8s/rbac.yaml

# 4. 部署数据存储
kubectl apply -f k8s/mongodb-statefulset.yaml k8s/redis-deployment.yaml

# 5. 部署应用
kubectl apply -f k8s/app-deployment.yaml k8s/app-service.yaml k8s/ingress.yaml

# 6. 部署监控
kubectl apply -f k8s/prometheus-config.yaml k8s/prometheus-deployment.yaml k8s/grafana-deployment.yaml
```

## 📊 常用命令

| 命令 | 作用 |
|------|------|
| `kubectl get pods -n buger-system` | 查看所有 Pod |
| `kubectl logs -f deployment/buger-app -n buger-system` | 查看应用日志 |
| `kubectl describe pod <name> -n buger-system` | 查看 Pod 详情 |
| `kubectl exec -it <pod> -n buger-system -- bash` | 进入容器 |
| `kubectl port-forward svc/prometheus 9090:9090 -n buger-system` | 访问 Prometheus |
| `kubectl port-forward svc/grafana 3000:80 -n buger-system` | 访问 Grafana |
| `kubectl top pods -n buger-system` | 查看资源使用 |
| `kubectl rollout status deployment/buger-app -n buger-system` | 查看更新状态 |
| `kubectl rollout undo deployment/buger-app -n buger-system` | 回滚部署 |

## 🔑 修改密码

```bash
# 编辑 MongoDB 密码
kubectl edit secret buger-mongodb-secret -n buger-system

# 编辑 Redis 密码
kubectl edit secret buger-redis-secret -n buger-system

# 编辑 Grafana 管理员密码
kubectl edit secret grafana-secret -n buger-system
```

## 📈 性能监控

| 工具 | 端口 | 访问 |
|------|------|------|
| Prometheus | 9090 | `kubectl port-forward svc/prometheus 9090:9090 -n buger-system` |
| Grafana | 80/3000 | `kubectl port-forward svc/grafana 3000:80 -n buger-system` |
| API | 3050 | 通过 LoadBalancer 服务公开 |

## 🔄 CI/CD 工作流

- **推送到 develop**: 自动部署到 staging
- **推送到 main**: 自动部署到 production
- **发布 Release**: 创建并部署版本

## ✅ 健康检查

```bash
# 基础健康检查
curl http://your-domain/health

# 深度健康检查
curl http://your-domain/health/deep

# 测试 API
curl -H "X-API-Key: sk_xxx" http://your-domain/api
```

## 🐛 故障排查快速清单

- [ ] Pod 状态是否为 Running？
- [ ] 资源是否不足？
- [ ] 数据库连接是否正常？
- [ ] Redis 是否正常？
- [ ] 检查应用日志是否有错误？
- [ ] Prometheus 是否有告警？

## 📝 更新部署

```bash
# 更新镜像
kubectl set image deployment/buger-app buger-app=registry.example.com/buger:1.1.0 -n buger-system

# 检查更新状态
kubectl rollout status deployment/buger-app -n buger-system
```

---

**快速参考完成！** ⚡

