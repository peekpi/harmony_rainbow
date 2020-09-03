const EthBridge = require('../lib/EthBridge');
const contracts = require("../build/deployed.json");

const txHash = '0x9ebaff14e224d37deb0a559899f236c7b041aa373fe0456ab5da074c3d0f6ce3';

(async function() {
    const eb = new EthBridge()

    let header, receiptProof, txIndex = await eb.gp.receiptProof(txHash)
    console.log(header)
    console.log(receiptProof)
    console.log(txIndex)
} ()).catch( err => console.log )
