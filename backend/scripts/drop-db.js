/**
 * 清空数据库脚本
 * 删除所有集合和数据（开发环境使用）
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buger';

async function dropDatabase() {
  try {
    console.log('⚠️  即将清空数据库中的所有数据！');
    console.log('📌 此操作不可恢复，请谨慎操作！\n');

    // 连接数据库
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
    });

    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;

    // 获取所有集合
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 数据库中共有 ${collections.length} 个集合`);

    if (collections.length === 0) {
      console.log('ℹ️  数据库已为空，无需清空');
      return;
    }

    // 删除集合
    console.log('\n🗑️  开始删除集合...');
    for (const collection of collections) {
      if (!collection.name.startsWith('system.')) {
        await db.collection(collection.name).drop();
        console.log(`✅ 已删除集合: ${collection.name}`);
      }
    }

    console.log('\n✨ 数据库清空完成！');

  } catch (error) {
    console.error('❌ 清空数据库失败:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

// 运行脚本
dropDatabase();
