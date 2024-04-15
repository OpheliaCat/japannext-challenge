const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

const feeders = new Set();
const clients = new Set();

// Event listener for new connections
wss.on('connection', (ws, req) => {
    // Get the client socket address
    const ip = req.socket.remoteAddress;
    console.log('Client socket address:', ip);
    // Event listener for incoming messages
    // message examples: 
    // adv:market-data/TSE/.*  
    // sub:market-data/TSE/Sony:ltp,ltq,open,high,low
    // pub:market-data/TSE/Sony:ltp=13335,ltq=500,open=13475,high=13535,low=13290
    ws.on('message', ({ data, origin }) => {  
        console.log('Received message:', data, 'from', origin);
        [command, topic, data] = String(data).split(':');
        topic = String(data).substring(String(data).indexOf(':')+1);
        switch (command) {
            case 'adv':
                // advertise
                console.log('Advertise:', topic);
                feeders.add(ip);
                break;
            case 'sub':
                // subscribe
                console.log('Subscribe:', topic);
                clients.add(ip);
                break;
            case 'pub':
                // publish
                feeders.add(ip);
                dataPairs = String(data).split(':')[-1].split(',');
                if (!data) {
                    break;
                }
                break;
            default:
                console.log('Unknown command:', command);
        }
        // Send a response back to the client
        ws.send('Incorrect message format. Please use adv:topic, sub:topic, or pub:topic:data');
    });
    
    // Event listener for connection close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
    });
}, 20000);

console.log('WebSocket server is running on port 8080');