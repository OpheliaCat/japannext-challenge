const WebSocket = require('ws');

//  json like obj for testing
const resources = {
    'market-data': {
        'TSE': {
            'Sony': {
                ltp: 0 ,
                ltq: 0,
                open: 0,
                high: 0,
                low: 0,
            }
        }
    },
};

const ads = {};
const subs = {};

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

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
        const [command, topic, dataPairs] = String(data).trim().split(':');
        let endpoint = '';
    
        switch (command) {
            case 'adv':
                // advertise
                console.log('%s made an advertisemenmt for %s: ', ip, topic);
                ads[topic] = ads[topic] ? ads[topic].add(ws) : new Set([ws]);
                break;
            case 'sub':
                // subscribe
                dataPairs.split(',').forEach(pair => {
                    endpoint = `${topic}/${pair.split('=')[0]}`;
                    console.log('%s has subscribed to %s: ', ip, endpoint);
                    subs[endpoint] = subs[endpoint] ? subs[endpoint].add(ws) : new Set([ws]);
                });
                break;
            case 'pub':
                // publish
                console.log('Publish:', topic, dataPairs);
                dataPairs.split(',').forEach(pair => {
                    endpoint = `${topic}/${pair.split('=')[0]}`;
                    console.log('%s has published new data for %s: ', ip, endpoint);
                    if (endpoint in subs) {
                        subs[endpoint].forEach(client => {
                            if (client.readyState === WebSocket.OPEN) client.send(`pub:${topic}:${pair}`);
                        });
                    }
                });
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
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
    });
}, 20000);

console.log('WebSocket server is running on port 8080');