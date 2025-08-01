module.exports = {
  apps: [{
    name: 'line.setsq.com',
    script: 'npm',
    args: 'start',
    cwd: '/home/dhevin/line.setsq.com',

    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
