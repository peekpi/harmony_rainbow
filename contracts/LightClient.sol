pragma solidity ^0.5.0;

contract LightClient {
    function VerifyReceiptsHash(bytes32 blockHash, bytes32 receiptsHash) pure public returns(bool) {
        blockHash;receiptsHash;
        return true;
    }
}