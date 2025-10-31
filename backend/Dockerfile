# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装基础工具
RUN apk add --no-cache dumb-init

# 复制 package files
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建 non-root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error('Health check failed')})"

# 使用 dumb-init 作为 PID 1，确保正确的信号处理
ENTRYPOINT ["/sbin/dumb-init", "--"]

CMD ["node", "src/index.js"]
