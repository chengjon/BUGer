// scripts/migrate-add-project-fields.js
const { MongoClient } = require('mongodb');

/**
 * 数据迁移脚本：为已有的BUG记录添加project_name和project_root字段
 *
 * 使用方法：
 * node scripts/migrate-add-project-fields.js
 */

async function migrateData() {
  const uri = process.env.MONGODB_URI || 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ 已连接到MongoDB');

    const db = client.db('buger');
    const collection = db.collection('bugs');

    // 统计需要迁移的BUG数量
    const totalCount = await collection.countDocuments({
      'context.project': 'mystocks',
      'context.project_name': { $exists: false }
    });

    console.log(`\n📊 发现 ${totalCount} 条需要迁移的BUG记录`);

    if (totalCount === 0) {
      console.log('✅ 没有需要迁移的数据');
      return;
    }

    // 为mystocks项目的所有BUG添加新字段
    const result = await collection.updateMany(
      {
        'context.project': 'mystocks',
        'context.project_name': { $exists: false }
      },
      {
        $set: {
          'context.project_name': 'MyStocks',
          'context.project_root': '/opt/claude/mystocks_spec'
        }
      }
    );

    console.log('\n✅ 迁移完成！');
    console.log(`   - 匹配条件: context.project = 'mystocks'`);
    console.log(`   - 更新了 ${result.modifiedCount} 条BUG记录`);
    console.log(`   - 新增字段: project_name = 'MyStocks'`);
    console.log(`   - 新增字段: project_root = '/opt/claude/mystocks_spec'`);

    // 验证迁移结果
    const sampleBug = await collection.findOne(
      { 'context.project': 'mystocks' },
      { projection: { 'context.project_name': 1, 'context.project_root': 1, bugId: 1 } }
    );

    console.log('\n🔍 验证迁移结果（样本数据）:');
    console.log(JSON.stringify(sampleBug, null, 2));

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ MongoDB连接已关闭');
  }
}

// 执行迁移
migrateData()
  .then(() => {
    console.log('\n🎉 数据迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 数据迁移脚本执行失败:', error);
    process.exit(1);
  });
