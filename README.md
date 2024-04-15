# Data Record Distribution Service

## Requirements
- 3 application types: `Distributor`, `Feeder`, `Client`
- Each application can be done in a different programming language, out of c, cpp, golang, rust, c#, java, js, node.js

### 1. Distributor
- The `Distributor` service routes messages from `Feeder(s)` to subscribed `Client(s)`
- The messages are data records identified by topics in the form `subtopic1/subtopic2/.../record_id` and the record payload is a map of property key:value pairs.
- The `Distributor` service accepts connections at a configurable port, and handles the following message types:
  - `Advertise`: Sent by `Feeder(s)` to advertise the topic regex(es) of the records they can provide
  - `Un-advertise`: Sent by `Feeder(s)` to cancel advertisement of topic regex(es) for the records they can no longer provide
  - `Subscribe`: Sent by `Client(s)` to subscribe to particular records
  - `Unsubscribe`: Sent by `Clients(s)` to unsubscribe from particular records
- On the first `Client` subscription for a particular record the `Distributor` will send a `Subscribe` message to the `Feeder` that advertised a topic regex matching the record's topic.  
- On the last `Client` unsubscription for a particular record the `Distributor` will send an `Unsubscribe` message to the `Feeder` that was subscribed for that record.
- Data received by `Distributor` from `Feeder(s)` on currently subscribed records is cached, and provided directly from cache to new subscribers.

### 2. Client
- The `Client(s)` can connect to `Distributor(s)` and issue `Subscribe` or `Unsubscribe` requests for particular data records.
- The subscription request fully identifies the record topic (i.e. it is not a regex), and properties of interest.
- The `Distributor` should maintain a reference count of each property of each record subscribed by each `Client` 
- When the subscription reference count for all properties of a record becomes zero, the `Distributor` should send the `Unsubscribe` request to the `Feeder`
- This may be either a console application or a web based UI.   

### 3. Feeder
- The `Feeder` service delivers the updates on underlying records to the `Distributor`, which in turn sends them to `Client(s)` 
- The `Feeder` service connects to the configured `Distributor` service and it advertises the record universe that it can handle, via the `Advertise` message.
- When a `Distributor` subscribes to a record, the `Feeder` will start publishing updates to the distributor, until unsubscribed.


## Example

### 1. Advertisement

##### Feed->Distributor
adv:market-data/TSE/.*  
{"type":"adv","topicRegex":"market-data/TSE/.*"}

### 2. Initial subscription

##### 2.1. Client->Distributor
sub:market-data/TSE/Sony:ltp,ltq,open,high,low  
{"type":"sub","topic":"market-data/TSE/Sony","fields":"ltp,ltq,open,high,low"}

##### 2.2. Distributor->Feed
sub:market-data/TSE/Sony:ltp,ltq,open,high,low  
{"type":"sub","topic":"market-data/TSE/Sony","fields":"ltp,ltq,open,high,low"}

##### 2.3. Feed->Distributor
pub:market-data/TSE/Sony:ltp=13335,ltq=500,open=13475,high=13535,low=13290  
{"type":"pub","topic":"market-data/TSE/Sony","values":"ltp=13335,ltq=500,open=13475,high=13535,low=13290"}

##### 2.4. Distributor->Client
pub:market-data/TSE/Sony:ltp=13335,ltq=500,open=13475,high=13535,low=13290  
{"type":"pub","topic":"market-data/TSE/Sony","values":"ltp=13335,ltq=500,open=13475,high=13535,low=13290"}

### 3. Additional subscription

##### 3.1. Client->Distributor
sub:market-data/TSE/Sony:close,volume,prev_close,high52w,low52w,adv30d,vol30d  
{"type":"sub","topic":"market-data/TSE/Sony","fields":"close,volume,prev_close,high52w,low52w,adv30d,vol30d"}

##### 3.2. Distributor->Feed
sub:market-data/TSE/Sony:close,volume,prev_close,high52w,low52w,adv30d,vol30d  
{"type":"sub","topic":"market-data/TSE/Sony","fields":"close,volume,prev_close,high52w,low52w,adv30d,vol30d"}

##### 3.3. Feed->Distributor
pub:market-data/TSE/Sony:close=,volume=4551000,prev_close=13475,high52w=14915,low52w=11050,adv30d=4507635,vol30d=32.48  
{"type":"pub","topic":"market-data/TSE/Sony","values":"close=,volume=4551000,prev_close=13475,high52w=14915,low52w=11050,adv30d=4507635,vol30d=32.48"}

##### 3.4. Distributor->Client
pub:market-data/TSE/Sony:close=,volume=4551000,prev_close=13475,high52w=14915,low52w=11050,adv30d=4507635,vol30d=32.48  
{"type":"pub","topic":"market-data/TSE/Sony","values":"close=,volume=4551000,prev_close=13475,high52w=14915,low52w=11050,adv30d=4507635,vol30d=32.48"}

### 4. Additional updates (trade)

##### 4.1. Feed->Distributor
pub:market-data/TSE/Sony:ltp=13315,ltq=300,volume=4551300  
{"type":"pub","topic":"market-data/TSE/Sony","values":"ltp=13315,ltq=300,volume=4551300"}

##### 4.2. Distributor->Client
pub:market-data/TSE/Sony:ltp=13315,ltq=300,volume=4551300  
{"type":"pub","topic":"market-data/TSE/Sony","values":"ltp=13315,ltq=300,volume=4551300"}

### 5. Additional updates (market close)

##### 5.1. Feed->Distributor
pub:market-data/TSE/Sony:close=13315  
{"type":"pub","topic":"market-data/TSE/Sony","values":"close=13315"}

##### 5.2. Feed->Distributor
pub:market-data/TSE/Sony:close=13315  
{"type":"pub","topic":"market-data/TSE/Sony","values":"close=13315"}

### Final image of the record
ltp=13315,ltq=300,volume=4551300,close=13315,volume=4551000,prev_close=13475,high52w=14915,low52w=11050,adv30d=4507635,vol30d=32.48

### some changes
