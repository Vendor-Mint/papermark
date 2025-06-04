module.exports = {
  apps: [
    {
      name: 'papermark',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 3006
      },
      watch: true,
      autorestart: true,
      max_memory_restart: '2G',
      instances: 1,
      exec_mode: 'fork',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      time: true
    }
  ]
}
