const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./db');

// 1. Create HTTP server wrapping Express app
const server = http.createServer(app);

// 2. Initialize Socket.io with strict CORS
const io = new Server(server, {
  cors: {
    origin: env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 3. Attach io instance to express app so it can be retrieved via req.app.get('io') in controllers
app.set('io', io);

// 4. Socket.io client connection handling
io.on('connection', (socket) => {
  console.log(`⚡ [Socket.io] Real-time client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [Socket.io] Client disconnected: ${socket.id} (${reason})`);
  });
});

const httpServer = server.listen(env.PORT, async () => {
  console.log(`====================================================`);
  console.log(`🛡️  Cryptographic Digital Evidence Vault API`);
  console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`🔒 Allowed Client Origin: ${env.CLIENT_ORIGIN}`);
  console.log(`⚡ Socket.io Real-Time Engine Active`);
  console.log(`====================================================`);

  // Optional: Verify DB connection on startup
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`📦 Database connection verified at: ${res.rows[0].now}`);
  } catch (err) {
    console.warn(`⚠️ Warning: Database connection failed during startup (${err.message}). Check DATABASE_URL.`);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP and Socket.io server');
  server.close(async () => {
    console.log('HTTP & Socket.io server closed');
    await pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP and Socket.io server');
  server.close(async () => {
    console.log('HTTP & Socket.io server closed');
    await pool.end();
    process.exit(0);
  });
});


