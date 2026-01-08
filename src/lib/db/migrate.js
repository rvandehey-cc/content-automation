/**
 * @fileoverview Database migration utilities
 * @author Content Automation Team
 */

import { execSync } from 'child_process';

/**
 * Run Prisma migrations
 * @param {Object} options - Migration options
 * @param {boolean} options.reset - Whether to reset the database first
 * @returns {Promise<void>}
 */
export async function runMigrations(options = {}) {
  try {
    if (options.reset) {
      console.log('🔄 Resetting database...');
      execSync('npx prisma migrate reset --force --skip-seed', { 
        stdio: 'inherit',
        env: process.env 
      });
    } else {
      console.log('🔄 Running database migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: process.env 
      });
    }
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Create a new migration
 * @param {string} name - Migration name
 * @returns {Promise<void>}
 */
export async function createMigration(name) {
  try {
    console.log(`🔄 Creating migration: ${name}...`);
    execSync(`npx prisma migrate dev --name ${name}`, { 
      stdio: 'inherit',
      env: process.env 
    });
    console.log('✅ Migration created successfully');
  } catch (error) {
    console.error('❌ Migration creation failed:', error.message);
    throw error;
  }
}

/**
 * Generate Prisma Client
 * @returns {Promise<void>}
 */
export async function generatePrismaClient() {
  try {
    console.log('🔄 Generating Prisma Client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: process.env 
    });
    console.log('✅ Prisma Client generated successfully');
  } catch (error) {
    console.error('❌ Prisma Client generation failed:', error.message);
    throw error;
  }
}
