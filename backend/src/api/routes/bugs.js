// src/api/routes/bugs.js
const { Router } = require('express');
const { getDB } = require('../../config/database.js');
const { getRedis } = require('../../config/redis.js');
const { asyncHandler, NotFoundError } = require('../../middleware/errorHandler.js');
const { createValidatorMiddleware, schemas } = require('../../middleware/validator.js');
const { BugRepository } = require('../../repositories/bugRepository.js');
const { BugService } = require('../../services/bugService.js');
const logger = require('../../utils/logger.js');

async function createBugRoutes() {
  const router = Router();
  const db = getDB();
  const redis = getRedis();

  // 初始化仓库和服务
  const bugRepository = new BugRepository(db);
  await bugRepository.initialize();
  const bugService = new BugService(bugRepository, redis);

  /**
   * POST /api/bugs
   * 上报单个 BUG
   */
  router.post(
    '/bugs',
    createValidatorMiddleware(schemas.createBug, { source: 'body' }),
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug creation request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        body: req.body,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const { errorCode, title, message, stackTrace, severity, context } = req.body;
      const projectId = req.project.projectId;

      const bug = await bugService.createBug(
        {
          errorCode,
          title,
          message,
          stackTrace,
          severity,
          context,
        },
        projectId
      );

      res.sendSuccess(
        {
          bugId: bug.bugId,
          projectId: bug.projectId,
          occurrences: bug.occurrences,
          status: bug.status,
          createdAt: bug.createdAt,
        },
        'Bug reported successfully',
        201
      );
    })
  );

  /**
   * POST /api/bugs/batch
   * 批量上报 BUG (最多 20 个)
   */
  router.post(
    '/bugs/batch',
    createValidatorMiddleware(schemas.createBugsBatch, { source: 'body' }),
    asyncHandler(async (req, res) => {
      logger.debug('Processing batch bug creation request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        body: req.body,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const { bugs } = req.body;
      const projectId = req.project.projectId;

      logger.debug('Calling bug service to create bugs batch', {
        projectId: projectId,
        bugCount: bugs.length,
      });

      const results = await bugService.createBugsBatch(bugs, projectId);

      logger.debug('Batch creation results from service', {
        projectId: projectId,
        results: results,
      });

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      logger.debug('Batch creation summary', {
        projectId: projectId,
        total: results.length,
        successful: successCount,
        failed: failureCount,
      });

      res.sendSuccess(
        {
          results: results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        },
        `Batch processing completed: ${successCount} successful, ${failureCount} failed`,
        207 // Multi-Status
      );
    })
  );

  /**
   * GET /api/bugs/search
   * 搜索 BUG
   * 查询参数: q (必填), severity (可选), status (可选), limit, offset
   */
  router.get(
    '/bugs/search',
    createValidatorMiddleware(schemas.searchBugs, { source: 'query' }),
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug search request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        query: req.query,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const { q, severity, status, limit, offset } = req.query;
      const projectId = req.project.projectId;

      // 构建过滤条件
      const filters = {};
      if (severity) {
        filters.severity = severity;
      }
      if (status) {
        filters.status = status;
      }

      const result = await bugService.searchBugs(
        q,
        filters,
        projectId,
        parseInt(limit) || 10,
        parseInt(offset) || 0
      );

      res.sendPaginated(
        result.bugs,
        result.total,
        parseInt(limit) || 10,
        parseInt(offset) || 0,
        'Search completed successfully'
      );
    })
  );

  /**
   * GET /api/bugs
   * 获取项目的所有 BUG (分页)
   */
  router.get(
    '/bugs',
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug list request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        query: req.query,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const { limit = 10, offset = 0 } = req.query;
      const projectId = req.project.projectId;

      const result = await bugService.getBugsByProject(
        projectId,
        parseInt(limit),
        parseInt(offset)
      );

      res.sendPaginated(
        result.bugs,
        result.total,
        parseInt(limit),
        parseInt(offset),
        'Bugs retrieved successfully'
      );
    })
  );

  /**
   * GET /api/bugs/stats
   * 获取 BUG 统计信息
   */
  router.get(
    '/bugs/stats',
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug stats request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const projectId = req.project.projectId;

      const stats = await bugService.getStats(projectId);

      res.sendSuccess(stats, 'Stats retrieved successfully', 200);
    })
  );

  /**
   * GET /api/bugs/:id
   * 获取 BUG 详情
   */
  router.get(
    '/bugs/:id',
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug details request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        params: req.params,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const bugId = req.params.id;
      const projectId = req.project.projectId;

      const bug = await bugService.getBugById(bugId, projectId);

      res.sendSuccess(bug, 'Bug details retrieved successfully', 200);
    })
  );

  /**
   * PATCH /api/bugs/:id/solution
   * 更新 BUG 解决方案
   */
  router.patch(
    '/bugs/:id/solution',
    createValidatorMiddleware(schemas.updateSolution, { source: 'body' }),
    asyncHandler(async (req, res) => {
      logger.debug('Processing bug solution update request', {
        hasProject: !!req.project,
        project: req.project ? req.project.projectId : null,
        params: req.params,
        body: req.body,
      });
      
      if (!req.project) {
        logger.error('Project not found in request', {
          path: req.path,
          headers: req.headers,
        });
        return res.status(500).json({
          success: false,
          message: 'Project not found in request',
          code: 'INTERNAL_ERROR',
        });
      }
      
      const bugId = req.params.id;
      const projectId = req.project.projectId;
      const solutionData = req.body;

      const bug = await bugService.updateSolution(bugId, solutionData, projectId);

      res.sendSuccess(
        {
          bugId: bug.bugId,
          status: bug.status,
          solution: bug.solution,
          updatedAt: bug.updatedAt,
        },
        'Solution updated successfully',
        200
      );
    })
  );

  return router;
}

module.exports = { createBugRoutes };