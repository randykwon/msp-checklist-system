module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '/opt/msp-checklist/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist/logs/msp-main-error.log',
      out_file: '/opt/msp-checklist/logs/msp-main-out.log',
      log_file: '/opt/msp-checklist/logs/msp-main-combined.log',
      time: true
    },
    {
      name: 'msp-admin',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist/logs/msp-admin-error.log',
      out_file: '/opt/msp-checklist/logs/msp-admin-out.log',
      log_file: '/opt/msp-checklist/logs/msp-admin-combined.log',
      time: true
    }
  ]
};