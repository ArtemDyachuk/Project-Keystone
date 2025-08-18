#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { URL } from 'url';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const COMPOSE_FILE = 'infra/docker-compose.yml';

/**
 * Check if Redis URL points to localhost
 */
function isLocalRedis(url: string): boolean {
   try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
   } catch {
      return false;
   }
}

/**
 * Check if Docker is available
 */
function isDockerAvailable(): boolean {
   try {
      execSync('docker --version', { stdio: 'ignore' });
      return true;
   } catch {
      return false;
   }
}

/**
 * Check if Redis container is healthy
 */
function isRedisHealthy(): boolean {
   try {
      const result = execSync('docker compose -f infra/docker-compose.yml ps --format json redis', {
         encoding: 'utf-8'
      });

      if (!result.trim()) {
         return false; // Container doesn't exist
      }

      const container = JSON.parse(result);
      return container.Health === 'healthy' || container.State === 'running';
   } catch {
      return false;
   }
}

/**
 * Start Redis container
 */
async function startRedis(): Promise<void> {
   console.log('🔄 Starting Redis container...');

   try {
      execSync(`docker compose -f ${COMPOSE_FILE} up -d redis`, {
         stdio: 'inherit'
      });
   } catch (error) {
      throw new Error(`Failed to start Redis container: ${error}`);
   }

   // Wait for health check
   console.log('⏳ Waiting for Redis to become healthy...');

   for (let i = 0; i < 30; i++) { // Wait up to 30 seconds
      if (isRedisHealthy()) {
         console.log('✅ Redis is healthy and ready');
         return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
   }

   throw new Error('❌ Redis failed to become healthy within 30 seconds');
}

/**
 * Test Redis connectivity directly
 */
function testRedisConnection(): boolean {
   try {
      execSync('redis-cli ping', { stdio: 'ignore' });
      return true;
   } catch {
      return false;
   }
}

async function main() {
   console.log('🔍 Checking Redis infrastructure...');

   // Check if we need to manage Redis
   if (!isLocalRedis(REDIS_URL)) {
      console.log(`ℹ️  Redis URL (${REDIS_URL}) is not localhost - skipping container management`);
      return;
   }

   // Check if Docker is available
   if (!isDockerAvailable()) {
      console.log('⚠️  Docker is not available. Please install Docker or run Redis manually:');
      console.log('   brew install redis && brew services start redis');
      console.log('   or download from: https://redis.io/download');
      return; // Exit 0 - not a hard failure
   }

   // Check if Redis is already healthy
   if (isRedisHealthy()) {
      console.log('✅ Redis container is already healthy');
      return;
   }

   // Check if Redis is running locally without Docker
   if (testRedisConnection()) {
      console.log('✅ Redis is running locally (non-Docker)');
      return;
   }

   // Start Redis container
   try {
      await startRedis();
   } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
   }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
   console.log('\n👋 Shutting down...');
   process.exit(0);
});

process.on('SIGTERM', () => {
   console.log('\n👋 Shutting down...');
   process.exit(0);
});

main().catch((error) => {
   console.error('❌ Failed to setup Redis infrastructure:', error);
   process.exit(1);
});
