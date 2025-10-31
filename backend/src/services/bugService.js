// src/services/bugService.js
const logger = require('../utils/logger.js');
const { generateBugId, generateTimestamp } = require('../utils/generator.js');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler.js');

/**
 * BUG 业务逻辑服务层
 * 处理所有与 BUG 相关的业务逻辑
 */
class BugService {
  constructor(bugRepository, redisClient) {
    this.bugRepository = bugRepository;
    this.redis = redisClient;
  }

  /**
   * 创建 BUG
   *
   * @param {Object} bugData - BUG 数据
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 创建的 BUG
   */
  async createBug(bugData, projectId) {
    try {
      const { errorCode, title, message, severity, stackTrace, context } = bugData;

      // 检查是否存在相同的错误代码
      const existingBug = await this.bugRepository.collection.findOne({
        projectId: projectId,
        errorCode: errorCode,
      });

      let bug;

      if (existingBug) {
        // 如果已存在，增加出现次数并更新context字段
        const updateData = {
          context: context || {},
          message: message,
        };

        // 只有在 stackTrace 存在时才添加它
        if (stackTrace !== undefined && stackTrace !== null) {
          updateData.stackTrace = stackTrace;
        }

        bug = await this.bugRepository.updateBugWithOccurrence(
          existingBug.bugId,
          updateData
        );
        logger.info('Bug occurrence incremented and context updated', {
          bugId: bug.bugId,
          occurrences: bug.occurrences,
          projectId: projectId,
          hasProjectName: !!(context && context.project_name),
          hasProjectRoot: !!(context && context.project_root),
        });
      } else {
        // 创建新 BUG
        const bugId = generateBugId();
        const newBug = {
          bugId,
          projectId,
          errorCode,
          title,
          message,
          severity,
          context: context || {},
          occurrences: 1,
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // 只有在 stackTrace 存在时才添加它
        if (stackTrace !== undefined && stackTrace !== null) {
          newBug.stackTrace = stackTrace;
        }

        logger.debug('Creating new bug with data', {
          newBug: newBug,
        });

        bug = await this.bugRepository.createBug(newBug);
        logger.info('Bug created', {
          bugId: bug.bugId,
          errorCode: errorCode,
          projectId: projectId,
        });
      }

      // 清理相关的搜索缓存
      await this.invalidateSearchCache(projectId);

      return bug;
    } catch (error) {
      logger.error('Error creating bug', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 批量创建 BUG
   *
   * @param {Array} bugsData - BUG 数据数组
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Array>} 创建的 BUG 列表
   */
  async createBugsBatch(bugsData, projectId) {
    try {
      logger.debug('Starting batch bug creation', {
        projectId: projectId,
        bugCount: bugsData.length,
        bugs: bugsData,
      });
      
      const results = [];

      for (const bugData of bugsData) {
        try {
          logger.debug('Creating individual bug in batch', {
            projectId: projectId,
            bugData: bugData,
          });
          
          const bug = await this.createBug(bugData, projectId);
          results.push({
            success: true,
            bugId: bug.bugId,
            message: 'Bug created or updated',
          });
          
          logger.debug('Bug created successfully in batch', {
            projectId: projectId,
            bugId: bug.bugId,
          });
        } catch (error) {
          logger.error('Error creating bug in batch', {
            projectId: projectId,
            error: error.message,
            bugData: bugData,
          });
          
          results.push({
            success: false,
            bugId: null,
            message: error.message,
            error: error.code || 'ERROR',
          });
        }
      }

      logger.info('Batch bug creation completed', {
        projectId: projectId,
        total: bugsData.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results: results,
      });

      return results;
    } catch (error) {
      logger.error('Error in batch bug creation', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取 BUG 详情
   *
   * @param {string} bugId - BUG ID
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} BUG 详情
   */
  async getBugById(bugId, projectId) {
    try {
      const bug = await this.bugRepository.getBugById(bugId);

      if (!bug) {
        throw new NotFoundError(`Bug ${bugId} not found`);
      }

      if (bug.projectId !== projectId) {
        throw new NotFoundError(`Bug ${bugId} not found in this project`);
      }

      return bug;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Error getting bug', {
        error: error.message,
        bugId: bugId,
      });
      throw error;
    }
  }

  /**
   * 搜索 BUG
   *
   * @param {string} query - 搜索查询
   * @param {Object} filters - 过滤条件
   * @param {string} projectId - 项目 ID
   * @param {number} limit - 返回数量
   * @param {number} offset - 偏移量
   * @returns {Promise<{bugs: Array, total: number}>} 搜索结果
   */
  async searchBugs(query, filters = {}, projectId, limit = 10, offset = 0) {
    try {
      // 添加项目 ID 过滤
      const finalFilters = {
        ...filters,
        projectId: projectId,
      };

      // 尝试从 Redis 缓存获取
      const cacheKey = `search:${query}:${JSON.stringify(finalFilters)}:${limit}:${offset}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Search cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      // 从数据库查询
      const result = await this.bugRepository.searchBugs(
        query,
        finalFilters,
        limit,
        offset
      );

      // 缓存结果
      const cacheTtl = parseInt(process.env.CACHE_TTL_SEARCH || '300');
      await this.redis.set(cacheKey, JSON.stringify(result), { EX: cacheTtl });

      logger.info('Bugs searched', {
        query: query,
        projectId: projectId,
        total: result.total,
        returned: result.bugs.length,
      });

      return result;
    } catch (error) {
      logger.error('Error searching bugs', {
        error: error.message,
        query: query,
      });
      throw error;
    }
  }

  /**
   * 获取项目的 BUG 统计
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 统计数据
   */
  async getStats(projectId) {
    try {
      // 尝试从 Redis 缓存获取
      const cacheKey = `stats:${projectId}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Stats cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      // 从数据库查询
      const stats = await this.bugRepository.getStats(projectId);

      // 缓存结果 (1 小时)
      const cacheTtl = parseInt(process.env.CACHE_TTL_PROJECT || '3600');
      await this.redis.set(cacheKey, JSON.stringify(stats), { EX: cacheTtl });

      logger.info('Stats retrieved', {
        projectId: projectId,
        total: stats.total || 0,
      });

      return stats;
    } catch (error) {
      logger.error('Error getting stats', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 更新 BUG 解决方案
   *
   * @param {string} bugId - BUG ID
   * @param {Object} solutionData - 解决方案数据
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 更新后的 BUG
   */
  async updateSolution(bugId, solutionData, projectId) {
    try {
      // 验证 BUG 存在
      const bug = await this.getBugById(bugId, projectId);

      // 验证状态转换
      const validStatuses = ['open', 'investigating', 'resolved', 'duplicate'];
      if (!validStatuses.includes(solutionData.status)) {
        throw new ValidationError('Invalid status', {
          field: 'status',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        });
      }

      // 更新 BUG
      const updateData = {
        status: solutionData.status,
        solution: {
          fix: solutionData.fix || bug.solution?.fix || '',
          preventionTips: solutionData.preventionTips || bug.solution?.preventionTips || [],
          rootCause: solutionData.rootCause || bug.solution?.rootCause || '',
          updatedAt: new Date(),
        },
      };

      const updatedBug = await this.bugRepository.updateBug(bugId, updateData);

      // 清理缓存
      await this.invalidateSearchCache(projectId);
      await this.invalidateStatsCache(projectId);

      logger.info('Bug solution updated', {
        bugId: bugId,
        status: solutionData.status,
        projectId: projectId,
      });

      return updatedBug;
    } catch (error) {
      logger.error('Error updating solution', {
        error: error.message,
        bugId: bugId,
      });
      throw error;
    }
  }

  /**
   * 获取项目的所有 BUG
   *
   * @param {string} projectId - 项目 ID
   * @param {number} limit - 返回数量
   * @param {number} offset - 偏移量
   * @returns {Promise<{bugs: Array, total: number}>} BUG 列表
   */
  async getBugsByProject(projectId, limit = 10, offset = 0) {
    try {
      return await this.bugRepository.getBugsByProject(projectId, limit, offset);
    } catch (error) {
      logger.error('Error getting bugs by project', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 清理搜索缓存
   *
   * @param {string} projectId - 项目 ID
   */
  async invalidateSearchCache(projectId) {
    try {
      // 清理所有与该项目相关的搜索缓存
      // 这是一个简化的实现，生产环境可能需要更复杂的缓存管理
      const keys = await this.redis.keys(`search:*${projectId}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug('Search cache invalidated', { projectId: projectId, count: keys.length });
      }
    } catch (error) {
      logger.warn('Error invalidating search cache', {
        error: error.message,
      });
      // 不抛出错误，缓存失效不应该影响业务逻辑
    }
  }

  /**
   * 清理统计缓存
   *
   * @param {string} projectId - 项目 ID
   */
  async invalidateStatsCache(projectId) {
    try {
      const cacheKey = `stats:${projectId}`;
      await this.redis.del(cacheKey);
      logger.debug('Stats cache invalidated', { projectId: projectId });
    } catch (error) {
      logger.warn('Error invalidating stats cache', {
        error: error.message,
      });
      // 不抛出错误，缓存失效不应该影响业务逻辑
    }
  }
}

module.exports = { BugService };