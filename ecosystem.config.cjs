module.exports = {
  apps: [
    // 1. FRONTEND STATIC SERVER (Port 3000)
    {
      name: "web-app",
      script: "static-server.cjs",
      cwd: "./", // Start in the root directory where static-server.cjs is
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        // The static-server.cjs script correctly uses process.env.PORT || 3000
        // We will ensure it uses 3000 by not setting PORT here.
      },
    },

    // 2. BACKEND API CLUSTER (Port 5000)
    {
      name: "goroomz-backend",
      script: "server.js",
      cwd: "./backend", // Start in the backend directory
      instances: "max",
      exec_mode: "cluster",
      watch: true,
    },
  ],
};