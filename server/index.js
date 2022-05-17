const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const port = 8000;

app.use(bodyParser.json());

app.get('/', (req, res) => { //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});
});

let currOrderNumber = 0;

app.post("/sendOrder", async (req, res) => {
 let asset = req.body.asset;
 let limitPrice = req.body.limitPrice;
 let side = req.body.side;

 if (!asset) {
   res.status(400).json({ error: `You must specify an asset in each order` });
   return;
 }
 if(asset !== "AAPL"){
   res.status(403).json({ error: `Sorry, but that asset class isn't yet supported :(` });
   return;
 }
 if (!limitPrice) {
   res.status(400).json({ error: `You must specify an limitPrice in each order` });
   return;
 }
 if(limitPrice < 0){
   res.status(400).json({ error: `Limit price must be positive` });
   return;
 }

 if (!side) {
   res.status(400).json({ error: `You must specify an side for each order` });
   return;
 }

 if (side !== "BUY" && side !== "SELL") {
   res.status(400).json({ error: `the side must be either BUY or SELL` });
   return;
 }

 let orderNumber = currOrderNumber;
 currOrderNumber +=1;

 res.json({ orderNumber: orderNumber });
});

app.listen(port, () => {
    console.log(`Now listening on port ${port}`);
});
