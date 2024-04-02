const express = require('express');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const formatMessage = require('../utils/messages');

// Initialize Express Router
const router = express.Router();

// Define helper functions
function formatPrivateMessage(sender, text) {
    return {
        sender,
        text,
        time: moment().format('h:mm a'),
        isPrivate: true,
    };
}

function findSocketByUsername(io, username) {
    const lowercaseUsername = username.toLowerCase();
    for (const [socketId, socket] of io.sockets.sockets.entries()) {
        const user = users[socketId];
        if (user && user.username.toLowerCase() === lowercaseUsername) {
            return socket;
        }
    }
    return null;
}

// Define API routes
router.post('/join-room', (req, res) => {
    const { username, room } = req.body;
    // Generate unique user ID
    const userId = uuidv4();
    // Store user details
    users[userId] = { username, room };
    userStatus[userId] = 'online';
    res.status(200).send({ userId });
});

router.post('/send-message', (req, res) => {
    const { userId, message } = req.body;
    const { username, room } = users[userId];
    // Emit message to room
    io.to(room).emit('message', formatMessage(username, message));
    res.status(200).send({ success: true });
});

router.post('/send-private-message', (req, res) => {
    const { userId, recipient, message } = req.body;
    const sender = users[userId].username;
    const recipientSocket = findSocketByUsername(io, recipient);
    if (recipientSocket) {
        recipientSocket.emit('message', formatPrivateMessage(sender, message));
        res.status(200).send({ success: true });
    } else {
        res.status(404).send({ error: 'Recipient not found or offline' });
    }
});

router.get('/room-users', (req, res) => {
    const { room } = req.query;
    const roomUsers = Object.values(users).filter((user) => user.room === room);
    res.status(200).send({ roomUsers });
});

// Export router
module.exports = router;
