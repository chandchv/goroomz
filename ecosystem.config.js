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
    }
  ]
};

