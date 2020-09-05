const EthBridge = require("../lib/EthBridge")
const HmyBridge = require("../lib/HmyBridge")
const contracts = require("../build/deployed.json")

const eb = new EthBridge(contracts.ercToken, contracts.ethBridge)
const hb = new HmyBridge(contracts.hmyBridge)

const txHash = "0xd6061f8b53c5da2d8ee2f2cd7f4f7c21dc603df5fb7ee0028ae3766c1505ef6f"

// eb.getProof(txHash).then( (res) => {
//     console.log(res)
//     return hb.handleEthProof(res.hash, res.root, res.key, res.proof)
// }).then( (res) => {
//     console.log(res)
// }).catch( (err) => {
//     console.error(err)
// })

// hb.getProof(txHash).then( (res) => {
//     return eb.handleHmyProof(res.blockHash, res.receiptRoot, res.txIndex, res.receiptProof)
// }).catch(err => console.log(err))
// hb.getNewTokenAddress().then( res => console.log(res))

console.log(hb.userAccount.address)

hb.hmy.blockchain.getTransactionReceipt({txnHash: txHash}).then( res => console.log(res.result.logs[0]))
