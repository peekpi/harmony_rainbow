const EthBridge = require('../lib/EthBridge');
const testProverAddr = require("../misc/test.json").ProvethVerifier;
const abiJson = require("../misc/test_abi.json");
const rlp = require('rlp');

const txHash = '0x2e75d7646b7239ceae67443268af9346f0fc0007edebe063ee35a86311a36ced';

(async function() {
    const eb = new EthBridge()
    const web3 = eb.web3

    try {
        let resp = await eb.gp.receiptProof(txHash)
        // let number = web3.utils.hexToNumber(web3.utils.bytesToHex(resp.header.number))
        console.log(resp.txIndex)
        // console.log(proof)

        let receiptHash = web3.utils.bytesToHex(resp.header.receiptRoot)
        // console.log("receipt hash", receiptHash)

        let receiptRoot = web3.utils.bytesToHex(resp.header.receiptRoot)
        let key = resp.txIndex
        let receiptProof = web3.utils.bytesToHex(resp.receiptProof)

        let testProver = new eb.web3.eth.Contract(abiJson.abi, testProverAddr)
        let response = await testProver.methods.MPTProof(receiptRoot, key, receiptProof).call({gasLimit: 4712388000})

        console.log(response)

    } catch (e) {
        console.log(e)
    }
} ()).catch( err => console.log ).finally(() => process.exit())
