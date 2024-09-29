const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        try {
            const task = JSON.parse(message); 
            console.log(`Parsed task: ${JSON.stringify(task)}`);

            if (task.action === 'add') {
                console.log(`Adding new task: ${task.text}`);
            } else if (task.action === 'update') {
                console.log(`Updating task state: ${task.id}, checked: ${task.checked}`);
            } else if (task.action === 'delete') {
                console.log(`Deleting task: ${task.id}`);
            } else if (task.action === 'drag') {
                //console.log(`Dragging element with ID: ${task.id} to position ( ${task.posY})`);
            } else if (task.action === 'draggingEnded') {
                console.log('Dragging ended');
            }

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(task)); 
                }
            });
        } catch (e) {
            console.error("Failed to parse message from client:", e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on ws://localhost:8080');