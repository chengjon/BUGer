// test-batch.js
const request = require('supertest');
// 确保环境变量正确设置
process.env.MONGODB_URI = 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
process.env.MONGODB_DATABASE = 'buger';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380';

const { connectDB, getDB } = require('./src/config/database.js');
const { connectRedis, getRedis } = require('./src/config/redis.js');
const { createApp } = require('./src/config/app.js');

async function testBatch() {
  try {
    console.log('Environment variables:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);

    // 确保数据库和Redis连接
    await connectDB();
    await connectRedis();
    
    const db = getDB();
    const redis = getRedis();
    const app = await createApp();

    console.log('App created successfully');
    
    // 测试数据
    const apiKey = 'sk_test_xyz123';
    const bugs = [
      {
        errorCode: 'DATABASE_ERROR',
        title: '数据库连接失败',
        message: 'Connection pool exhausted',
        severity: 'critical',
      },
      {
        errorCode: 'API_RATE_LIMIT',
        title: 'API 速率限制',
        message: 'Too many requests to external API',
        severity: 'high',
      },
    ];

    console.log('Sending batch request...');
    console.log('Request data:', JSON.stringify({ bugs }, null, 2));
    
    // 先测试单个bug创建
    console.log('\n--- Testing single bug creation ---');
    const singleBug = {
      errorCode: 'TEST_ERROR',
      title: '测试错误',
      message: 'Test error message',
      severity: 'critical',
    };
    
    const singleResponse = await request(app)
      .post('/api/bugs')
      .set('X-API-Key', apiKey)
      .send(singleBug);
      
    console.log('Single bug response status:', singleResponse.status);
    console.log('Single bug response body:', JSON.stringify(singleResponse.body, null, 2));
    
    // 再测试批处理
    console.log('\n--- Testing batch bug creation ---');
    const batchResponse = await request(app)
      .post('/api/bugs/batch')
      .set('X-API-Key', apiKey)
      .send({ bugs });
      
    console.log('Batch response status:', batchResponse.status);
    console.log('Batch response body:', JSON.stringify(batchResponse.body, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testBatch();