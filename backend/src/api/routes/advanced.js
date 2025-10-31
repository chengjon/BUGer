// src/api/routes/advanced.js
const { Router } = require('express');
const { getDB } = require('../../config/database.js');
const { getRedis } = require('../../config/redis.js');
const { asyncHandler } = require('../../middleware/errorHandler.js');
const { BugRepository } = require('../../repositories/bugRepository.js');
const { SearchService } = require('../../services/searchService.js');
const { AnalyticsService } = require('../../services/analyticsService.js');
const logger = require('../../utils/logger.js');

async function createAdvancedRoutes() {
  const router = Router();
  const db = getDB();
  const redis = getRedis();

  // 初始化服务
  const bugRepository = new BugRepository(db);
  await bugRepository.initialize();
  const searchService = new SearchService(bugRepository, redis);
  const analyticsService = new AnalyticsService(bugRepository, redis);

  /**
   * GET /api/advanced/search
   * 高级搜索 - 支持多过滤条件
   */
  router.get(
    '/advanced/search',
    asyncHandler(async (req, res) => {
      const {
        q,
        severity,
        status,
        errorCode,
        dateFrom,
        dateTo,
        minOccurrences,
        limit = 10,
        offset = 0,
      } = req.query;
      const projectId = req.project.projectId;

      if (!q) {
        return res.sendError('Search query is required', 'MISSING_QUERY', 400);
      }

      const filters = {};
      if (severity) filters.severity = severity.split(',');
      if (status) filters.status = status.split(',');
      if (errorCode) filters.errorCode = errorCode;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (minOccurrences) filters.minOccurrences = minOccurrences;

      const result = await searchService.advancedSearch(
        q,
        filters,
        projectId,
        parseInt(limit),
        parseInt(offset)
      );

      res.sendPaginated(
        result.bugs,
        result.total,
        parseInt(limit),
        parseInt(offset),
        'Advanced search completed'
      );
    })
  );

  /**
   * GET /api/advanced/analytics/health
   * 获取项目健康报告
   */
  router.get(
    '/advanced/analytics/health',
    asyncHandler(async (req, res) => {
      const projectId = req.project.projectId;

      const report = await analyticsService.generateHealthReport(projectId);

      res.sendSuccess(report, 'Health report retrieved', 200);
    })
  );

  /**
   * GET /api/advanced/analytics/comparison
   * 获取多项目对比报告
   */
  router.get(
    '/advanced/analytics/comparison',
    asyncHandler(async (req, res) => {
      const { projects } = req.query;

      if (!projects) {
        return res.sendError('Projects parameter is required', 'MISSING_PROJECTS', 400);
      }

      const projectList = projects.split(',');
      const report = await analyticsService.getComparisonReport(projectList);

      res.sendSuccess(report, 'Comparison report retrieved', 200);
    })
  );

  /**
   * GET /api/advanced/analytics/timeseries
   * 获取时间序列数据
   */
  router.get(
    '/advanced/analytics/timeseries',
    asyncHandler(async (req, res) => {
      const { days = 30 } = req.query;
      const projectId = req.project.projectId;

      const timeseries = await analyticsService.getTimeSeriesData(
        projectId,
        parseInt(days)
      );

      res.sendSuccess(timeseries, 'Timeseries data retrieved', 200);
    })
  );

  /**
   * GET /api/advanced/trends
   * 获取趋势分析
   */
  router.get(
    '/advanced/trends',
    asyncHandler(async (req, res) => {
      const { granularity = 'day' } = req.query;
      const projectId = req.project.projectId;

      if (!['day', 'week', 'month'].includes(granularity)) {
        return res.sendError(
          'Invalid granularity. Must be: day, week, or month',
          'INVALID_GRANULARITY',
          400
        );
      }

      const trends = await searchService.getTrendAnalysis(projectId, granularity);

      res.sendSuccess(
        {
          granularity: granularity,
          trends: trends,
        },
        'Trend analysis retrieved',
        200
      );
    })
  );

  /**
   * GET /api/advanced/aggregated-stats
   * 获取聚合统计
   */
  router.get(
    '/advanced/aggregated-stats',
    asyncHandler(async (req, res) => {
      const projectId = req.project.projectId;

      const stats = await searchService.getAggregatedStats(projectId);

      res.sendSuccess(stats, 'Aggregated stats retrieved', 200);
    })
  );

  /**
   * GET /api/advanced/keywords
   * 获取关键字云
   */
  router.get(
    '/advanced/keywords',
    asyncHandler(async (req, res) => {
      const { limit = 20 } = req.query;
      const projectId = req.project.projectId;

      const keywords = await searchService.getKeywordCloud(projectId, parseInt(limit));

      res.sendSuccess(keywords, 'Keyword cloud retrieved', 200);
    })
  );

  /**
   * POST /api/advanced/export
   * 导出 BUG 数据
   */
  router.post(
    '/advanced/export',
    asyncHandler(async (req, res) => {
      const { format = 'json', filters = {} } = req.body;
      const projectId = req.project.projectId;

      // 获取数据
      const bugs = await bugRepository.collection
        .find({ projectId: projectId })
        .limit(10000)
        .toArray();

      // 根据格式转换
      let data;
      let contentType = 'application/json';

      if (format === 'csv') {
        data = _convertToCsv(bugs);
        contentType = 'text/csv';
      } else if (format === 'excel') {
        data = bugs; // 在生产环境中使用专门的库如 xlsx
        contentType = 'application/vnd.ms-excel';
      } else {
        data = bugs;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bugs_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}"`
      );

      if (format === 'csv') {
        res.send(data);
      } else {
        res.json(data);
      }

      logger.info('Data exported', {
        projectId: projectId,
        format: format,
        count: bugs.length,
      });
    })
  );

  return router;
}

/**
 * 转换为 CSV 格式
 *
 * @private
 */
function _convertToCsv(bugs) {
  const headers = [
    'bugId',
    'errorCode',
    'title',
    'severity',
    'status',
    'occurrences',
    'createdAt',
  ];
  const csvRows = [headers.join(',')];

  for (const bug of bugs) {
    const row = [
      bug.bugId,
      bug.errorCode,
      `"${bug.title}"`, // CSV 中需要引用文本
      bug.severity,
      bug.status,
      bug.occurrences,
      bug.createdAt.toISOString(),
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

module.exports = { createAdvancedRoutes };