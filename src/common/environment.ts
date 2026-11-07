import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Environment variables injected by the host take precedence over local .env values.
if (existsSync('.env')) loadEnvFile('.env');
