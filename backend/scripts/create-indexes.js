// scripts/create-indexes.js
const { MongoClient } = require('mongodb');

/**
 * 创建推荐的数据库索引
 *
 * 使用方法：
 * node scripts/create-indexes.js
 */

async function createIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ 已连接到MongoDB\n');

    const db = client.db('buger');
    const collection = db.collection('bugs');

    console.log('📊 创建推荐的索引...\n');

    // 1. projectId + errorCode 复合索引（用于快速查找重复BUG）
    try {
      await collection.createIndex(
        { projectId: 1, errorCode: 1 },
        { name: 'projectId_1_errorCode_1', background: true }
      );
      console.log('   ✅ 创建索引: projectId_1_errorCode_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('   ℹ️  索引已存在: projectId_1_errorCode_1');
      } else {
        throw error;
      }
    }

    // 2. context.project_name 索引（用于分层查询策略）
    try {
      await collection.createIndex(
        { 'context.project_name': 1 },
        { name: 'context.project_name_1', background: true }
      );
      console.log('   ✅ 创建索引: context.project_name_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('   ℹ️  索引已存在: context.project_name_1');
      } else {
        throw error;
      }
    }

    // 3. context.component 索引（用于按组件查询）
    try {
      await collection.createIndex(
        { 'context.component': 1 },
        { name: 'context.component_1', background: true }
      );
      console.log('   ✅ 创建索引: context.component_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('   ℹ️  索引已存在: context.component_1');
      } else {
        throw error;
      }
    }

    // 4. updatedAt 索引（用于归档查询）
    try {
      await collection.createIndex(
        { updatedAt: 1 },
        { name: 'updatedAt_1', background: true }
      );
      console.log('   ✅ 创建索引: updatedAt_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('   ℹ️  索引已存在: updatedAt_1');
      } else {
        throw error;
      }
    }

    // 5. status + updatedAt 复合索引（用于归档查询优化）
    try {
      await collection.createIndex(
        { status: 1, updatedAt: 1 },
        { name: 'status_1_updatedAt_1', background: true }
      );
      console.log('   ✅ 创建索引: status_1_updatedAt_1');
    } catch (error) {
      if (error.code === 85) {
        console.log('   ℹ️  索引已存在: status_1_updatedAt_1');
      } else {
        throw error;
      }
    }

    console.log('\n📋 当前所有索引:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ 索引创建完成！');

  } catch (error) {
    console.error('❌ 创建索引失败:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB连接已关闭\n');
  }
}

createIndexes()
  .then(() => {
    console.log('🎉 索引管理脚本执行完成\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 索引管理脚本执行失败:', error);
    process.exit(1);
  });
