// src/services/searchService.js
const logger = require('../utils/logger.js');
const { NotFoundError } = require('../middleware/errorHandler.js');

/**
 * 高级搜索服务
 * 处理复杂搜索和聚合操作
 */
class SearchService {
  constructor(bugRepository, redisClient) {
    this.bugRepository = bugRepository;
    this.redis = redisClient;
  }

  /**
   * 高级搜索 - 支持多个过滤条件
   *
   * @param {string} query - 搜索查询
   * @param {Object} filters - 过滤条件
   * @param {string} projectId - 项目 ID
   * @param {number} limit - 返回数量
   * @param {number} offset - 偏移量
   * @returns {Promise<Object>} 搜索结果
   */
  async advancedSearch(query, filters = {}, projectId, limit = 10, offset = 0) {
    try {
      // 构建搜索条件
      const searchConditions = {
        projectId: projectId,
      };

      // 添加文本搜索
      if (query) {
        searchConditions.$text = { $search: query };
      }

      // 添加 severity 过滤
      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          searchConditions.severity = { $in: filters.severity };
        } else {
          searchConditions.severity = filters.severity;
        }
      }

      // 添加 status 过滤
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          searchConditions.status = { $in: filters.status };
        } else {
          searchConditions.status = filters.status;
        }
      }

      // 添加错误码过滤
      if (filters.errorCode) {
        searchConditions.errorCode = new RegExp(filters.errorCode, 'i');
      }

      // 添加日期范围过滤
      if (filters.dateFrom || filters.dateTo) {
        searchConditions.createdAt = {};
        if (filters.dateFrom) {
          searchConditions.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          searchConditions.createdAt.$lte = new Date(filters.dateTo);
        }
      }

      // 添加出现次数过滤
      if (filters.minOccurrences) {
        searchConditions.occurrences = { $gte: parseInt(filters.minOccurrences) };
      }

      // 尝试从缓存获取
      const cacheKey = this._generateCacheKey('advanced_search', {
        query,
        filters,
        projectId,
        limit,
        offset,
      });
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Advanced search cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      // 获取总数
      const total = await this.bugRepository.collection.countDocuments(searchConditions);

      // 执行搜索
      let query_pipeline = this.bugRepository.collection
        .find(searchConditions)
        .sort({ createdAt: -1 });

      if (query) {
        query_pipeline = query_pipeline.sort({ score: { $meta: 'textScore' } });
      }

      const bugs = await query_pipeline
        .skip(offset)
        .limit(limit)
        .toArray();

      const result = { bugs, total };

      // 缓存结果
      const cacheTtl = parseInt(process.env.CACHE_TTL_SEARCH || '300');
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(result));

      logger.info('Advanced search completed', {
        query: query,
        projectId: projectId,
        total: total,
        returned: bugs.length,
      });

      return result;
    } catch (error) {
      logger.error('Error in advanced search', {
        error: error.message,
        query: query,
      });
      throw error;
    }
  }

  /**
   * 获取聚合统计 - 按多个维度分组
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 聚合统计
   */
  async getAggregatedStats(projectId) {
    try {
      const cacheKey = `agg_stats:${projectId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Aggregated stats cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      const aggregation = await this.bugRepository.collection
        .aggregate([
          { $match: { projectId: projectId } },
          {
            $facet: {
              summary: [
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    totalOccurrences: { $sum: '$occurrences' },
                    avgOccurrences: { $avg: '$occurrences' },
                  },
                },
              ],
              bySeverity: [
                {
                  $group: {
                    _id: '$severity',
                    count: { $sum: 1 },
                    occurrences: { $sum: '$occurrences' },
                  },
                },
                { $sort: { count: -1 } },
              ],
              byStatus: [
                {
                  $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    occurrences: { $sum: '$occurrences' },
                  },
                },
                { $sort: { count: -1 } },
              ],
              byErrorCode: [
                {
                  $group: {
                    _id: '$errorCode',
                    count: { $sum: 1 },
                    occurrences: { $sum: '$occurrences' },
                  },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
              ],
              topBugs: [
                {
                  $group: {
                    _id: '$bugId',
                    errorCode: { $first: '$errorCode' },
                    title: { $first: '$title' },
                    occurrences: { $sum: '$occurrences' },
                  },
                },
                { $sort: { occurrences: -1 } },
                { $limit: 10 },
              ],
            },
          },
        ])
        .toArray();

      const stats = {
        summary: aggregation[0].summary[0] || { total: 0 },
        bySeverity: this._formatGroupResults(aggregation[0].bySeverity),
        byStatus: this._formatGroupResults(aggregation[0].byStatus),
        topErrorCodes: aggregation[0].byErrorCode || [],
        topBugs: aggregation[0].topBugs || [],
      };

      // 缓存结果
      const cacheTtl = parseInt(process.env.CACHE_TTL_PROJECT || '3600');
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(stats));

      logger.info('Aggregated stats retrieved', {
        projectId: projectId,
        total: stats.summary.total,
      });

      return stats;
    } catch (error) {
      logger.error('Error getting aggregated stats', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取趋势分析 - 按时间分组
   *
   * @param {string} projectId - 项目 ID
   * @param {string} granularity - 粒度 (day/week/month)
   * @returns {Promise<Array>} 趋势数据
   */
  async getTrendAnalysis(projectId, granularity = 'day') {
    try {
      const cacheKey = `trend:${projectId}:${granularity}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Trend analysis cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      // 根据粒度确定分组格式
      let dateFormat;
      switch (granularity) {
        case 'week':
          dateFormat = '%Y-W%V'; // 年-周
          break;
        case 'month':
          dateFormat = '%Y-%m'; // 年-月
          break;
        case 'day':
        default:
          dateFormat = '%Y-%m-%d'; // 年-月-日
      }

      const trends = await this.bugRepository.collection
        .aggregate([
          { $match: { projectId: projectId } },
          {
            $group: {
              _id: {
                $dateToString: { format: dateFormat, date: '$createdAt' },
              },
              count: { $sum: 1 },
              occurrences: { $sum: '$occurrences' },
              critical: {
                $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
              },
              resolved: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      // 缓存结果
      const cacheTtl = parseInt(process.env.CACHE_TTL_SEARCH || '300');
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(trends));

      logger.info('Trend analysis retrieved', {
        projectId: projectId,
        granularity: granularity,
        dataPoints: trends.length,
      });

      return trends;
    } catch (error) {
      logger.error('Error getting trend analysis', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取关键字云 - 最常见的错误码
   *
   * @param {string} projectId - 项目 ID
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 关键字列表
   */
  async getKeywordCloud(projectId, limit = 20) {
    try {
      const cacheKey = `keywords:${projectId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Keyword cloud cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      const keywords = await this.bugRepository.collection
        .aggregate([
          { $match: { projectId: projectId } },
          {
            $group: {
              _id: '$errorCode',
              count: { $sum: 1 },
              weight: { $sum: '$occurrences' },
            },
          },
          { $sort: { weight: -1 } },
          { $limit: limit },
          {
            $project: {
              keyword: '$_id',
              count: 1,
              weight: 1,
              _id: 0,
            },
          },
        ])
        .toArray();

      // 缓存结果
      const cacheTtl = parseInt(process.env.CACHE_TTL_PROJECT || '3600');
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(keywords));

      logger.info('Keyword cloud retrieved', {
        projectId: projectId,
        count: keywords.length,
      });

      return keywords;
    } catch (error) {
      logger.error('Error getting keyword cloud', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 生成缓存 key
   *
   * @private
   */
  _generateCacheKey(type, params) {
    const key = JSON.stringify(params);
    const hash = require('crypto')
      .createHash('md5')
      .update(key)
      .digest('hex')
      .substring(0, 8);
    return `${type}:${hash}`;
  }

  /**
   * 格式化分组结果
   *
   * @private
   */
  _formatGroupResults(results) {
    return results.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        occurrences: item.occurrences || 0,
      };
      return acc;
    }, {});
  }
}

module.exports = { SearchService };