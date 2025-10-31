// src/repositories/bugRepository.js
const logger = require('../utils/logger.js');

/**
 * BUG 数据仓库
 * 处理 BUG 相关的数据库操作
 */
class BugRepository {
  constructor(db) {
    this.db = db;
    this.collection = null;
  }

  /**
   * 初始化仓库
   */
  async initialize() {
    try {
      this.collection = this.db.collection('bugs');
      logger.info('BugRepository initialized');
    } catch (error) {
      logger.error('Failed to initialize BugRepository', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 创建 BUG
   *
   * @param {Object} bugData - BUG 数据
   * @returns {Promise<Object>} 创建的 BUG
   */
  async createBug(bugData) {
    try {
      logger.debug('Creating bug in repository', {
        bugData: bugData,
      });
      
      const insertData = {
        ...bugData,
        occurrences: 1,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      logger.debug('Insert data', {
        insertData: insertData,
      });

      const result = await this.collection.insertOne(insertData);

      logger.info('Bug created', {
        bugId: bugData.bugId,
        projectId: bugData.projectId,
        insertedId: result.insertedId,
      });

      return { ...bugData, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating bug', {
        error: error.message,
        stack: error.stack,
        bugId: bugData.bugId,
        projectId: bugData.projectId,
        errorName: error.name,
        errorCode: error.code,
      });
      throw error;
    }
  }

  /**
   * 通过 ID 获取 BUG
   *
   * @param {string} bugId - BUG ID
   * @returns {Promise<Object|null>} BUG 对象或 null
   */
  async getBugById(bugId) {
    try {
      return await this.collection.findOne({ bugId: bugId });
    } catch (error) {
      logger.error('Error fetching bug by ID', {
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
   * @param {number} limit - 返回数量限制
   * @param {number} offset - 偏移量
   * @returns {Promise<{bugs: Array, total: number}>} 搜索结果
   */
  async searchBugs(query, filters = {}, limit = 10, offset = 0) {
    try {
      // 构建查询条件
      const searchQuery = {
        $text: { $search: query },
        ...filters,
      };

      // 获取总数
      const total = await this.collection.countDocuments(searchQuery);

      // 获取搜索结果
      const bugs = await this.collection
        .find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .skip(offset)
        .limit(limit)
        .toArray();

      logger.debug('Bugs searched', {
        query: query,
        total: total,
        returned: bugs.length,
        filters: Object.keys(filters),
      });

      return { bugs, total };
    } catch (error) {
      logger.error('Error searching bugs', {
        error: error.message,
        query: query,
      });
      throw error;
    }
  }

  /**
   * 更新 BUG
   *
   * @param {string} bugId - BUG ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的 BUG 或 null
   */
  async updateBug(bugId, updateData) {
    try {
      const result = await this.collection.findOneAndUpdate(
        { bugId: bugId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (result.value) {
        logger.info('Bug updated', { bugId: bugId });
      }

      return result.value;
    } catch (error) {
      logger.error('Error updating bug', {
        error: error.message,
        bugId: bugId,
      });
      throw error;
    }
  }

  /**
   * 增加 BUG 出现次数
   *
   * @param {string} bugId - BUG ID
   * @returns {Promise<Object|null>} 更新后的 BUG 或 null
   */
  async incrementOccurrences(bugId) {
    try {
      const result = await this.collection.findOneAndUpdate(
        { bugId: bugId },
        {
          $inc: { occurrences: 1 },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after' }
      );

      return result.value;
    } catch (error) {
      logger.error('Error incrementing occurrences', {
        error: error.message,
        bugId: bugId,
      });
      throw error;
    }
  }

  /**
   * 增加 BUG 出现次数并更新数据
   *
   * @param {string} bugId - BUG ID
   * @param {Object} updateData - 更新数据（如context、message、stackTrace）
   * @returns {Promise<Object|null>} 更新后的 BUG 或 null
   */
  async updateBugWithOccurrence(bugId, updateData) {
    try {
      const result = await this.collection.findOneAndUpdate(
        { bugId: bugId },
        {
          $inc: { occurrences: 1 },
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (result.value) {
        logger.info('Bug updated with occurrence increment', {
          bugId: bugId,
          occurrences: result.value.occurrences,
        });
      }

      return result.value;
    } catch (error) {
      logger.error('Error updating bug with occurrence', {
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
   * @param {number} limit - 返回数量限制
   * @param {number} offset - 偏移量
   * @returns {Promise<{bugs: Array, total: number}>} BUG 列表
   */
  async getBugsByProject(projectId, limit = 10, offset = 0) {
    try {
      const query = { projectId: projectId };

      const total = await this.collection.countDocuments(query);

      const bugs = await this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      return { bugs, total };
    } catch (error) {
      logger.error('Error fetching bugs by project', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取统计信息
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object>} 统计数据
   */
  async getStats(projectId) {
    try {
      const stats = await this.collection
        .aggregate([
          { $match: { projectId: projectId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              critical: {
                $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] },
              },
              high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
              medium: {
                $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] },
              },
              low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
              resolved: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
              },
              open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
              investigating: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray();

      return stats[0] || {};
    } catch (error) {
      logger.error('Error getting stats', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }
}

module.exports = { BugRepository };