// src/repositories/projectRepository.js
const logger = require('../utils/logger.js');

/**
 * 项目数据仓库
 * 处理项目相关的数据库操作
 */
class ProjectRepository {
  constructor(db) {
    this.db = db;
    this.collection = null;
  }

  /**
   * 初始化仓库
   */
  async initialize() {
    try {
      this.collection = this.db.collection('projects');
      logger.info('ProjectRepository initialized');
    } catch (error) {
      logger.error('Failed to initialize ProjectRepository', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 通过 API Key 获取项目
   *
   * @param {string} apiKey - API Key
   * @returns {Promise<Object|null>} 项目对象或 null
   */
  async getProjectByApiKey(apiKey) {
    try {
      logger.debug('Querying project by API key', {
        apiKey: apiKey,
      });
      
      const project = await this.collection.findOne({ apiKey: apiKey });

      if (project) {
        logger.debug('Project found by API key', {
          projectId: project.projectId,
          apiKey: project.apiKey,
        });
      } else {
        logger.debug('Project not found for API key', {
          apiKey: apiKey,
        });
      }

      return project;
    } catch (error) {
      logger.error('Error fetching project by API key', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 通过项目 ID 获取项目
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Object|null>} 项目对象或 null
   */
  async getProjectById(projectId) {
    try {
      return await this.collection.findOne({ projectId: projectId });
    } catch (error) {
      logger.error('Error fetching project by ID', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 创建项目
   *
   * @param {Object} projectData - 项目数据
   * @returns {Promise<Object>} 创建的项目
   */
  async createProject(projectData) {
    try {
      const result = await this.collection.insertOne({
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info('Project created', {
        projectId: projectData.projectId,
        insertedId: result.insertedId,
      });

      return { ...projectData, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating project', {
        error: error.message,
        projectId: projectData.projectId,
      });
      throw error;
    }
  }

  /**
   * 更新项目
   *
   * @param {string} projectId - 项目 ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的项目或 null
   */
  async updateProject(projectId, updateData) {
    try {
      const result = await this.collection.findOneAndUpdate(
        { projectId: projectId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (result.value) {
        logger.info('Project updated', { projectId: projectId });
      }

      return result.value;
    } catch (error) {
      logger.error('Error updating project', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 删除项目
   *
   * @param {string} projectId - 项目 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteProject(projectId) {
    try {
      const result = await this.collection.deleteOne({
        projectId: projectId,
      });

      if (result.deletedCount > 0) {
        logger.info('Project deleted', { projectId: projectId });
      }

      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting project', {
        error: error.message,
        projectId: projectId,
      });
      throw error;
    }
  }

  /**
   * 获取所有项目
   *
   * @returns {Promise<Array>} 项目列表
   */
  async getAllProjects() {
    try {
      return await this.collection.find({}).toArray();
    } catch (error) {
      logger.error('Error fetching all projects', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = { ProjectRepository };