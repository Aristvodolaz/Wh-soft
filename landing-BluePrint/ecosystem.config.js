// ──────────────────────────────────────────────────────────
//  PM2 Ecosystem Config — Склад-Софт Landing
//  Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/
//
//  Quick commands:
//    pm2 start ecosystem.config.js --env production
//    pm2 reload ecosystem.config.js --env production
//    pm2 stop sklad-soft-landing
//    pm2 logs sklad-soft-landing
//    pm2 monit
// ──────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      // ── Identity ───────────────────────────────────────
      name: "sklad-soft-landing",
      script: "node_modules/.bin/next",
      args: "start",

      // ── Clustering ─────────────────────────────────────
      // "max" = one process per CPU core; use a number for manual control
      instances: "max",
      exec_mode: "cluster",

      // ── Restart policy ─────────────────────────────────
      watch: false,                 // don't watch files in production
      max_memory_restart: "512M",   // restart if RAM exceeds this
      restart_delay: 3000,          // ms to wait before restart
      max_restarts: 10,             // give up after N crashes in a row
      min_uptime: "10s",            // must run 10s before "started"

      // ── Logs ───────────────────────────────────────────
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,             // single log across all cluster workers

      // ── Environment — Development ───────────────────────
      env: {
        NODE_ENV: "development",
        PORT: 3020,
      },

      // ── Environment — Production ────────────────────────
      env_production: {
        NODE_ENV: "production",
        PORT: 3020,

        // ▸ CHANGE THESE before going live ◂
        ADMIN_TOKEN: "CHANGE_ME_STRONG_SECRET_32_CHARS",  // for GET /api/subscribe

        // Optional: add your own vars here
        // SMTP_HOST: "smtp.yandex.ru",
        // SMTP_USER: "noreply@wms-platform.ru",
        // SMTP_PASS: "...",
      },
    },
  ],

  // ──────────────────────────────────────────────────────
  //  Deployment config (pm2 deploy)
  //  Usage: pm2 deploy ecosystem.config.js production setup
  //         pm2 deploy ecosystem.config.js production
  // ──────────────────────────────────────────────────────
  deploy: {
    production: {
      user: "ubuntu",                                // SSH user on server
      host: ["YOUR_SERVER_IP"],                      // server IP or hostname
      ref: "origin/main",                            // git branch to deploy
      repo: "git@github.com:YOUR_ORG/sklad-soft-landing.git",
      path: "/var/www/sklad-soft-landing",                  // deployment path on server

      // Run once when `pm2 deploy ... setup` is called
      "pre-setup": "apt-get install git -y",

      // Run on every deploy
      "post-deploy":
        "npm ci --production=false && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save",

      // Environment variables injected during deploy
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
