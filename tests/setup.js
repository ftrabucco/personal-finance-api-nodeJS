// Test setup file
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
