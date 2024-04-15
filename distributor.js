import { WebSocketServer, WebSocket } from 'ws';

//  json like obj for testing
export const resources = {
    'market-data': {
        'TSE': {
            'Sony': {
                ltp: 0,
                ltq: 0,
                open: 0,
                high: 0,
                low: 0,
            }
        }
    },
};

export const subs = {};  // MAP { 'market-data/TSE/Sony': Set { ip1, ip2, ip3 } }
export const ads = {};   // MAP { 'ip1': Set { regex1, regex2, regex3 } }

export const parseMessage = message => {
    const [command, topic, fields] = message.trim().split(':');
    const parsedMessage = { command, topic, keys: [], values: [] };
    fields?.split(',').forEach(entry => {
        const [key, value] = entry.split('=');
        parsedMessage.keys.push(key);
        parsedMessage.values.push(value);
    });
    return parsedMessage;
};
export const genEndpoints = (topic, keys) => keys.map(key => `${topic}/${key}`);

export const saveSub = (endpoint, ip) => {
    subs[endpoint] = subs[endpoint] ? subs[endpoint].add(ip) : new Set([ip]);
    console.log('%s has subscribed to %s', ip, endpoint);
};

export const deleteSub = (endpoint, ip) => {
    if (!subs[endpoint] || !subs[endpoint].delete(ip)) {
        throw new Error(`err:you_have_not_subscribed_to_${endpoint}_yet`);
    }
    console.log('%s has unsubscribed from %s', ip, endpoint);
};

export const saveAd = (topicRegex, ip) => {
    ads[ip] = ads[ip] ? ads[ip].add(topicRegex) : new Set([topicRegex]);
    console.log('%s has advertised for %s', ip, topicRegex);
};

export const deleteAd = (topicRegex, ip) => {
    if(!ads[ip] || !ads[ip].delete(topicRegex)) {
        throw new Error(`err:you_have_not_advertised_for_${topicRegex}_yet`);
    }
    console.log('%s has advertised for %s', ip, topicRegex);
};

export const writeValue = (topic, key, value, ip) => {
    if (!ads[ip]){
        throw new Error(`err:you_are_not_a_valid_publisher_for_${topic}`);
    };
    let acc = false;
    ads[ip].forEach(regex => {
        if (new RegExp(regex).test(topic)) {
            acc = true;
            return;
        }
    });
    if (!acc){
        throw new Error(`err:you_are_not_a_valid_publisher_for_${topic}`);
    };
    let ref = resources;
    topic.split('/').forEach(segment => {
        if (!ref[segment]) ref[segment] = {};
        ref = ref[segment];
    });
    ref[key] = value;
    console.log('%s has published new data for %s', ip, `${topic}/${key}`);
    return `${topic}/${key}=${value}`;
};

// Create a WebSocket server
const wss = new WebSocketServer({ port: 8080 });
console.log('WebSocket server is running on port 8080');

// Event listener for new connections
wss.on('connection', (ws, req) => {
    const ip = req.connection.remoteAddress;
    console.log('Lets welcome our new guest: ', ip);
    // Event listener for incoming messages
    // message examples: 
    // adv:market-data/TSE/.*  
    // sub:market-data/TSE/Sony:ltp,ltq,open,high,low
    // pub:market-data/TSE/Sony:ltp=13335,ltq=500,open=13475,high=13535,low=13290
    ws.on('message', data => {  
        console.log('Received message:', data.toString());
        const {command, topic, keys, values} = parseMessage(data.toString());
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
                    genEndpoints(topic, keys).forEach(endpoint => {
                        saveSub(endpoint, ip);
                        responseData.push(endpoint);
                    });      
                    ws.send(`sub:${responseData.join(',')}`);
                    break;
                case 'pub':
                    // publish
                    const endpoints = genEndpoints(topic, keys);
                    keys.forEach((key, index) => {
                        responseData.push(writeValue(topic, key, values[index], ip));
                        if (subs[endpoints[index]]) {
                            wss.clients.forEach(c => {
                                // broadcast to all subscribers
                                if (c.readyState === WebSocket.OPEN && subs[endpoints[index]].has(c._socket.remoteAddress)) {
                                    console.log('Sending data to: ', c._socket.remoteAddress);
                                    c.send(`pub:${topic}:${key}=${values[index]}`);
                                }
                            });
                        }
                    });
                    ws.send(`pub:${responseData.join(',')}`);
                    console.log('Resources: ', JSON.stringify(resources, null, 2));
                    break;
                case 'unadv':
                    // unadvertise
                    deleteAd(topic, ip);
                    ws.send(`unadv:${topic}`);
                    break;
                case 'unsub':
                    // unsubscribe
                    genEndpoints(topic, keys).forEach(endpoint => {
                        deleteSub(endpoint, ip);
                        responseData.push(endpoint);
                    });    
                    ws.send(`unsub:${responseData.join(',')}`);
                    break;
                default:
                    console.log('Unknown command: ', command);
                    ws.send('err:unknown_command:supported_commands=adv,sub,pub,unadv,unsub');
            }
        } catch (error) {
            ws.send(error.message);
        }
    });
    
    // Event listener for connection close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

