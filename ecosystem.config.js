module.exports = {
  apps: [
    {
      name: 'goroomz-backend',
      script: './backend/server.js',
      cwd: '/var/www/goroomz',
      instances: 2, // Use 2 instances for better performance (or 'max' for all CPU cores)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false, // Set to true only in development
      ignore_watch: ['node_modules', 'logs', '.git'],
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'goroomz-alert-scheduler',
      script: './backend/jobs/alertScheduler.js',
      cwd: '/var/www/goroomz',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/alert-scheduler-error.log',
      out_file: './logs/alert-scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_memory_restart: '200M',
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      watch: false
    },
    {
      name: 'goroomz-reminder-scheduler',
      script: './backend/jobs/reminderScheduler.js',
      cwd: '/var/www/goroomz',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/reminder-scheduler-error.log',
      out_file: './logs/reminder-scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_memory_restart: '200M',
      cron_restart: '0 */12 * * *', // Restart every 12 hours
      watch: false
    }
  ]
};

