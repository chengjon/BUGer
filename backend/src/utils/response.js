// src/utils/response.js
/**
 * 成功响应格式化
 *
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP 状态码
 * @returns {Object} 格式化的响应对象
 */
function successResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    statusCode: statusCode,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 错误响应格式化
 *
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {number} statusCode - HTTP 状态码
 * @param {*} details - 错误详情
 * @returns {Object} 格式化的错误响应对象
 */
function errorResponse(
  message = 'Error',
  code = 'INTERNAL_ERROR',
  statusCode = 500,
  details = null
) {
  return {
    success: false,
    statusCode: statusCode,
    message: message,
    code: code,
    details: details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 分页响应格式化
 *
 * @param {Array} items - 数据项数组
 * @param {number} total - 总数
 * @param {number} limit - 每页数量
 * @param {number} offset - 偏移量
 * @param {string} message - 响应消息
 * @returns {Object} 格式化的分页响应对象
 */
function paginatedResponse(
  items,
  total,
  limit,
  offset,
  message = 'Success'
) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    success: true,
    message: message,
    data: {
      items: items,
      pagination: {
        total: total,
        limit: limit,
        offset: offset,
        currentPage: currentPage,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建响应中间件
 * 为 res 对象添加响应方法
 *
 * @returns {Function} 中间件函数
 */
function createResponseMiddleware() {
  return (req, res, next) => {
    /**
     * 发送成功响应
     */
    res.sendSuccess = function (data, message = 'Success', statusCode = 200) {
      return res.status(statusCode).json(successResponse(data, message, statusCode));
    };

    /**
     * 发送错误响应
     */
    res.sendError = function (
      message = 'Error',
      code = 'INTERNAL_ERROR',
      statusCode = 500,
      details = null
    ) {
      return res.status(statusCode).json(errorResponse(message, code, statusCode, details));
    };

    /**
     * 发送分页响应
     */
    res.sendPaginated = function (items, total, limit, offset, message = 'Success') {
      return res.status(200).json(paginatedResponse(items, total, limit, offset, message));
    };

    next();
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createResponseMiddleware,
};
