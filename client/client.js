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

const darkpoolPort = 800
const hotStuffPorts = [0,0,0,0]
const sleepCadence = 30000 // 30 seconds

// Appends order to hotstuff ledger
async function append(order, hashedOrder){
  for (const port of hotStuffPorts) {
    axios.post(`http://localhost:${port}`, hashedOrder)
      .then(function (response) {
        console.log(`Successfully submitted ${order.side} order for asset $${order.asset} @ ${order.limit_price} to HotStuff Node ${port}`);
        if(response.data.isLeader){
          return response.data.index;
        }
      })
      .catch(function (error) {
        console.log(`Failed submission ${order.side} order for asset $${order.asset} @ ${order.limit_price} to HotStuff Node ${port}`);
      });
  }
}

// Get client id
async function getNewClientId(){
  axios.get(`http://localhost:${darkpoolPort}/getNewClientId`)
    .then(function (response) {
      console.log(`Successfully got new client id`);
      return response.data.clientId.toString();
    })
    .catch(function (error) {
      console.log(`Failed to get new client id`);
    });
}

// Gets index of order in hotstuff ledger
async function getIndex(order, hashedOrder){
  for (const port of hotStuffPorts) {
    axios.get(`http://localhost:${port}/index?order=${hashedOrder}`)
      .then(function (response) {
        console.log(`Successfully queried ${order.side} order for asset $${order.asset} @ ${order.limit_price} from HotStuff Node ${port}`);
        if(response.data.isLeader){
          return response.data.index;
        }
      })
      .catch(function (error) {
        console.log(`Failed to query ${order.side} order for asset $${order.asset} @ ${order.limit_price} from HotStuff Node ${port}`);
      });
  }
}

async function main() {
  let [asset, limit_price, side] = process.argv.slice(2);
  let userID = await getNewClientId();

  let order = {
      asset: asset,
      limit_price: limit_price,
      side: side,
      userID: userID
    }

  let hashedOrder = createHash('sha256').update(`${asset}${limit_price}${side}`).digest('hex') + userID

  // 1. append(order) —> to Hotstuff via REST
  let ourIndex = await append(order, hashedOrder);

  var token;

  // 2. submit order to darkpool
  axios.post(`http://localhost:${darkpoolPort}/sendOrder`, order)
    .then(function (response) {
      console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limit_price}`);
      token = response.data.token;
    })
    .catch(function (error) {
      console.log(`Failed submission ${side} order for asset $${asset} @ ${limit_price}`);
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
        let filledIndex = await getIndex(order, hashedOrder + data.Body.toString('utf-8'))
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
