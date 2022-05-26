const axios = require('axios');
const process = require('process');
const { createHash } = require('crypto');
const aws = require('aws-sdk');

const {
  ACCESS_KEY_ID,
  SECRET_KEY,
  REGION,
  BUCKET,
} = require("../aws-spec");

aws.config.update({accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_KEY, region: REGION});

const darkpoolPort = 8000
const hotStuffPorts = [0,0,0,0]
const sleepCadence = 30000 // 30 seconds

// Appends order to hotstuff ledger
async function append(order, hashedOrder){
  for (const port of hotStuffPorts) {
    await axios.post(`http://localhost:${port}`, {order: hashedOrder})
      .then(function (response) {
        console.log(`Successfully submitted ${order.side} order for asset $${order.asset} @ ${order.limitPrice} to HotStuff Node ${port}`);
        if(response.data.isLeader){
          return response.data.index;
        }
      })
      .catch(function (error) {
        console.log(`Failed submission ${order.side} order for asset $${order.asset} @ ${order.limitPrice} to HotStuff Node ${port}`);
      });
  }
}

// Get client id
async function getNewClientId(){
  await axios.get(`http://localhost:${darkpoolPort}/getNewClientId`)
    .then(function (response) {
      console.log(`Successfully got new client id`);
      return response.data.clientId;
    })
    .catch(function (error) {
      console.log(`Failed to get new client id`);
    });
}

// Gets index of order in hotstuff ledger
async function getIndex(order, hashedOrder){
  for (const port of hotStuffPorts) {
    await axios.get(`http://localhost:${port}/index?order=${hashedOrder}`)
      .then(function (response) {
        console.log(`Successfully queried ${order.side} order for asset $${order.asset} @ ${order.limitPrice} from HotStuff Node ${port}`);
        if(response.data.isLeader){
          return response.data.index;
        }
      })
      .catch(function (error) {
        console.log(`Failed to query ${order.side} order for asset $${order.asset} @ ${order.limitPrice} from HotStuff Node ${port}`);
      });
  }
}

async function main() {
  let [asset, limitPrice, side] = process.argv.slice(2);
  let clientId = await getNewClientId();

  let order = {
      asset: asset,
      limitPrice: limitPrice,
      side: side,
      clientId: clientId
    }

  let hashedOrder = createHash('sha256').update(`${asset}${limitPrice}${side}`).digest('hex') + "," + clientId.toString()

  // 1. append(order) —> to Hotstuff via REST
  let ourIndex = await append(order, hashedOrder);

  var token;

  // 2. submit order to darkpool
  await axios.post(`http://localhost:${darkpoolPort}/sendOrder`, order)
    .then(function (response) {
      console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limitPrice}`);
      token = response.data.orderNumber;
    })
    .catch(function (error) {
      console.log(`Failed submission ${side} order for asset $${asset} @ ${limitPrice}`);
      console.log(`error: ${error}`);
    });

  var s3 = new aws.S3();

  var filledOrder = {
   Bucket: BUCKET,
   Key: hashedOrder
  }

  // 3. ping s3 bucket, if order found call getIndex on order and check if hash is after yours
  while (true){
    var found = false;

    const data = await s3.getObject(filledOrder, async function(err, data) {
      if (err) {
        console.log(err, err.stack)
      }
      else {
        // 4. getIndex(other filled order) <- Hotstuff via rest
        let filledIndex = await getIndex(order, hashedOrder.split(",")[0] + data.Body.toString('utf-8'))
        if(ourIndex <= filledIndex){
          console.log("FRONTRUNNING OCCURRED, CALL GARY");
        }
        found = true;
      }
    })

    if (found) break;

    // Sleep
    await new Promise(resolve => setTimeout(resolve, sleepCadence));
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
