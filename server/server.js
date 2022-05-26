const bodyParser = require('body-parser');
const express = require('express');
const {
  PriorityQueue,
  MinPriorityQueue,
  MaxPriorityQueue,
} = require('@datastructures-js/priority-queue');
const { createHash } = require('crypto');
const aws = require('aws-sdk');

const {
  ACCESS_KEY_ID,
  SECRET_KEY,
  REGION,
  TABLE_NAME,
} = require("../aws-spec");

const app = express();
const port = 8000;

aws.config.update({accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_KEY, region: REGION});


app.use(bodyParser.json());

app.get('/', (req, res) => { //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});
});

app.get('/getState', (req, res) => { //get the state of the DP
    res.json({ bidsInPool: bidsQueue.toArray(), asksInPool: asksQueue.toArray()});
});


app.get('/getNewClientId', (req, res) => {
    res.json({ clientId: lastClientId});
    lastClientId += 1;
});

let currOrderNumber = 0;

let bidsQueue = new MaxPriorityQueue((order) => order.limitPrice);
let asksQueue = new MinPriorityQueue((order) => order.limitPrice);

let fairnessCoefficient = 1;

let lastClientId = 00000;

var ddb = new aws.DynamoDB();


async function uploadMatchToAWS(bidOrder, askOrder){
  let bid_db_params = {
    TableName: TABLE_NAME,
    Item: {
      'hash' : {S: createHash('sha256').update(`${bidOrder.asset}${bidOrder.limitPrice}${bidOrder.side}`).digest('hex')},
      'clientId' : {S: bidOrder.clientId.toString()},
    }
  };

  let ask_db_params = {
    TableName: TABLE_NAME,
    Item: {
      'hash' : {S: createHash('sha256').update(`${askOrder.asset}${askOrder.limitPrice}${askOrder.side}`).digest('hex')},
      'clientId' : {S: askOrder.clientId.toString()},
    }
  };

  ddb.putItem(bid_db_params, function(err, data) {
    if (err) {
      console.log("Failure to submit BID side to db", err);
    } else {
      console.log("Successfully added BID side to db");
    }
  });

  ddb.putItem(ask_db_params, function(err, data) {
    if (err) {
      console.log("Failure to submit ASK side to db", err);
    } else {
      console.log("Successfully added ASK side to db");
    }
  });
}
//match when curr_bid >= curr_ask
async function checkForMatches() {
    if (!bidsQueue.isEmpty() && !asksQueue.isEmpty()){
      if(bidsQueue.front().limitPrice >= asksQueue.front().limitPrice){
        let bidOrder = bidsQueue.dequeue()
        let askOrder = asksQueue.dequeue()
        console.log(`..............\n\n matched: \n \n\n ${JSON.stringify(bidOrder)} \n \n \n with: \n \n \n  ${JSON.stringify(askOrder)} \n \n \n..............`)
        uploadMatchToAWS(bidOrder, askOrder)
      }
  }
}

async function frontRun(order) {
  let spoofClinetId =lastClientId++
  let spoofOrder = {
     asset : order.asset,
     limitPrice : order.limitPrice,
     clientId : spoofClinetId
 };
  if (order.side === "BID"){
    spoofOrder.side = "ASK"
    console.log(`..............\n\n matched(!): \n \n\n ${JSON.stringify(order)} \n \n \n with: \n \n \n  ${JSON.stringify(spoofOrder)} \n \n \n..............`)
    uploadMatchToAWS(order, spoofOrder)
  }
  else{
      spoofOrder.side = "BID"
      console.log(`..............\n\n matched(!): \n \n\n ${JSON.stringify(order)} \n \n \n with: \n \n \n  ${JSON.stringify(spoofOrder)} \n \n \n..............`)
      uploadMatchToAWS(spoofOrder, order)
  }

}

app.post("/setFairness", async (req, res) => {
  let curr_fairness = req.body.fairnessCoefficient;
  if (curr_fairness === undefined) {
    res.status(400).json({ error: `You must specify an fairnessCoefficient in each call` });
    return;
  }
  if(curr_fairness < 0.0 || curr_fairness > 1.0){
    res.status(400).json({ error: `fairnessCoefficient must be in the range [0,1]` });
    return;
  }
  fairnessCoefficient = curr_fairness
  console.log(`fairness Coefficient updated to ${fairnessCoefficient}` )
  res.json({ fairnessCoefficient: fairnessCoefficient });
});


app.post("/sendOrder", async (req, res) => {

 let order = {
    asset : req.body.asset,
    limitPrice : req.body.limitPrice,
    side : req.body.side,
    clientId : req.body.clientId
};

 if (order.clientId  === undefined) {
   res.status(400).json({ error: `You must specify an clientId in each order` });
   return;
 }
 if(order.clientId < 0){
   res.status(400).json({ error: `invalid clientId` });
   return;
 }


 if (!order.asset) {
   res.status(400).json({ error: `You must specify an asset in each order` });
   return;
 }
 if(order.asset !== "AAPL"){
   res.status(403).json({ error: `Sorry, but that asset class isn't yet supported :(` });
   return;
 }
 if (order.limitPrice === undefined) {
   res.status(400).json({ error: `You must specify an limitPrice in each order` });
   return;
 }
 if(order.limitPrice < 0){
   res.status(400).json({ error: `Limit price must be positive` });
   return;
 }

 if (!order.side) {
   res.status(400).json({ error: `You must specify an side for each order` });
   return;
 }

 if (order.side !== "BID" && order.side !== "ASK") {
   res.status(400).json({ error: `the side must be either BID or ASK` });
   return;
 }

 let orderNumber = currOrderNumber;
 currOrderNumber +=1;

 console.log(`Successfully received ${order.side} order for asset $${order.asset} @ ${order.limitPrice} and returned order Number ${orderNumber}`);
 if (Math.random() < fairnessCoefficient){
   if (order.side === "BID"){
     bidsQueue.enqueue(order)
     console.log(bidsQueue.toArray())
   }
   else{
     asksQueue.enqueue(order)
     console.log(asksQueue.toArray())

   }
     checkForMatches()
 }
 else{
   frontRun(order)
 }
 res.json({ orderNumber: orderNumber });
});

app.listen(port, () => {
    console.log(`Now listening on port ${port}`);
});
