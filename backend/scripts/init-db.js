/**
 * 初始化数据库脚本
 * 创建集合、索引和初始数据
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

// 从环境变量获取数据库连接信息
const MONGODB_URI = 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
const MONGODB_DATABASE = 'buger';

console.log('🔧 数据库初始化配置:');
console.log(`   MONGODB_URI: ${MONGODB_URI}`);
console.log(`   MONGODB_DATABASE: ${MONGODB_DATABASE}`);

console.log('🔧 数据库初始化配置:');
console.log(`   MONGODB_URI: ${MONGODB_URI}`);
console.log(`   MONGODB_DATABASE: ${MONGODB_DATABASE}`);

async function initializeDatabase() {
  try {
    console.log('🔧 开始初始化数据库...');

    // 连接数据库
    console.log('🔗 正在连接数据库...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DATABASE,
      maxPoolSize: 20,
      minPoolSize: 5,
    });

    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;

    // 创建 bugs 集合
    console.log('📝 创建 bugs 集合...');
    try {
      await db.createCollection('bugs', {
        capped: false,
      });
      console.log('✅ bugs 集合创建成功');
    } catch (err) {
      if (err.code === 48) {
        console.log('⚠️  bugs 集合已存在，跳过创建');
      } else {
        throw err;
      }
    }

    // 创建 projects 集合
    console.log('📝 创建 projects 集合...');
    try {
      await db.createCollection('projects');
      console.log('✅ projects 集合创建成功');
    } catch (err) {
      if (err.code === 48) {
        console.log('⚠️  projects 集合已存在，跳过创建');
      } else {
        throw err;
      }
    }

    // 创建索引
    console.log('🔍 创建数据库索引...');

    const bugsCollection = db.collection('bugs');

    // bugs 集合索引
    await bugsCollection.createIndex({ projectId: 1, createdAt: -1 });
    console.log('✅ 已创建 projectId + createdAt 复合索引');

    await bugsCollection.createIndex({ errorCode: 1 });
    console.log('✅ 已创建 errorCode 索引');

    await bugsCollection.createIndex({ severity: 1 });
    console.log('✅ 已创建 severity 索引');

    await bugsCollection.createIndex({ status: 1 });
    console.log('✅ 已创建 status 索引');

    // 全文搜索索引
    try {
      await bugsCollection.createIndex({ title: 'text', message: 'text', errorCode: 'text' });
      console.log('✅ 已创建全文搜索索引');
    } catch (err) {
      if (err.code === 85) {
        console.log('⚠️  全文搜索索引已存在，跳过创建');
      } else {
        throw err;
      }
    }

    const projectsCollection = db.collection('projects');

    // projects 集合索引
    await projectsCollection.createIndex({ projectId: 1 }, { unique: true });
    console.log('✅ 已创建 projectId 唯一索引');

    await projectsCollection.createIndex({ apiKey: 1 }, { unique: true });
    console.log('✅ 已创建 apiKey 唯一索引');

    console.log('\n✨ 数据库初始化完成！');
    console.log('\n📊 集合统计:');
    console.log(`   - bugs: ${await bugsCollection.countDocuments()} 条记录`);
    console.log(`   - projects: ${await projectsCollection.countDocuments()} 条记录`);

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ 已断开数据库连接');
  }
}

// 运行脚本
initializeDatabase();