const EthBridge = require('../lib/EthBridge')
const HmyBridge = require('../lib/HmyBridge')
const fs = require('fs')

async function deployContracts() {
    let eb = new EthBridge()
    let hb = new HmyBridge()
    let ercToken, ethLocker, hrcToken, hrcMinter
    try {
        ercToken = await eb.deployToken()
        ethLocker = await eb.deployLocker(ercToken)
        hrcToken = await hb.deployToken()
        hrcMinter = await hb.deployMinter(hrcToken)
    } catch (e) {
        console.error(e)
    }

    try {
        await hb.addMinter(hrcMinter)
        console.log("minter added on hrc20 token")
    } catch (e) {
        console.error(e)
    }

    return {
        ercToken: ercToken,
        ethLocker: ethLocker,
        hrcToken: hrcToken,
        hrcMinter: hrcMinter,
    }
}

(async function (){
    let contracts = await deployContracts()
    console.log(contracts)
    let jsData = JSON.stringify(contracts, null, 4)
    fs.writeFileSync('./build/deployed.json', jsData)
    console.log("contracts write to /build/deployed.json")
}()).catch(err => console.log).finally(() =>process.exit())
