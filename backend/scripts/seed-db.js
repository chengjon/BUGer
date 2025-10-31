/**
 * 填充测试数据脚本
 * 为开发和测试创建样本数据
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buger';

async function seedDatabase() {
  try {
    console.log('🌱 开始填充测试数据...');

    // 连接数据库
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
    });

    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;
    const projectsCollection = db.collection('projects');
    const bugsCollection = db.collection('bugs');

    // 清空现有数据（可选）
    const projectCount = await projectsCollection.countDocuments();
    const bugCount = await bugsCollection.countDocuments();

    if (projectCount > 0 || bugCount > 0) {
      console.log(`\n⚠️  已存在 ${projectCount} 个项目和 ${bugCount} 个 BUG`);
      console.log('📝 是否要清空并重新填充数据？(在 scripts 中修改代码来启用此功能)');
      return;
    }

    // 创建测试项目
    console.log('\n📝 创建测试项目...');
    const projects = [
      {
        projectId: 'proj_test_001',
        apiKey: 'sk_test_xyz123456789abcdef',
        name: '测试项目 1',
        description: '用于开发和测试的示例项目',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: 'proj_demo_001',
        apiKey: 'sk_demo_abc987654321fedcba',
        name: '演示项目',
        description: '系统演示项目',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await projectsCollection.insertMany(projects);
    console.log(`✅ 已创建 ${projects.length} 个测试项目`);

    // 创建测试 BUG
    console.log('\n📝 创建测试 BUG...');
    const bugs = [
      {
        bugId: `BUG-${new Date().toISOString().split('T')[0]}-001`,
        projectId: 'proj_test_001',
        errorCode: 'PAYMENT_TIMEOUT',
        title: '支付超时',
        message: '用户在支付过程中遇到超时错误',
        severity: 'critical',
        status: 'open',
        occurrences: 5,
        context: { userId: 123, amount: 99.99 },
        solution: null,
        createdAt: new Date(Date.now() - 86400000 * 7),
        updatedAt: new Date(Date.now() - 86400000 * 7),
      },
      {
        bugId: `BUG-${new Date().toISOString().split('T')[0]}-002`,
        projectId: 'proj_test_001',
        errorCode: 'DATABASE_ERROR',
        title: '数据库连接错误',
        message: '无法连接到主数据库',
        severity: 'high',
        status: 'investigating',
        occurrences: 3,
        context: { database: 'primary', retries: 5 },
        solution: null,
        createdAt: new Date(Date.now() - 86400000 * 3),
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        bugId: `BUG-${new Date().toISOString().split('T')[0]}-003`,
        projectId: 'proj_test_001',
        errorCode: 'API_TIMEOUT',
        title: 'API 响应缓慢',
        message: '某些 API 端点响应超过 10 秒',
        severity: 'medium',
        status: 'resolved',
        occurrences: 8,
        context: { endpoint: '/api/users', avgTime: 12000 },
        solution: {
          description: '优化了数据库查询和添加了缓存',
          preventionTips: ['使用 Redis 缓存', '优化 MongoDB 索引'],
          resolvedAt: new Date(Date.now() - 86400000),
        },
        createdAt: new Date(Date.now() - 86400000 * 14),
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        bugId: `BUG-${new Date().toISOString().split('T')[0]}-004`,
        projectId: 'proj_demo_001',
        errorCode: 'AUTH_FAILED',
        title: '认证失败',
        message: '用户认证模块间歇性失败',
        severity: 'high',
        status: 'open',
        occurrences: 2,
        context: { authType: 'oauth', provider: 'google' },
        solution: null,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        bugId: `BUG-${new Date().toISOString().split('T')[0]}-005`,
        projectId: 'proj_demo_001',
        errorCode: 'MEMORY_LEAK',
        title: '内存泄漏',
        message: '应用运行一段时间后内存不断增加',
        severity: 'critical',
        status: 'investigating',
        occurrences: 1,
        context: { process: 'worker', uptime: 86400 },
        solution: null,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 2),
      },
    ];

    await bugsCollection.insertMany(bugs);
    console.log(`✅ 已创建 ${bugs.length} 个测试 BUG`);

    // 统计信息
    console.log('\n📊 数据库统计:');
    console.log(`   - 项目总数: ${await projectsCollection.countDocuments()}`);
    console.log(`   - BUG 总数: ${await bugsCollection.countDocuments()}`);

    const projectStats = await projectsCollection
      .aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();
    console.log('   - 项目状态分布:', projectStats);

    const bugStats = await bugsCollection
      .aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ])
      .toArray();
    console.log('   - BUG 严重级别分布:', bugStats);

    console.log('\n✨ 数据填充完成！');

  } catch (error) {
    console.error('❌ 数据填充失败:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

// 运行脚本
seedDatabase();
