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

const port = 5000
const sleepCadence = 30000 // 30 seconds

async function main() {
  let [asset, limit_price, side] = process.argv.slice(2);

  // 1. append(order) —> to Hotstuff via grpc

  // 2. submit order to darkpool
  axios.post(`https://localhost:${port}`, {
      asset: asset,
      limit_price: limit_price,
      side: side
    })
    .then(function (response) {
      console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limit_price}`);
    })
    .catch(function (error) {
      console.log(`Failed submission ${side} order for asset $${asset} @ ${limit_price}`);
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
        // 4. getIndex(other filled order) <- Hotstuff via grpc
        // if legal, "no frontrunning"
        // else "sec"

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
