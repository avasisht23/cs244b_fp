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

const port = 8000
const sleepCadence = 30000 // 30 seconds

async function main() {
  let [asset, limit_price, side] = process.argv.slice(2);

  // 1. append(order) —> to Hotstuff via grpc

  // 2. submit order to darkpool
  axios.post(`http://localhost:${port}/sendOrder`, {
      asset: asset,
      limitPrice: limit_price,
      side: side
    })
    .then(function (response) {
      console.log(`Successfully submitted ${side} order for asset $${asset} @ ${limit_price}`);
      //@CHUD, make sure u store the value returned in the JSON response

    })
    .catch(function (error) {
      console.log(`Failed submission ${side} order for asset $${asset} @ ${limit_price}`);
      console.log(`error: ${error}`);
    });

    await new Promise(resolve => setTimeout(resolve, 3000)); //TEMPORARY UNTIL WE GET THE AWS STUFF SET UP


  var s3 = new aws.S3();

  var params = {
   Bucket: BUCKET,
   Key: createHash('sha256').update(`${asset}${limit_price}${side}`).digest('hex')
  }

  //@CHUD, commented this out since it was causing error since not connectied to AWS bucket yet. u can uncomment whenever
  // 3. ping s3 bucket, if order found call getIndex on order and check if hash is after yours
  // while (true){
  //   var found = false;
  //
  //   const data = s3.getObject(params, function(err, data) {
  //     if (err) {
  //       console.log(err, err.stack)
  //     }
  //     else {
  //       // 4. getIndex(other filled order) <- Hotstuff via grpc
  //       // if legal, "no frontrunning"
  //       // else "sec"
  //
  //       found = true;
  //     }
  //   })
  //
  //   if (found) break;
  //
  //   // Sleep
  //   await new Promise(resolve => setTimeout(resolve, sleepCadence));
  //}
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
