const axios = require('axios');
const process = require('process');

const port = 5000

async function main() {
  let [asset, limit_price, side] = process.argv.slice(2);

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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
