// src/services/analyticsService.js
const logger = require('../utils/logger.js');

/**
 * 分析服务
 * 生成报告和洞察
 */
class AnalyticsService {
  constructor(bugRepository, redisClient) {
    this.bugRepository = bugRepository;
    this.redis = redisClient;
  }

  /**
   * 生成健康度报告
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 健康度报告
   */
  async generateHealthReport(projectId) {
    try {
      const cacheKey = `health_report:${projectId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Health report cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      // 获取统计数据
      const stats = await this.bugRepository.collection
        .aggregate([
          { $match: { projectId: projectId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              resolved: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
              },
              open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
              investigating: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0],
                },
              },
              critical: {
                $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
              },
            },
          },
        ])
        .toArray();

      const data = stats[0] || { total: 0 };

      // 计算指标
      const metrics = {
        summary: {
          total: data.total,
          resolved: data.resolved || 0,
          open: data.open || 0,
          investigating: data.investigating || 0,
          critical: data.critical || 0,
        },
        scores: {
          resolutionRate: data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(2) : 0,
          criticalRate: data.total > 0 ? ((data.critical / data.total) * 100).toFixed(2) : 0,
          healthScore: this._calculateHealthScore(data),
        },
        recommendations: this._generateRecommendations(data),
      };

      // 缓存结果 (1 小时)
      const cacheTtl = 3600;
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(metrics));

      logger.info('Health report generated', {
        projectId: projectId,
        healthScore: metrics.scores.healthScore,
      });

      return metrics;
    } catch (error) {
      logger.error('Error generating health report', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取项目对比报告
   *
   * @param {Array} projectIds - 项目 ID 列表
   * @returns {Promise<Object>} 对比报告
   */
  async getComparisonReport(projectIds) {
    try {
      const reports = {};

      for (const projectId of projectIds) {
        const stats = await this.bugRepository.collection
          .aggregate([
            { $match: { projectId: projectId } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgOccurrences: { $avg: '$occurrences' },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
                },
                critical: {
                  $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
                },
              },
            },
          ])
          .toArray();

        const data = stats[0] || { total: 0 };
        reports[projectId] = {
          total: data.total,
          avgOccurrences: (data.avgOccurrences || 0).toFixed(2),
          resolutionRate:
            data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(2) : 0,
          criticalCount: data.critical || 0,
        };
      }

      logger.info('Comparison report generated', {
        projectCount: projectIds.length,
      });

      return reports;
    } catch (error) {
      logger.error('Error generating comparison report', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 生成时间序列数据
   *
   * @param {string} projectId - 项目 ID
   * @param {number} days - 天数
   * @returns {Promise<Array>} 时间序列数据
   */
  async getTimeSeriesData(projectId, days = 30) {
    try {
      const cacheKey = `timeseries:${projectId}:${days}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Timeseries cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const timeseries = await this.bugRepository.collection
        .aggregate([
          {
            $match: {
              projectId: projectId,
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              bugs: { $sum: 1 },
              occurrences: { $sum: '$occurrences' },
              resolved: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // 缓存结果 (6 小时)
      const cacheTtl = 21600;
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(timeseries));

      logger.info('Timeseries data retrieved', {
        projectId: projectId,
        days: days,
        dataPoints: timeseries.length,
      });

      return timeseries;
    } catch (error) {
      logger.error('Error getting timeseries data', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 计算健康评分
   *
   * @private
   */
  _calculateHealthScore(data) {
    if (data.total === 0) return 100; // 没有 BUG 则评分最高

    const resolutionRate = (data.resolved || 0) / data.total;
    const criticalRate = (data.critical || 0) / data.total;
    const investigatingRate = (data.investigating || 0) / data.total;

    let score = 100;
    score -= resolutionRate < 0.5 ? 20 : 0; // 解决率低于 50% 扣 20 分
    score -= criticalRate > 0.2 ? 20 : 0; // critical 比例超过 20% 扣 20 分
    score -= investigatingRate > 0.5 ? 10 : 0; // 调查中的比例超过 50% 扣 10 分
    score -= data.total > 100 ? 15 : 0; // BUG 数量超过 100 扣 15 分

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成建议
   *
   * @private
   */
  _generateRecommendations(data) {
    const recommendations = [];

    if (!data.total) {
      recommendations.push('还没有 BUG 报告，继续保持质量！');
      return recommendations;
    }

    const resolutionRate = data.resolved / data.total;
    const criticalRate = data.critical / data.total;

    if (resolutionRate < 0.5) {
      recommendations.push('解决率低于 50%，建议加快 BUG 解决速度');
    }

    if (criticalRate > 0.2) {
      recommendations.push('关键 BUG 比例较高，建议优先解决 critical 级别的问题');
    }

    if (data.open > 50) {
      recommendations.push(`有 ${data.open} 个未解决的 BUG，建议制定解决计划`);
    }

    if (data.total > 100) {
      recommendations.push('BUG 数量众多，建议进行代码审查和测试优化');
    }

    if (recommendations.length === 0) {
      recommendations.push('项目状态良好，继续保持！');
    }

    return recommendations;
  }
}

module.exports = { AnalyticsService };