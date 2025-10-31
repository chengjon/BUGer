// src/utils/generator.js
const { v4: uuidv4 } = require('uuid');

/**
 * 生成 BUG ID
 * 格式: BUG-YYYYMMDD-XXXXXX
 *
 * @returns {string} 生成的 BUG ID
 */
function generateBugId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = uuidv4().substring(0, 6).toUpperCase();
  return `BUG-${dateStr}-${randomStr}`;
}

/**
 * 生成项目 ID
 * 格式: proj_XXXXXXXX
 *
 * @returns {string} 生成的项目 ID
 */
function generateProjectId() {
  return `proj_${uuidv4().substring(0, 8)}`;
}

/**
 * 生成 API Key
 * 格式: sk_XXXXXXXXXXXXXXXX
 *
 * @returns {string} 生成的 API Key
 */
function generateApiKey() {
  return `sk_${uuidv4().replace(/-/g, '')}`.substring(0, 32);
}

/**
 * 生成请求 ID
 * 用于跟踪请求日志
 *
 * @returns {string} 生成的请求 ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 解析 BUG ID 获取日期
 *
 * @param {string} bugId - BUG ID
 * @returns {Date|null} 解析的日期或 null
 */
function parseBugIdDate(bugId) {
  try {
    const parts = bugId.split('-');
    if (parts.length !== 3) return null;

    const dateStr = parts[1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));

    return new Date(year, month - 1, day);
  } catch (error) {
    return null;
  }
}

/**
 * 验证 BUG ID 格式
 *
 * @param {string} bugId - BUG ID
 * @returns {boolean} 是否有效
 */
function isValidBugId(bugId) {
  const pattern = /^BUG-\d{8}-[A-Z0-9]{6}$/;
  return pattern.test(bugId);
}

/**
 * 生成时间戳字符串
 *
 * @param {Date} date - 日期对象
 * @returns {string} ISO 8601 格式的时间戳
 */
function generateTimestamp(date = new Date()) {
  return date.toISOString();
}

module.exports = {
  generateBugId,
  generateProjectId,
  generateApiKey,
  generateRequestId,
  parseBugIdDate,
  isValidBugId,
  generateTimestamp,
};
