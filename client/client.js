const axios = require('axios');
const process = require('process');
const { createHash } = require('crypto');
const aws = require('aws-sdk');

const {
  ACCESS_KEY_ID,
  SECRET_KEY,
  REGION,
  TABLE_NAME,
} = require("../aws-spec");

aws.config.update({accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_KEY, region: REGION});

const darkpoolPort = 8000
const hotStuffPort = 80 // 0th replica is leader. No rotation
const sleepCadence = 30000 // 30 seconds

// Appends order to hotstuff ledger
async function append(order, hashedOrder){
  var r;
  await axios.post(`http://localhost:${hotStuffPort}/append`, {order: hashedOrder})
    .then(function (response) {
      console.log(`Successfully submitted ${order.side} order for asset $${order.asset} @ ${order.limitPrice} to HotStuff Node ${hotStuffPort}`);
      console.log(response.data)
      r = response.data;
    })
    .catch(function (error) {
      console.log(`Failed submission ${order.side} order for asset $${order.asset} @ ${order.limitPrice} to HotStuff Node ${hotStuffPort}`);
    });
  return r;
}

// Get client id
async function getNewClientId(){
  var r;
  await axios.get(`http://localhost:${darkpoolPort}/getNewClientId`)
    .then(function (response) {
      console.log(`Successfully got new client id`);
      r = response.data.clientId;
    })
    .catch(function (error) {
      console.log(`Failed to get new client id`);
    });
  return r;
}

// Gets index of order in hotstuff ledger
async function getIndex(order, hashedOrder){
  var r;
  await axios.get(`http://localhost:${hotStuffPort}/get_index?hash=${hashedOrder}`)
    .then(function (response) {
      console.log(`Successfully queried ${order.side} order for asset $${order.asset} @ ${order.limitPrice} from HotStuff Node ${hotStuffPort}`);
      console.log(response.data)
      r = response.data;
    })
    .catch(function (error) {
      console.log(`Failed to query ${order.side} order for asset $${order.asset} @ ${order.limitPrice} from HotStuff Node ${hotStuffPort}`);
    });
  return r;
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

  // 1. append(order) ???> to Hotstuff via REST
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

  var ddb = new aws.DynamoDB();

  var filledOrder1 = {
   TableName: TABLE_NAME,
   Key: {
    'hash': {S: hashedOrder.split(",")[0]}
   }
  }

  // 3. ping s3 bucket, if order found call getIndex on order and check if hash is after yours
  while (true){
    // TYPE 1 FRONTRUNNING: Another Client gets ahead of another in fill
    const res1 = await ddb.getItem(filledOrder1, async function(err, data) {
      if (err) {
        console.log(err, err.stack)
      }
      else if (Object.keys(data).length !== 0){
        // 4. getIndex(other filled order) <- Hotstuff via rest
        let filledIndex = await getIndex(order, hashedOrder.split(",")[0] + "," + data.Item.clientId.S)
        console.log(filledIndex)
        console.log(ourIndex)
        if(ourIndex < filledIndex){
          console.log("FRONTRUNNING OCCURRED, CALL GARY");
        }
      }
    })

    if (res1.response.data) break;

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
