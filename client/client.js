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

async function append(order){
  for (const port of hotStuffPorts) {
    axios.post(`https://localhost:${port}`, order)
      .then(function (response) {
        console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limit_price} to HotStuff Node ${port}`);
      })
      .catch(function (error) {
        console.log(`Failed submission ${side} order for asset $${asset} @ ${limit_price} to HotStuff Node ${port}`);
      });
  }
}

async function getIndex(order){
  for (const port of hotStuffPorts) {
    axios.get(`https://localhost:${port}/index?asset=${order.asset}&limit_price=${order.limit_price}&side=${side}`)
      .then(function (response) {
        console.log(`Successfully queried ${side} order for asset $${asset} @ ${limit_price} from HotStuff Node ${port}`);
        if(response.data.isLeader){
          return response.data.index;
        }
      })
      .catch(function (error) {
        console.log(`Failed to query ${side} order for asset $${asset} @ ${limit_price} from HotStuff Node ${port}`);
      });
  }
}

async function main() {
  let [asset, limit_price, side] = process.argv.slice(2);

  let order = {
      asset: asset,
      limit_price: limit_price,
      side: side
    }

  // 1. append(order) —> to Hotstuff via REST
  await append(order);

  var token;

  // 2. submit order to darkpool
  axios.post(`https://localhost:${darkpoolPort}/sendOrder`, order)
    .then(function (response) {
      console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limit_price}`);
      token = response.data.token;
    })
    .catch(function (error) {
      console.log(`Failed submission ${side} order for asset $${asset} @ ${limit_price}`);
      console.log(`error: ${error}`);
    });

  var s3 = new aws.S3();

  var params = {
   Bucket: BUCKET,
   Key: createHash('sha256').update(`${asset}${limit_price}${side}`).digest('hex')
  }

  // 3. ping s3 bucket, if order found call getIndex on order and check if hash is after yours
  while (True){
    var found = False;

    const data = s3.getObject(params, function(err, data) {
      if (err) {
        console.log(err, err.stack)
      }
      else {
        // 4. getIndex(other filled order) <- Hotstuff via rest
        let filledIndex = await getIndex(params)
        if(ourIndex <= filledIndex){
          console.log("FRONTRUNNING OCCURRED");
        }
        found = True;
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
