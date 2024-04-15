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
    return endpoint;
};

const deleteSub = (topic, key, ws) => {
    const endpoint = `${topic}/${key}`;
    if (!subs[endpoint] || !subs[endpoint].delete(ws)) {
        throw new Error(`err:you_have_not_subscribed_to_${endpoint}_yet`);
    }
    console.log('%s has unsubscribed from %s: ', ws._socket.remoteAddress, endpoint);
    return endpoint;
};

const saveAd = (topicRegex, ip) => {
    ads[ip] = ads[ip] ? ads[ip].add(topicRegex) : new Set([topicRegex]);
    console.log('%s has advertised for %s: ', ip, topicRegex);
};

const deleteAd = (topicRegex, ip) => {
    if(!ads[ip] || !ads[ip].delete(topicRegex)) {
        throw new Error(`err:you_have_not_advertised_for_${topicRegex}_yet`);
    }
    console.log('%s has advertised for %s: ', ip, topicRegex);
};

const writeValue = (topic, key, value, ip) => {
    endpoint = `${topic}/${key}`;
    if (!ads[ip] || !ads[ip].reduce((acc, regex) => acc || new RegExp(regex).test(endpoint), false)){
        throw new Error(`err:you_are_not_a_valid_publisher_for_${endpoint}`);
    };
    let ref = resources;
    topic.split('/').forEach(segment => {
        if (!ref[segment]) ref[segment] = {};
        ref = ref[segment];
    });
    if (!ref[key]) throw new Error(`err:${key}_is_not_a_valid_key`);
    ref[key] = value;
    console.log('%s has published new data for %s: ', ip, endpoint);
    console.log('Resources: ', JSON.stringify(resources, null, 2));
    return `${endpoint}=${value}`;
};

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Event listener for new connections
wss.on('connection', (ws, req) => {
    const ip = req.connection.remoteAddress;
    console.log('Lets welcome our new guest: ', ip);
    // Event listener for incoming messages
    // message examples: 
    // adv:market-data/TSE/.*  
    // sub:market-data/TSE/Sony:ltp,ltq,open,high,low
    // pub:market-data/TSE/Sony:ltp=13335,ltq=500,open=13475,high=13535,low=13290
    ws.on('message', ({ data }) => {  
        console.log('Received message:', data);
        const [command, topic, dataPairs] = String(data).trim().split(':');
        const responseData = [];

        try {
            switch (command) {
                case 'adv':
                    // advertise
                    saveAd(topic, ip);
                    ws.send(`adv:${topic}`);
                    break;
                case 'sub':
                    // subscribe
                    dataPairs.split(',').forEach(key => {
                        responseData.push(saveSub(topic, key, ws));
                    });
                    ws.send(`sub:${responseData.join(',')}`);
                    break;
                case 'pub':
                    // publish
                    dataPairs.split(',').forEach(pair => {
                        const [key, value] = pair.split('='); // [ltp, 13335]
                        responseData.push(writeValue(topic, key, value, ip));
                        if (subs.has(endpoint)) {
                            subs[endpoint].forEach(client => {
                                if (client.readyState === WebSocket.OPEN) client.send(`pub:${topic}:${pair}`);
                            });
                        }
                    });
                    ws.send(`pub:${responseData.join(',')}`);
                    break;
                case 'unadv':
                    // unadvertise
                    deleteAd(topic, ip);
                    ws.send(`unadv:${topic}`);
                    break;
                case 'unsub':
                    // unsubscribe
                    dataPairs.split(',').forEach(key => {
                        responseData.push(deleteSub(topic, key, ws));
                    });
                    ws.send(`unsub:${responseData.join(',')}`);
                    break;
                default:
                    console.log('Unknown command: ', command);
                    ws.send('err:unknown_command:supported_commands=adv,sub,pub,unadv,unsub');
            }
            // Send a response back to the client
            ws.send('Incorrect message format. Please use adv:topic, sub:topic, or pub:topic:data');
        } catch (error) {
            ws.send(`err:${error.message}`);
        }
    });
    
    // Event listener for connection close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on port 8080');