// index.js
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomId => Set of clients

wss.on('connection', (ws) => {
    let currentRoom = null;

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
                currentRoom = roomId;
                if (!rooms[roomId]) {
                    rooms[roomId] = new Set();
                }
                rooms[roomId].add(ws);
                console.log(`Client joined room: ${roomId}`);
                break;

            case 'signal':
                // Broadcast to all other peers in the same room
                if (rooms[currentRoom]) {
                    rooms[currentRoom].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'signal',
                                payload
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
            console.log(`Client left room: ${currentRoom}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket signaling server running on port ${PORT}`);
});
