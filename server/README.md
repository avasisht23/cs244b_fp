After running npm install in the parent directory, you can start up the darkpool server by running:
`node server.j`
which you will know is up when you see 
`Now listening on port 8000`
on the console. 

The darkpool will take orders over HTTP (we recommend either using the client.js or Postman for playing with it, when appropriate). 
Some of the commands it can take are:
## To be used by both operator (aka Postman) and client:

#### To send an order:
`POST http://localhost:8000/sendOrder` 
with a raw JSON body formatted as such:
{
    "asset": "AAPL",
    "limitPrice": 100,
    "side": "BID",
    "clientId": 0
}

Expected return value:
{
    "orderNumber": INTEGER
}


#### To get a unique client ID (such as when first time connecting to the darkpool):
`GET http://localhost:8000/getNewClientId` 

Expected return value:
{
    "clientId": 0
}

## To be used only by operator (secrets that the client shouldn't have access to in a Prod setting)

#### To get a all BIDS and ASKS currently sitting in the darpool
`GET http://localhost:8000/getState` 

Expected return value:
{
    "bidsInPool": [
        {
            "asset": "AAPL",
            "limitPrice": 200,
            "side": "BID",
            "clientId": 0
        },
        {
            "asset": "AAPL",
            "limitPrice": 150,
            "side": "BID",
            "clientId": 2
        },
        {
            "asset": "TSLA",
            "limitPrice": 100,
            "side": "BID",
            "clientId": 5
        }
    ],
    "asksInPool": [
        {
            "asset": "AAPL",
            "limitPrice": 55,
            "side": "BID",
            "clientId": 10
        }
    ]
}

#### To change the fairness level [0.0 - 1.0] where 1.0 means 100% fair and 0.0 means it will always try to frontrun
`POST http://localhost:8000/setFairness` 

with a raw JSON body formatted as such:
{"fairnessCoefficient": 0.0}


# Practical advice
The console log is the best way to see what's happening as we currently print out useful formatted statements about everything the darkpool is doing (recived order, matched, frontrun, change fairness, etc).