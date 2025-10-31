// src/api/routes/index.js
const { Router } = require('express');
const healthRouter = require('./health.js');
const { createBugRoutes } = require('./bugs.js');
const { createAdvancedRoutes } = require('./advanced.js');

async function createRoutes() {
  const router = Router();

  // 健康检查路由 (不需要认证)
  router.use('/', healthRouter);

  // API 信息端点
  router.get('/api', (req, res) => {
    res.status(200).json({
      name: 'BUGer API',
      version: '1.0.0',
      description: 'Bug Management Knowledge Base API',
      endpoints: {
        health: '/health',
        healthDeep: '/health/deep',
        bugs: {
          create: 'POST /api/bugs',
          batch: 'POST /api/bugs/batch',
          search: 'GET /api/bugs/search',
          getAll: 'GET /api/bugs',
          detail: 'GET /api/bugs/:id',
          stats: 'GET /api/bugs/stats',
          solution: 'PATCH /api/bugs/:id/solution',
        },
        advanced: {
          advancedSearch: 'GET /api/advanced/search',
          health: 'GET /api/advanced/analytics/health',
          comparison: 'GET /api/advanced/analytics/comparison',
          timeseries: 'GET /api/advanced/analytics/timeseries',
          trends: 'GET /api/advanced/trends',
          aggregatedStats: 'GET /api/advanced/aggregated-stats',
          keywords: 'GET /api/advanced/keywords',
          export: 'POST /api/advanced/export',
        },
      },
    });
  });

  // BUG 路由 (需要认证)
  const bugRoutes = await createBugRoutes();
  router.use('/api', bugRoutes);

  // 高级路由 (需要认证)
  const advancedRoutes = await createAdvancedRoutes();
  router.use('/api', advancedRoutes);

  return router;
}

module.exports = { createRoutes };