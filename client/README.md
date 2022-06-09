After installing all needed npm modules, a client can be stun up using:
`node client.js AAPL 100 BID` for a bid or `node client.js AAPL 100 ASK` for an ask.

The client will also check that it's orders are not being frontrun by the darkpool.
