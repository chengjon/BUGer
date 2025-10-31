// scripts/db-health-check.js
const { MongoClient } = require('mongodb');

/**
 * BUGer 数据库健康检查工具
 *
 * 功能：
 * 1. 重复数据检测
 * 2. 数据完整性检查
 * 3. 合并建议分析
 * 4. 数据库统计
 * 5. 索引优化建议
 * 6. 历史数据归档建议
 *
 * 使用方法：
 * node scripts/db-health-check.js [--fix] [--merge] [--archive]
 *
 * 参数说明：
 * --fix: 自动修复检测到的问题
 * --merge: 执行合并操作（需要人工确认）
 * --archive: 归档90天前的已解决BUG
 */

class DatabaseHealthChecker {
  constructor() {
    this.uri = process.env.MONGODB_URI || 'mongodb://mongo:c790414J@localhost:27017/buger?authSource=admin';
    this.client = null;
    this.db = null;
    this.issues = {
      critical: [],
      warning: [],
      info: []
    };
    this.stats = {};
  }

  async connect() {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db('buger');
    console.log('✅ 已连接到MongoDB\n');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('\n✅ MongoDB连接已关闭');
    }
  }

  /**
   * 1. 检测完全重复的BUG记录
   */
  async checkDuplicates() {
    console.log('🔍 1. 检测重复数据...');
    const collection = this.db.collection('bugs');

    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: {
            projectId: '$projectId',
            errorCode: '$errorCode',
            title: '$title',
            message: '$message'
          },
          count: { $sum: 1 },
          ids: { $push: '$bugId' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log('   ✅ 未发现完全重复的BUG记录\n');
      return [];
    }

    console.log(`   ⚠️  发现 ${duplicates.length} 组完全重复的BUG记录`);
    duplicates.forEach((dup, index) => {
      console.log(`   - 组${index + 1}: ${dup.count}条重复 (errorCode: ${dup._id.errorCode})`);
      console.log(`     BUG IDs: ${dup.ids.join(', ')}`);
    });
    console.log('');

    this.issues.warning.push({
      type: 'DUPLICATE_BUGS',
      count: duplicates.length,
      data: duplicates
    });

    return duplicates;
  }

  /**
   * 2. 数据完整性检查
   */
  async checkDataIntegrity() {
    console.log('🔍 2. 检查数据完整性...');
    const collection = this.db.collection('bugs');

    const checks = {
      missingProjectName: await collection.countDocuments({
        'context.project_name': { $exists: false }
      }),
      missingProjectRoot: await collection.countDocuments({
        'context.project_root': { $exists: false }
      }),
      missingErrorCode: await collection.countDocuments({
        errorCode: { $exists: false }
      }),
      missingTitle: await collection.countDocuments({
        title: { $exists: false }
      }),
      missingMessage: await collection.countDocuments({
        message: { $exists: false }
      }),
      missingSeverity: await collection.countDocuments({
        severity: { $exists: false }
      }),
      invalidSeverity: await collection.countDocuments({
        severity: { $nin: ['critical', 'high', 'medium', 'low'] }
      }),
      invalidStatus: await collection.countDocuments({
        status: { $nin: ['open', 'investigating', 'resolved', 'duplicate'] }
      })
    };

    let hasIssues = false;
    Object.entries(checks).forEach(([key, count]) => {
      if (count > 0) {
        hasIssues = true;
        const severity = ['missingErrorCode', 'missingTitle', 'missingMessage'].includes(key) ? 'critical' : 'warning';
        console.log(`   ⚠️  ${key}: ${count} 条记录`);
        this.issues[severity].push({
          type: `INTEGRITY_${key.toUpperCase()}`,
          count: count
        });
      }
    });

    if (!hasIssues) {
      console.log('   ✅ 数据完整性检查通过');
    }
    console.log('');

    return checks;
  }

  /**
   * 3. 识别可合并的相似BUG
   */
  async findMergeCandidates() {
    console.log('🔍 3. 分析可合并的BUG...');
    const collection = this.db.collection('bugs');

    // 查找相同project+errorCode但有多条记录的BUG
    const candidates = await collection.aggregate([
      {
        $group: {
          _id: {
            projectId: '$projectId',
            errorCode: '$errorCode'
          },
          count: { $sum: 1 },
          totalOccurrences: { $sum: '$occurrences' },
          bugs: { $push: { bugId: '$bugId', title: '$title', occurrences: '$occurrences', createdAt: '$createdAt' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    if (candidates.length === 0) {
      console.log('   ✅ 未发现需要合并的BUG\n');
      return [];
    }

    console.log(`   💡 发现 ${candidates.length} 组可能需要合并的BUG：`);
    candidates.forEach((candidate, index) => {
      console.log(`   - 组${index + 1}: ${candidate.count}条记录，总出现次数: ${candidate.totalOccurrences}`);
      console.log(`     项目: ${candidate._id.projectId}, 错误码: ${candidate._id.errorCode}`);
      candidate.bugs.forEach(bug => {
        console.log(`     · ${bug.bugId} (出现${bug.occurrences}次, 创建于${new Date(bug.createdAt).toLocaleDateString()})`);
      });
    });
    console.log('\n   💡 建议: 使用 --merge 参数执行合并操作\n');

    this.issues.info.push({
      type: 'MERGE_CANDIDATES',
      count: candidates.length,
      data: candidates
    });

    return candidates;
  }

  /**
   * 4. 数据库统计分析
   */
  async gatherStatistics() {
    console.log('📊 4. 数据库统计分析...');
    const collection = this.db.collection('bugs');

    const stats = {
      total: await collection.countDocuments(),
      byProject: await collection.aggregate([
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),
      bySeverity: await collection.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]).toArray(),
      byStatus: await collection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      totalOccurrences: await collection.aggregate([
        { $group: { _id: null, total: { $sum: '$occurrences' } } }
      ]).toArray(),
      avgOccurrences: await collection.aggregate([
        { $group: { _id: null, avg: { $avg: '$occurrences' } } }
      ]).toArray(),
      oldestBug: await collection.findOne({}, { sort: { createdAt: 1 } }),
      newestBug: await collection.findOne({}, { sort: { createdAt: -1 } })
    };

    console.log(`   总BUG数: ${stats.total}`);
    console.log(`   总出现次数: ${stats.totalOccurrences[0]?.total || 0}`);
    console.log(`   平均出现次数: ${stats.avgOccurrences[0]?.avg?.toFixed(2) || 0}`);

    console.log('\n   按项目分布:');
    stats.byProject.forEach(item => {
      console.log(`     - ${item._id}: ${item.count} 条`);
    });

    console.log('\n   按严重程度分布:');
    stats.bySeverity.forEach(item => {
      console.log(`     - ${item._id || 'unknown'}: ${item.count} 条`);
    });

    console.log('\n   按状态分布:');
    stats.byStatus.forEach(item => {
      console.log(`     - ${item._id || 'unknown'}: ${item.count} 条`);
    });

    if (stats.oldestBug && stats.newestBug) {
      console.log(`\n   最早BUG: ${new Date(stats.oldestBug.createdAt).toLocaleString()}`);
      console.log(`   最新BUG: ${new Date(stats.newestBug.createdAt).toLocaleString()}`);
    }
    console.log('');

    this.stats = stats;
    return stats;
  }

  /**
   * 5. 索引健康检查
   */
  async checkIndexes() {
    console.log('🔍 5. 检查索引状态...');
    const collection = this.db.collection('bugs');

    const indexes = await collection.indexes();
    console.log(`   当前索引数量: ${indexes.length}`);

    const recommendedIndexes = [
      { name: 'projectId_1_errorCode_1', keys: { projectId: 1, errorCode: 1 } },
      { name: 'projectId_1_createdAt_-1', keys: { projectId: 1, createdAt: -1 } },
      { name: 'context.project_name_1', keys: { 'context.project_name': 1 } },
      { name: 'severity_1', keys: { severity: 1 } },
      { name: 'status_1', keys: { status: 1 } }
    ];

    console.log('\n   现有索引:');
    indexes.forEach(index => {
      console.log(`     - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n   推荐索引:');
    recommendedIndexes.forEach(recommended => {
      const exists = indexes.some(index => index.name === recommended.name);
      if (!exists) {
        console.log(`     ⚠️  缺少: ${recommended.name} ${JSON.stringify(recommended.keys)}`);
        this.issues.info.push({
          type: 'MISSING_INDEX',
          index: recommended
        });
      } else {
        console.log(`     ✅ 已存在: ${recommended.name}`);
      }
    });
    console.log('');

    return indexes;
  }

  /**
   * 6. 归档建议分析
   */
  async analyzeArchiveCandidates() {
    console.log('🔍 6. 分析归档候选数据...');
    const collection = this.db.collection('bugs');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const archiveCandidates = await collection.aggregate([
      {
        $match: {
          status: 'resolved',
          updatedAt: { $lt: ninetyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$projectId',
          count: { $sum: 1 },
          oldestUpdate: { $min: '$updatedAt' },
          newestUpdate: { $max: '$updatedAt' }
        }
      }
    ]).toArray();

    const totalArchivable = await collection.countDocuments({
      status: 'resolved',
      updatedAt: { $lt: ninetyDaysAgo }
    });

    if (totalArchivable === 0) {
      console.log('   ✅ 暂无需要归档的数据\n');
      return { total: 0, candidates: [] };
    }

    console.log(`   💡 发现 ${totalArchivable} 条可归档的已解决BUG (90天前已解决):\n`);
    archiveCandidates.forEach(candidate => {
      console.log(`   - 项目 ${candidate._id}: ${candidate.count} 条`);
      console.log(`     最早更新: ${new Date(candidate.oldestUpdate).toLocaleDateString()}`);
      console.log(`     最近更新: ${new Date(candidate.newestUpdate).toLocaleDateString()}`);
    });
    console.log('\n   💡 建议: 使用 --archive 参数执行归档操作\n');

    this.issues.info.push({
      type: 'ARCHIVE_CANDIDATES',
      count: totalArchivable,
      data: archiveCandidates
    });

    return { total: totalArchivable, candidates: archiveCandidates };
  }

  /**
   * 7. 自动修复问题
   */
  async autoFix() {
    console.log('🔧 执行自动修复...\n');
    const collection = this.db.collection('bugs');
    let fixCount = 0;

    // 修复缺失的默认值
    const fixMissingSeverity = await collection.updateMany(
      { severity: { $exists: false } },
      { $set: { severity: 'medium' } }
    );
    if (fixMissingSeverity.modifiedCount > 0) {
      console.log(`   ✅ 修复了 ${fixMissingSeverity.modifiedCount} 条缺失severity的记录`);
      fixCount += fixMissingSeverity.modifiedCount;
    }

    const fixInvalidSeverity = await collection.updateMany(
      { severity: { $nin: ['critical', 'high', 'medium', 'low'] } },
      { $set: { severity: 'medium' } }
    );
    if (fixInvalidSeverity.modifiedCount > 0) {
      console.log(`   ✅ 修复了 ${fixInvalidSeverity.modifiedCount} 条无效severity的记录`);
      fixCount += fixInvalidSeverity.modifiedCount;
    }

    const fixInvalidStatus = await collection.updateMany(
      { status: { $nin: ['open', 'investigating', 'resolved', 'duplicate'] } },
      { $set: { status: 'open' } }
    );
    if (fixInvalidStatus.modifiedCount > 0) {
      console.log(`   ✅ 修复了 ${fixInvalidStatus.modifiedCount} 条无效status的记录`);
      fixCount += fixInvalidStatus.modifiedCount;
    }

    const fixMissingOccurrences = await collection.updateMany(
      { occurrences: { $exists: false } },
      { $set: { occurrences: 1 } }
    );
    if (fixMissingOccurrences.modifiedCount > 0) {
      console.log(`   ✅ 修复了 ${fixMissingOccurrences.modifiedCount} 条缺失occurrences的记录`);
      fixCount += fixMissingOccurrences.modifiedCount;
    }

    if (fixCount === 0) {
      console.log('   ✅ 没有需要修复的问题\n');
    } else {
      console.log(`\n   总计修复: ${fixCount} 条记录\n`);
    }

    return fixCount;
  }

  /**
   * 8. 执行合并操作
   */
  async executeMerge() {
    console.log('🔧 执行BUG合并操作...\n');
    const collection = this.db.collection('bugs');

    const candidates = await this.findMergeCandidates();

    if (candidates.length === 0) {
      console.log('   ℹ️  没有需要合并的BUG\n');
      return 0;
    }

    let mergedCount = 0;

    for (const candidate of candidates) {
      // 保留最早创建的BUG，合并其他的occurrences
      const bugs = candidate.bugs.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      const primaryBug = bugs[0];
      const bugsToMerge = bugs.slice(1);

      console.log(`   合并 ${candidate._id.errorCode}:`);
      console.log(`     保留: ${primaryBug.bugId}`);
      console.log(`     合并: ${bugsToMerge.map(b => b.bugId).join(', ')}`);

      // 更新主BUG的occurrences
      await collection.updateOne(
        { bugId: primaryBug.bugId },
        {
          $inc: { occurrences: candidate.totalOccurrences - primaryBug.occurrences },
          $set: { updatedAt: new Date() }
        }
      );

      // 删除被合并的BUG
      for (const bug of bugsToMerge) {
        await collection.deleteOne({ bugId: bug.bugId });
      }

      mergedCount += bugsToMerge.length;
      console.log(`     ✅ 已合并 ${bugsToMerge.length} 条记录\n`);
    }

    console.log(`   总计合并: ${mergedCount} 条记录\n`);
    return mergedCount;
  }

  /**
   * 9. 执行归档操作
   */
  async executeArchive() {
    console.log('🔧 执行数据归档操作...\n');
    const collection = this.db.collection('bugs');
    const archiveCollection = this.db.collection('bugs_archive');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const bugsToArchive = await collection.find({
      status: 'resolved',
      updatedAt: { $lt: ninetyDaysAgo }
    }).toArray();

    if (bugsToArchive.length === 0) {
      console.log('   ℹ️  没有需要归档的数据\n');
      return 0;
    }

    console.log(`   归档 ${bugsToArchive.length} 条已解决的BUG...`);

    // 复制到归档集合
    if (bugsToArchive.length > 0) {
      await archiveCollection.insertMany(bugsToArchive.map(bug => ({
        ...bug,
        archivedAt: new Date()
      })));
    }

    // 从主集合删除
    const deleteResult = await collection.deleteMany({
      status: 'resolved',
      updatedAt: { $lt: ninetyDaysAgo }
    });

    console.log(`   ✅ 成功归档 ${deleteResult.deletedCount} 条记录到 bugs_archive 集合\n`);
    return deleteResult.deletedCount;
  }

  /**
   * 生成检查报告
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 健康检查报告');
    console.log('='.repeat(60) + '\n');

    if (this.issues.critical.length > 0) {
      console.log('🔴 严重问题 (需要立即处理):');
      this.issues.critical.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} 项`);
      });
      console.log('');
    }

    if (this.issues.warning.length > 0) {
      console.log('⚠️  警告问题 (建议处理):');
      this.issues.warning.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} 项`);
      });
      console.log('');
    }

    if (this.issues.info.length > 0) {
      console.log('💡 优化建议:');
      this.issues.info.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count || 1} 项`);
      });
      console.log('');
    }

    if (this.issues.critical.length === 0 &&
        this.issues.warning.length === 0 &&
        this.issues.info.length === 0) {
      console.log('✅ 数据库状态良好，无需处理的问题！\n');
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * 运行完整检查
   */
  async runFullCheck(options = {}) {
    try {
      await this.connect();

      console.log('🏥 BUGer 数据库健康检查开始...\n');
      console.log('='.repeat(60) + '\n');

      // 执行所有检查
      await this.checkDuplicates();
      await this.checkDataIntegrity();
      await this.findMergeCandidates();
      await this.gatherStatistics();
      await this.checkIndexes();
      await this.analyzeArchiveCandidates();

      // 根据参数执行操作
      if (options.fix) {
        await this.autoFix();
      }

      if (options.merge) {
        await this.executeMerge();
      }

      if (options.archive) {
        await this.executeArchive();
      }

      // 生成报告
      this.generateReport();

      // 提供操作建议
      if (!options.fix && (this.issues.critical.length > 0 || this.issues.warning.length > 0)) {
        console.log('💡 提示: 运行 node scripts/db-health-check.js --fix 自动修复检测到的问题\n');
      }

      if (!options.merge && this.issues.info.some(i => i.type === 'MERGE_CANDIDATES')) {
        console.log('💡 提示: 运行 node scripts/db-health-check.js --merge 合并重复的BUG记录\n');
      }

      if (!options.archive && this.issues.info.some(i => i.type === 'ARCHIVE_CANDIDATES')) {
        console.log('💡 提示: 运行 node scripts/db-health-check.js --archive 归档历史数据\n');
      }

    } catch (error) {
      console.error('❌ 健康检查失败:', error.message);
      console.error('详细错误:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// 主程序入口
async function main() {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    merge: args.includes('--merge'),
    archive: args.includes('--archive')
  };

  const checker = new DatabaseHealthChecker();

  try {
    await checker.runFullCheck(options);
    console.log('🎉 健康检查完成！\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { DatabaseHealthChecker };
