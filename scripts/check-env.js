#!/usr/bin/env node

require('dotenv').config();

console.log('Environment Variables Check:');
console.log('==========================');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);