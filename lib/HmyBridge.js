require("dotenv").config({path: './envs/hmy.env'})
const { Harmony } = require("@harmony-js/core")
const { Account } = require('@harmony-js/account')
const { ChainID, ChainType } = require("@harmony-js/utils")

class HmyBridge {
    constructor(tokenAddress, minterAddress) {
        let hmy = getHmy()
        let adminAccount = new Account(process.env.PRIVATE_KEY)
        let userAccount = new Account(process.env.PRIVATE_KEY_USER)

        let tokenJson = require("../build/contracts/MyERC20.json")
        let minterJson = require("../build/contracts/Minter.json")

        this.hmy = hmy
        this.adminAccount = adminAccount
        this.userAccount = userAccount
        this.gasLimit = process.env.GAS_LIMIT
        this.gasPrice = process.env.GAS_PRICE
        this.tokenJson = tokenJson
        this.minterJson = minterJson

        if (tokenAddress) {
            this.tokenContract = hmy.contracts.createContract(tokenJson.abi, tokenAddress)
        } else {
            this.tokenContract = hmy.contracts.createContract(tokenJson.abi)
        }

        if (minterAddress) {
            this.minterContract = hmy.contracts.createContract(minterJson.abi, minterAddress)
        } else {
            this.minterContract = hmy.contracts.createContract(minterJson.abi)
        }
    }

    async deployToken() {
        this.tokenContract.wallet.setSigner(this.adminAccount.address)
        const deployOptions = {data: this.tokenJson.bytecode}
        const options = { gasPrice: this.gasPrice, gasLimit: this.gasLimit }

        let response = await this.tokenContract.methods.contractConstructor(deployOptions).send(options)

        const tokenAddr = response.transaction.receipt.contractAddress
        this.tokenContract = this.hmy.contracts.createContract(this.tokenJson.abi, tokenAddr)
        console.log("HRC20 contract deployed on Harmony at", tokenAddr)
        return tokenAddr
    }

    async deployMinter(tokenAddress) {
        this.tokenContract.wallet.setSigner(this.adminAccount.address)
        const deployOptions = {data: this.minterJson.bytecode, arguments: [tokenAddress]}
        const options = {gasPrice: this.gasPrice, gasLimit: this.gasLimit}

        let response = await this.minterContract.methods.contractConstructor(deployOptions).send(options)

        const minterAddr = response.transaction.receipt.contractAddress
        this.minterContract = this.hmy.contracts.createContract(this.minterJson.abi, minterAddr)
        console.log("Minter deployed on Harmony at", minterAddr)
        return minterAddr
    }

    async mintToken(beneficial, amount) {
        this.tokenContract.wallet.setSigner(this.adminAccount.address)
        let options = {gasPrice: this.gasPrice, gasLimit: this.gasLimit}
        await this.tokenContract.methods.mint(beneficial, amount).send(options)
    }

    async getBalance(addr) {
        this.tokenContract.wallet.setSigner(this.adminAccount.address)
        let options = {gasPrice: this.gasPrice, gasLimit: this.gasLimit}
        return await this.tokenContract.methods.balanceOf(addr).call(options)
    }

    async addMinter(addr) {
        this.tokenContract.wallet.setSigner(this.adminAccount.address)
        let options = {gasPrice: this.gasPrice, gasLimit: this.gasLimit}
        let response = await this.tokenContract.methods.rely(addr).send(options)
        console.log(response)
    }

    async mintLocked(beneficiary, amount, receiptId) {
        this.minterContract.wallet.setSigner(this.adminAccount.address)
        let options = {gasPrice: this.gasPrice, gasLimit: this.gasLimit}
        await this.minterContract.methods.mintToken(beneficiary, amount, receiptId).send(options)
    }
}

function getHmy() {
    const hmy = new Harmony(process.env.HMY_NODE_URL, {
        chainType: ChainType.Harmony,
        chainId: ChainID.HmyTestnet,
    })

    hmy.wallet.addByPrivateKey(process.env.PRIVATE_KEY)
    hmy.wallet.addByPrivateKey(process.env.PRIVATE_KEY_USER)
    return hmy
}

module.exports = HmyBridge
