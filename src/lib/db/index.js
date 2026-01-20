/**
 * @fileoverview Database utilities export
 * @author Content Automation Team
 */

export { prisma, connectDatabase, disconnectPrisma } from './client.js';
export { runMigrations, createMigration, generatePrismaClient } from './migrate.js';

