// test-db-connection.js
require('dotenv/config');
process.env.MONGODB_URI = 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
process.env.MONGODB_DATABASE = 'buger';

const { connectDB, getDB } = require('./src/config/database.js');
const mongoose = require('mongoose');

// 设置日志级别为debug
process.env.LOG_LEVEL = 'debug';

const logger = require('./src/utils/logger.js');

async function testDBConnection() {
  try {
    console.log('Environment variables:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
    
    logger.info('Testing database connection...');
    console.log('Calling connectDB...');
    await connectDB();
    logger.info('✓ Database connected successfully');
    console.log('Database connection successful');
    
    const db = getDB();
    console.log('Database name:', db.name);
    
    // Test collection access
    const projects = db.collection('projects');
    console.log('Counting documents...');
    const count = await projects.countDocuments();
    console.log(`Found ${count} projects in database`);
    
    process.exit(0);
  } catch (error) {
    console.error('Database connection test failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testDBConnection();