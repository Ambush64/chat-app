const request = require('supertest');
const app = require('./server'); // Import your Express app

describe('API Tests', () => {
    let roomId;
    let userId;

    // Test for joining a room
    it('should join a room and return userId', async () => {
        const res = await request(app)
            .post('/api/chat/join-room')
            .send({ username: 'testuser', room: 'testroom' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('userId');
        userId = res.body.userId;
    });

    // Test for sending a message
    it('should send a message to the room', async () => {
        const res = await request(app)
            .post('/api/chat/send-message')
            .send({ userId, message: 'Test message' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });

    // Test for sending a private message
    it('should send a private message', async () => {
        const res = await request(app)
            .post('/api/chat/send-private-message')
            .send({ userId, recipient: 'recipient_username', message: 'Private message' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });

    // Test for getting room users
    it('should get room users', async () => {
        const res = await request(app)
            .get('/api/chat/room-users')
            .query({ room: 'testroom' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('roomUsers');
    });
});
