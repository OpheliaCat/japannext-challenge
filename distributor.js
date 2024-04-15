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

const subs = {};  // MAP { 'market-data/TSE/Sony': Set { ws1, ws2, ws3 } }
const ads = {};   // MAP { 'ip1': Set { regex1, regex2, regex3 } }

const saveSub = (topic, key, ws) => {
    const endpoint = `${topic}/${key}`;
    subs[endpoint] = subs[endpoint] ? subs[endpoint].add(ws) : new Set([ws]);
    console.log('%s has subscribed to %s: ', ws._socket.remoteAddress, endpoint);
};

const saveAd = (topicRegex, ws) => {
    const ip = ws._socket.remoteAddress;
    ads[ip] = ads[ip] ? ads[ip].add(topicRegex) : new Set([topicRegex]);
    console.log('%s has advertised for %s: ', ip, topicRegex);
};

const writeValue = (topic, key, value) => {
    const ip = ws._socket.remoteAddress;
    endpoint = `${topic}/${key}`;
    if (!ads[ip] || !ads[ip].reduce((acc, regex) => acc || new RegExp(regex).test(endpoint), false)){
        return false;
    };
    console.log('%s has published new data for %s: ', ip, endpoint);
    let ref = resources;
    topic.split('/').forEach(segment => {
        ref = ref[segment];
    });
    ref[key] = value;
    return true;
};

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Event listener for new connections
wss.on('connection', ws => {
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
                saveAd(topic, ws);
                break;
            case 'sub':
                // subscribe
                dataPairs.split(',').forEach(pair => {
                    saveSub(topic, pair.split('=')[0], ws);
                });
                break;
            case 'pub':
                // publish
                dataPairs.split(',').forEach(pair => {
                    const [key, value] = pair.split('='); // [ltp, 13335]
                    if (!writeValue(topic, key, value)) {
                        ws.send(`err: not a valid publisher for ${endpoint}`);
                        return;
                    };
                    if (subs.has(endpoint)) {
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