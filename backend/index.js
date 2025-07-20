const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomId => Set of clients

wss.on('connection', (ws) => {
    let currentRoom = null;
    let username = '';

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error('Invalid message:', message);
            return;
        }

        const { type, roomId, payload } = data;

        switch (type) {
            case 'join':
                if (!/^\d{6}$/.test(roomId)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room ID must be a 6-digit number' }));
                    return;
                }
                currentRoom = roomId;
                username = payload.username;
                if (!rooms[roomId]) {
                    rooms[roomId] = new Set();
                }
                rooms[roomId].add(ws);
                console.log(`Client ${username} joined room: ${roomId}`);
                rooms[roomId].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'signal',
                            payload: { type: 'new-peer', peerId: generatePeerId(), username }
                        }));
                    }
                });
                break;

            case 'signal':
                if (rooms[currentRoom]) {
                    rooms[currentRoom].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'signal',
                                payload: { ...payload, username }
                            }));
                        }
                    });
                }
                break;

            default:
                console.log('Unknown type:', type);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            if (rooms[currentRoom].size === 0) {
                delete rooms[currentRoom];
            }
            console.log(`Client ${username} left room: ${currentRoom}`);
        }
    });
});

function generatePeerId() {
    return Math.random().toString(36).substr(2, 9);
}

server.listen(PORT, () => {
    console.log(`WebSocket signaling server running on port ${PORT}`);
});
