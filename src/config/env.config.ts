/**
 * Centralized environment variable configuration
 * 
 * This module automatically decides which .env file to load:
 * - In test context: loads .env.test
 * - In production/development: loads .env
 * 
 * Should only be imported ONCE at the start of the application.
 * Other modules should import this file to ensure environment
 * variables are loaded.
 */

import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Variable to avoid loading multiple times
let envLoaded = false;

function isTestEnvironment(): boolean {
  if (process.env.JEST_WORKER_ID !== undefined) {
    return true;
  }

  if ((process.env.NODE_ENV || '').toLowerCase() === 'test') {
    return true;
  }

  return process.argv.some((arg) => arg.includes('jest') || arg.includes('test'));
}

function resolveEnvFile(): string | undefined {
  const rootDir = process.cwd();

  if (isTestEnvironment()) {
    const testEnv = path.join(rootDir, '.env.test');
    if (existsSync(testEnv)) {
      return testEnv;
    }
  }

  const defaultEnv = path.join(rootDir, '.env');
  if (existsSync(defaultEnv)) {
    return defaultEnv;
  }

  const fallbackTestEnv = path.join(rootDir, '.env.test');
  if (existsSync(fallbackTestEnv)) {
    return fallbackTestEnv;
  }

  return undefined;
}

export function loadEnvironmentVariables(): void {
  if (envLoaded) {
    return;
  }

  const envFile = resolveEnvFile();

  if (envFile) {
    dotenv.config({ path: envFile });
  }

  envLoaded = true;
}

/**
 * Forces reload of environment variables
 * Useful only in very specific cases (tests, etc.)
 */
export function reloadEnvironmentVariables(): void {
  envLoaded = false;
  loadEnvironmentVariables();
}

// Automatically load when importing the module
loadEnvironmentVariables();

