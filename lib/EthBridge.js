require("dotenv").config({path: './envs/eth.env'});
const Web3 = require("web3");
const BigNumber = require("bignumber.js")


class EthBridge {
    constructor(tokenAddress, lockerAddress) {
        const web3 = new Web3(process.env.ETH_NODE_URL)
        let adminAccount = web3.eth.accounts.privateKeyToAccount(process.env.ETH_ADMIN_PRIVATE_KEY)
        let userAccount = web3.eth.accounts.privateKeyToAccount(process.env.ETH_USER_PRIVATE_KEY)
        web3.eth.accounts.wallet.add(adminAccount);
        web3.eth.accounts.wallet.add(userAccount);
        web3.eth.defaultAccount = adminAccount.address;

        this.web3 = web3
        this.adminAccount = adminAccount
        this.userAccount = userAccount

        let tokenJson = require("../build/contracts/MyERC20.json")
        if (tokenAddress) {
            this.tokenContract = new web3.eth.Contract(tokenJson.abi, tokenAddress)
        } else {
            this.tokenContract = new web3.eth.Contract(tokenJson.abi)
        }
        this.tokenJson = tokenJson

        let lockerJson = require("../build/contracts/Locker.json")
        if (lockerAddress) {
            this.lockerContract = new web3.eth.Contract(lockerJson.abi, lockerAddress)
        } else {
            this.lockerContract = new web3.eth.Contract(lockerJson.abi)
        }
        this.lockerJson = lockerJson
    }

    async deployToken() {
        const gasPrice = await this._estimateGasPrice()
        const gasLimit = this._getGasLimit()
        const deployArgs = {data: this.tokenJson.bytecode}
        const sendOption = {from: this.adminAccount.address, gas: gasLimit, gasPrice: gasPrice}

        const txContract = await this.tokenContract.deploy(deployArgs).send(sendOption)

        const erc20 = `${txContract.options.address}`;
        this.tokenContract = new this.web3.eth.Contract(this.tokenJson.abi, erc20)
        console.log("Deployed ERC20 contract on Ethereum at", erc20);
        return erc20;
    }

    async deployLocker(tokenAddr) {
        const gasPrice = await this._estimateGasPrice()
        const gasLimit = this._getGasLimit()
        const sendOption = {from: this.adminAccount.address, gas: gasLimit, gasPrice: gasPrice}
        const deployArgs = {data: this.lockerJson.bytecode, arguments: [tokenAddr]}

        const txContract = await this.lockerContract.deploy(deployArgs).send(sendOption)

        const lockerAddr = `${txContract.options.address}`
        this.lockerContract = new this.web3.eth.Contract(this.lockerJson.abi, lockerAddr)
        console.log("Deployed locker contract on Ethereum at", lockerAddr)
        return lockerAddr
    }

    async getBalance(addr) {
        const sendOption = await this._getUserOption()
        return await this.tokenContract.methods.balanceOf(addr).call(sendOption)
    }

    async mint(account, amount) {
        const sendOption = await this._getAdminOption()
        await this.tokenContract.methods.mint(account, amount).send(sendOption)
    }

    async approve(targetAddr, amount) {
        const sendOption = await this._getUserOption()
        await this.tokenContract.methods.approve(targetAddr, amount).send(sendOption)
    }

    async lock(amount) {
        const sendOption = await this._getUserOption()
        let txn = await this.lockerContract.methods.lockToken(this.userAccount.address, amount).send(sendOption)
        return txn.events.Locked
    }

    async _getAdminOption() {
        const gasPrice = await this._estimateGasPrice()
        const gasLimit = this._getGasLimit()
        return {
            from: this.adminAccount.address,
            gas: gasLimit,
            gasPrice: gasPrice,
        }
    }

    async _getUserOption() {
        const gasPrice = await this._estimateGasPrice()
        const gasLimit = this._getGasLimit()
        return {
            from: this.userAccount.address,
            gas: gasLimit,
            gasPrice: gasPrice,
        }
    }

    async _estimateGasPrice() {
        let rawPrice = await this.web3.eth.getGasPrice()
        let parsed = new BigNumber(rawPrice)
        let multiplier = new BigNumber(process.env.ETH_GAS_PRICE_MULTIPLER)
        return (parsed * multiplier).toString()
    }

    _getGasLimit() {
        return process.env.ETH_GAS_LIMIT
    }
}


module.exports = EthBridge

