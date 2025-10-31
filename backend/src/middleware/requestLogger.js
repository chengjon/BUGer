// src/middleware/requestLogger.js
const logger = require('../utils/logger.js');

/**
 * 请求日志中间件
 * 记录所有 HTTP 请求的详细信息
 *
 * @returns {Function} 中间件函数
 */
function requestLogger() {
  return (req, res, next) => {
    const startTime = Date.now();

    // 捕获响应的 send 方法
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // 确定日志级别
      let logLevel = 'info';
      if (statusCode >= 500) {
        logLevel = 'error';
      } else if (statusCode >= 400) {
        logLevel = 'warn';
      } else if (statusCode >= 200) {
        logLevel = 'info';
      }

      // 日志信息
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        projectId: req.project?.projectId,
        apiKeyPrefix: req.apiKey?.substring(0, 10),
        contentLength: res.get('content-length'),
      };

      // 记录请求体（仅在必要时）
      if (
        req.method !== 'GET' &&
        req.method !== 'HEAD' &&
        req.body &&
        Object.keys(req.body).length > 0
      ) {
        const bodyKeys = Object.keys(req.body).slice(0, 5);
        logData.requestBodyKeys = bodyKeys;
      }

      // 根据日志级别记录
      logger[logLevel](`${req.method} ${req.path}`, logData);

      // 调用原始 send
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * 监控中间件
 * 收集和跟踪性能指标
 *
 * @param {Object} metrics - 指标收集器对象
 * @returns {Function} 中间件函数
 */
function metricsCollector(metrics = {}) {
  return (req, res, next) => {
    const startTime = Date.now();

    // 捕获响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const key = `${req.method} ${req.path}`;

      // 初始化指标
      if (!metrics[key]) {
        metrics[key] = {
          count: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errorCount: 0,
        };
      }

      // 更新指标
      metrics[key].count++;
      metrics[key].totalTime += duration;
      metrics[key].minTime = Math.min(metrics[key].minTime, duration);
      metrics[key].maxTime = Math.max(metrics[key].maxTime, duration);

      if (res.statusCode >= 400) {
        metrics[key].errorCount++;
      }

      // 每 100 个请求记录一次汇总
      if (metrics[key].count % 100 === 0) {
        const avg = Math.round(metrics[key].totalTime / metrics[key].count);
        logger.info(`Metrics - ${key}`, {
          count: metrics[key].count,
          avgTime: `${avg}ms`,
          minTime: `${metrics[key].minTime}ms`,
          maxTime: `${metrics[key].maxTime}ms`,
          errorCount: metrics[key].errorCount,
          errorRate: `${((metrics[key].errorCount / metrics[key].count) * 100).toFixed(2)}%`,
        });
      }
    });

    next();
  };
}

module.exports = { requestLogger, metricsCollector };