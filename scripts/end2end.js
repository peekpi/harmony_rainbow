const contracts = require("../build/deployed.json");
const HmyBridge = require("../lib/HmyBridge");
const EthBridge = require("../lib/EthBridge");
const BN = require("bn.js");
const BigNumber = require("bignumber.js");

const eb = new EthBridge(contracts.ercToken, contracts.ethBridge)
const hb = new HmyBridge(contracts.hmyBridge, contracts.hrcToken)

async function eth2Hmy() {
    try {
        console.log("====================== Lock in Ethereum ==========================")
        let initialBal = await eb.getBalance(eb.userAccount.address)
        console.log("initial erc20 balance: ", initialBal)

        let amount = new BigNumber(1e18)
        await eb.mint(eb.userAccount.address, amount)

        let mintBal = await eb.getBalance(eb.userAccount.address)
        console.log("mint erc20 token: ", mintBal)

        console.log("approving token")
        await eb.approve(contracts.ethBridge, amount)

        console.log("locking token")
        let locked = await eb.lock(hb.userAccount.address, amount)
        console.log("token locked", locked.transactionHash)

        let finalBal = await eb.getBalance(eb.userAccount.address)
        console.log("final erc20 balance: ", finalBal)

        let proof = await eb.getProof(locked.transactionHash)

        console.log("====================== Mint on Harmony ==========================")

        let initialHmyBal = await hb.getBalance(hb.userAccount.address)
        console.log(initialHmyBal)
        console.log("initial hrc20 balance: ", initialHmyBal.toString())

        console.log("minting on Harmony")
        let txHash = await hb.handleEthProof(proof)
        console.log(txHash)

        let finalHmyBal = await hb.getBalance(hb.userAccount.address)
        console.log("after hrc20 balance: ", finalHmyBal.toString())
    } catch (e) {
        console.log(e)
    }
}

eth2Hmy().catch( (err) => console.log ).finally(() => process.exit())
