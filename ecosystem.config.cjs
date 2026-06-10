// PM2 process manager config
// Usage:
//   pm2 start ecosystem.config.cjs         (start)
//   pm2 reload ecosystem.config.cjs        (zero-downtime reload)
//   pm2 save && pm2 startup                 (auto-start on VPS reboot)
//   pm2 logs sambid-api                     (live logs)
//   pm2 monit                               (dashboard)

module.exports = {
  apps: [
    {
      name:        'sambid-api',
      script:      'server.js',
      cwd:         '/var/www/sambid/backend',
      instances:   1,
      exec_mode:   'fork',
      interpreter: 'node',

      env_production: {
        NODE_ENV: 'production',
        PORT:     8000,
      },

      // Logs
      error_file:    './logs/error.log',
      out_file:      './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs:    true,

      // Auto-restart
      autorestart:   true,
      restart_delay: 3000,
      max_restarts:  10,
      watch:         false,

      // Memory limit — restart if backend leaks above 512MB
      max_memory_restart: '512M',
    }
  ]
};
