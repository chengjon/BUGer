// scripts/init-mongo.js
/**
 * MongoDB 初始化脚本
 * 创建集合、索引和基础数据
 */

// 切换到目标数据库
db = db.getSiblingDB('buger');

// 创建 bugs 集合（如果不存在）
db.createCollection('bugs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['bugId', 'projectId', 'errorCode', 'title', 'severity', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        bugId: { bsonType: 'string', description: 'Unique bug identifier' },
        projectId: { bsonType: 'string', description: 'Project identifier' },
        errorCode: { bsonType: 'string', description: 'Error code' },
        title: { bsonType: 'string', description: 'Bug title' },
        message: { bsonType: 'string', description: 'Error message' },
        severity: {
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Severity level',
        },
        stackTrace: { bsonType: 'string', description: 'Stack trace' },
        context: { bsonType: 'object', description: 'Additional context' },
        occurrences: { bsonType: 'int', description: 'Number of occurrences' },
        status: {
          enum: ['open', 'investigating', 'resolved', 'duplicate'],
          description: 'Resolution status',
        },
        solution: {
          bsonType: 'object',
          properties: {
            fix: { bsonType: 'string' },
            preventionTips: { bsonType: 'array' },
            updatedBy: { bsonType: 'string' },
            updatedAt: { bsonType: 'date' },
          },
        },
        createdAt: { bsonType: 'date', description: 'Creation timestamp' },
        updatedAt: { bsonType: 'date', description: 'Last update timestamp' },
      },
    },
  },
});

// 创建索引
db.bugs.createIndex({ bugId: 1 }, { unique: true });
db.bugs.createIndex({ projectId: 1, createdAt: -1 });
db.bugs.createIndex({ errorCode: 1 });
db.bugs.createIndex({ severity: 1 });
db.bugs.createIndex({ status: 1 });
db.bugs.createIndex({ title: 'text', message: 'text' });

// 创建 projects 集合
db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['projectId', 'apiKey', 'name'],
      properties: {
        _id: { bsonType: 'objectId' },
        projectId: { bsonType: 'string', description: 'Unique project identifier' },
        apiKey: { bsonType: 'string', description: 'API key for authentication' },
        name: { bsonType: 'string', description: 'Project name' },
        rateLimit: { bsonType: 'int', description: 'Request rate limit per minute' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.projects.createIndex({ projectId: 1 }, { unique: true });
db.projects.createIndex({ apiKey: 1 }, { unique: true });

// 创建 solutions 集合
db.createCollection('solutions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['bugId'],
      properties: {
        _id: { bsonType: 'objectId' },
        bugId: { bsonType: 'string', description: 'Reference to bug' },
        status: { enum: ['pending', 'verified', 'deprecated'] },
        fix: { bsonType: 'string', description: 'Solution description' },
        preventionTips: { bsonType: 'array' },
        codeExample: { bsonType: 'string' },
        updatedBy: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

db.solutions.createIndex({ bugId: 1 });
db.solutions.createIndex({ status: 1 });

// 插入示例数据
db.projects.insertOne({
  projectId: 'test-project',
  apiKey: 'sk_test_xyz123',
  name: 'Test Project',
  rateLimit: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
});

print('✓ MongoDB initialization completed');
print('✓ Collections created: bugs, projects, solutions');
print('✓ Indexes created');
print('✓ Sample data inserted');
