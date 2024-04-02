const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

const botName = "Bot";

const users = {};
const userStatus = {};

function formatPrivateMessage(sender, text) {
  return {
    sender,
    text,
    time: moment().format('h:mm a'),
    isPrivate: true,
  };
}

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    users[socket.id] = { username, room };
    userStatus[socket.id] = 'online';

    socket.join(room);

    socket.emit("message", formatMessage(botName, "Welcome to chat!"));

    socket.broadcast
      .to(room)
      .emit("message", formatMessage(botName, `${username} has joined the chat`));

    io.to(room).emit("roomUsers", {
      room,
      users: getRoomUsers(room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  socket.on('privateMessage', ({ recipient, message }) => {
    const sender = users[socket.id].username;
    const recipientSocket = findSocketByUsername(recipient);

    if (recipientSocket) {
      recipientSocket.emit('message', formatPrivateMessage(sender, message));
      socket.emit('message', formatMessage(sender, message));
    } else {
      socket.emit('message', formatMessage('chat Bot', 'User is not online.'));
    }
  });

  function findSocketByUsername(username) {
    const lowercaseUsername = username.toLowerCase();

    // Iterate through all connected sockets
    for (const [socketId, socket] of io.sockets.sockets.entries()) {
      const user = users[socketId];
      if (user && user.username.toLowerCase() === lowercaseUsername) {
        return socket;
      }
    }
    return null;
  }


  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      delete users[socket.id];
      userStatus[socket.id] = 'offline';

      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

function getRoomUsers(room) {
  return Object.values(users).filter((user) => user.room === room);
}

// Define API routes
app.post('/api/chat/join-room', (req, res) => {
  const { username, room } = req.body;
  const userId = uuidv4();
  users[userId] = { username, room };
  userStatus[userId] = 'online';
  res.status(200).send({ userId });
});

app.post('/api/chat/send-message', (req, res) => {
  const { userId, message } = req.body;
  const { username, room } = users[userId];
  // Emit message to room
  io.to(room).emit('message', formatMessage(username, message));
  res.status(200).send({ success: true });
});

app.post('/api/chat/send-private-message', (req, res) => {
  const { userId, recipient, message } = req.body;
  const sender = users[userId].username;
  const recipientSocket = findSocketByUsername(recipient);
  if (recipientSocket) {
    recipientSocket.emit('message', formatPrivateMessage(sender, message));
    res.status(200).send({ success: true });
  } else {
    res.status(404).send({ error: 'Recipient not found or offline' });
  }
});

app.get('/api/chat/room-users', (req, res) => {
  const { room } = req.query;
  const roomUsers = Object.values(users).filter((user) => user.room === room);
  res.status(200).send({ roomUsers });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
// Export app for testing
