const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

try {
  require('./src/config/firebase');
} catch (error) {
  console.warn('Firebase no disponible, continuando sin notificaciones push');
}

const app = require('./src/app');
const connectDB = require('./src/config/db');
const http = require('http');
const socketIo = require('socket.io');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (data) => {
      const { role, userId } = data;
      if (role === 'bodega') {
        socket.join('bodega');
        console.log(`User ${socket.id} joined bodega room`);
      } else if (role === 'repartidor') {
        socket.join('repartidor');
        socket.join(`repartidor_${userId}`);
        console.log(`User ${socket.id} joined repartidor room and repartidor_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Make io available in routes/controllers
  app.set('io', io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
