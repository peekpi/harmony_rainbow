const contracts = require("../build/deployed.json");
const HmyBridge = require("../lib/HmyBridge");
const EthBridge = require("../lib/EthBridge");
const BN = require("bn.js");
const BigNumber = require("bignumber.js");

(async function () {
    const eb = new EthBridge(contracts.ercToken, contracts.ethLocker)
    const hb = new HmyBridge(contracts.hrcToken, contracts.hrcMinter)

    console.log("====================== Ethereum ==========================")
    let initialBal = await eb.getBalance(eb.userAccount.address)
    console.log("initial erc20 balance: ", initialBal)

    let amount = new BigNumber(1e18)
    await eb.mint(eb.userAccount.address, amount)

    let mintBal = await eb.getBalance(eb.userAccount.address)
    console.log("mint erc20 token: ", mintBal)

    console.log("approving token")
    await eb.approve(contracts.ethLocker, amount)

    console.log("locking token")
    let locked = await eb.lock(amount)
    console.log("token locked", locked.transactionHash)

    let finalBal = await eb.getBalance(eb.userAccount.address)
    console.log("final erc20 balance: ", finalBal)

    console.log("====================== Harmony ==========================")

    let initialHmyBal = await hb.getBalance(hb.userAccount.address)
    console.log("initial hrc20 balance: ", initialHmyBal.toString())

    console.log("minting on Harmony")
    let hmyBal = new BN(10).pow(new BN(18))
    await hb.mintLocked(hb.userAccount.address, hmyBal, locked.transactionHash)

    let finalHmyBal = await hb.getBalance(hb.userAccount.address)
    console.log("after hrc20 balance: ", finalHmyBal.toString())
}()).catch( (err) => console.log )
