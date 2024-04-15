import { parseMessage, genEndpoints, saveSub, subs } from "./distributor.js";
import assert from 'assert';
// mock ip address
const ip = 'localhost';

// Test parsing a message
let message = 'sub:market-data/TSE/Sony:price';
const parsedMessage = parseMessage(message);
// Assert that the message is parsed correctly
if (assert(parsedMessage.command === 'sub' && parsedMessage.topic === 'market-data/TSE/Sony' && parsedMessage.keys[0] === 'price')) {
    console.log('Test failed: parseMessage');
}
console.log(parsedMessage);

// Test saving a subscription
saveSub(genEndpoints(parsedMessage.topic, parsedMessage.keys)[0], ip);
// Assert that the subscription is saved correctly
if (assert(subs['market-data/TSE/Sony/price'].has(ip))) {
    console.log('Test failed: saveSub');
}
console.log(subs);