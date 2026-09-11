/**
 * TaskPulse Test Data Seeder
 *
 * Generates realistic synthetic task datasets (1k, 10k, 100k) for local development and load testing.
 * SAFETY GUARANTEE: Refuses to run if NODE_ENV is production or if production URI is detected.
 *
 * Usage:
 *   node scripts/seed-test-data.js --count=1000
 *   node scripts/seed-test-data.js --count=10000 --email=bench@taskpulse.io
 *   node scripts/seed-test-data.js --clear --email=bench@taskpulse.io
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/src/models/User');
const Todo = require('../server/src/models/Todo');

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'DevOps', 'Personal', 'Finance', 'Documentation'];
const PRIORITIES = ['low', 'medium', 'high'];
const SAMPLE_TITLES = [
  'Optimize MongoDB compound query indexes',
  'Implement k6 load testing pipeline in CI',
  'Review JWT expiration and refresh token rotation',
  'Deploy Nginx reverse proxy with gzip compression',
  'Refactor atomic todo update queries with findOneAndUpdate',
  'Sanitize search queries to prevent ReDoS attacks',
  'Add Docker healthcheck probes for container orchestration',
  'Configure Prometheus metrics endpoint for latency tracking',
  'Audit authorization checks against BOLA/IDOR vulnerabilities',
  'Profile Node.js event loop latency under concurrent load',
  'Upgrade frontend search input with debounced hook',
  'Set up GitHub Actions workflow for automated integration tests',
];

// Parse command-line arguments
const args = process.argv.slice(2).reduce((acc, curr) => {
  const [key, val] = curr.replace(/^--/, '').split('=');
  acc[key] = val !== undefined ? val : true;
  return acc;
}, {});

const COUNT = parseInt(args.count, 10) || 1000;
const EMAIL = (args.email || 'testuser@taskpulse.io').toLowerCase().trim();
const SHOULD_CLEAR = Boolean(args.clear);
const BATCH_SIZE = 2500;

async function runSeeder() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todoapp';

  // SAFETY CHECKS
  if (nodeEnv === 'production') {
    console.error('\n❌ [ABORTED] Refusing to seed database: NODE_ENV is set to "production".');
    process.exit(1);
  }

  if (mongoUri.includes('cluster') || mongoUri.includes('mongodb+srv') || mongoUri.includes('prod')) {
    console.error('\n❌ [ABORTED] Refusing to seed database: MONGO_URI appears to point to an external or production cluster.');
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log('🚀 TaskPulse Safe Test Data Seeder');
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Target URI:  ${mongoUri}`);
  console.log(`Target User: ${EMAIL}`);
  console.log(`Task Count:  ${COUNT}`);
  console.log('----------------------------------------------------');

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // Find or create test user
    let user = await User.findOne({ email: EMAIL });
    if (!user) {
      console.log(`ℹ️  Creating benchmark user: ${EMAIL}...`);
      user = await User.create({
        name: 'Benchmark User',
        email: EMAIL,
        passwordHash: 'BenchmarkPassword123!',
      });
      console.log(`✅ Benchmark user created with ID: ${user._id}`);
    } else {
      console.log(`ℹ️  Using existing user ID: ${user._id}`);
    }

    if (SHOULD_CLEAR) {
      const deleted = await Todo.deleteMany({ user: user._id });
      console.log(`🧹 Cleared ${deleted.deletedCount} existing tasks for ${EMAIL}.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`⏳ Generating and inserting ${COUNT.toLocaleString()} synthetic tasks in batches of ${BATCH_SIZE}...`);
    const startTime = Date.now();

    let totalInserted = 0;
    while (totalInserted < COUNT) {
      const currentBatchSize = Math.min(BATCH_SIZE, COUNT - totalInserted);
      const batch = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const titleIndex = (totalInserted + i) % SAMPLE_TITLES.length;
        const priorityIndex = (totalInserted + i) % PRIORITIES.length;
        const categoryIndex = (totalInserted + i) % CATEGORIES.length;

        const dueDaysOffset = ((totalInserted + i) % 30) - 10;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueDaysOffset);

        batch.push({
          user: user._id,
          title: `${SAMPLE_TITLES[titleIndex]} #${totalInserted + i + 1}`,
          description: `Synthetic benchmark task generated for load testing and performance profiling. Sequence: ${totalInserted + i + 1}`,
          completed: (totalInserted + i) % 3 === 0,
          priority: PRIORITIES[priorityIndex],
          category: CATEGORIES[categoryIndex],
          dueDate,
          createdAt: new Date(Date.now() - (totalInserted + i) * 60000),
          updatedAt: new Date(),
        });
      }

      await Todo.insertMany(batch, { ordered: false });
      totalInserted += currentBatchSize;
      process.stdout.write(`\r   Progress: ${totalInserted.toLocaleString()} / ${COUNT.toLocaleString()} tasks inserted...`);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\n🎉 Successfully seeded ${COUNT.toLocaleString()} tasks in ${durationSec}s!`);
    console.log(`Total user tasks in DB: ${await Todo.countDocuments({ user: user._id })}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from database cleanly.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed with error:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runSeeder();
