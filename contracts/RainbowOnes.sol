pragma solidity ^0.5.0;

import "./LightClient.sol";
import "./MPTSolidity/ProvethVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts//ownership/Ownable.sol";

contract BridgedToken is ERC20Burnable,ERC20Detailed,ERC20Mintable {
    constructor(string memory name, string memory symbol, uint8 decimals) ERC20Detailed(name,symbol,decimals) public{}
}

contract RainbowOnes is ProvethVerifier,Ownable {
    using RLPReader for RLPReader.RLPItem;
	using RLPReader for bytes;

    event TokenMapReq(address indexed tokenReq, uint8 decimals, string name, string symbol);
    bytes32 TokenMapReqEventSig = keccak256("TokenMapReq(address,uint8,string,string)");
    event TokenMapAck(address indexed tokenReq, address indexed tokenAck);
    bytes32 TokenMapAckEventSig = keccak256("TokenMapAck(address,address)");
    event Locked(address indexed token, address indexed sender, uint256 amount, address recipient);
    bytes32 lockEventSig = keccak256("Locked(address,address,uint256,address)");
    event Burn(address indexed token, address indexed sender, uint256 amount, address recipient);
    bytes32 burnEventSig = keccak256("Burn(address,address,uint256,address)");

    address public otherSideBridge;
    LightClient public lightclient;

    mapping(address=>address) public ThisSideLocked;   // thisSide locked => otherSide mint
    mapping(address=>address) public OtherSideMint;    // otherSide mint => thisSide locked

    mapping(address=>address) public OtherSideLocked;  // otherSide locked => thisSide mint
    mapping(address=>address) public ThisSideMint;     // thisSide mint => otherSide locked

    mapping(bytes32=>bool) public spentReceipt;

    constructor() Ownable() public {
        lightclient = new LightClient();
    }

    function changeLightClient(LightClient newClient) public onlyOwner {
        lightclient = newClient;
    }

    function bandBridgeSide(address otherSide) public onlyOwner {
        otherSideBridge = otherSide;
    }

    function CreateRainbow(ERC20Detailed thisSideToken) public returns(address) {
        require(ThisSideLocked[address(thisSideToken)] == address(0));
        ERC20Detailed tokenDetail = ERC20Detailed(thisSideToken);
        emit TokenMapReq(address(thisSideToken), tokenDetail.decimals(), tokenDetail.name(), tokenDetail.symbol());
    }

    function RainbowBack(BridgedToken token, address recipient, uint256 amount) public {
        require(
            recipient != address(0),
            "Locker/recipient is a zero address"
        );
        require(ThisSideMint[address(token)] != address(0), "bridge isn't exist");
        token.burnFrom(address(token), amount);
        emit Burn(address(token), msg.sender, amount, recipient);
    }

    function RainbowTo(IERC20 token, address recipient, uint256 amount) public {
        require(
            recipient != address(0),
            "Locker/recipient is a zero address"
        );
        require(ThisSideLocked[address(token)] != address(0), "bridge isn't exist");
        token.transferFrom(msg.sender, address(this), amount);
        emit Locked(address(token), msg.sender, amount, recipient);
    }

    function ExecProof(uint256 blockNo, bytes32 rootHash, bytes memory mptkey, bytes memory proof) public {
        require(lightclient.VerifyReceiptsHash(blockNo, rootHash), "wrong receipt hash");
        bytes memory rlpdata = MPTProof(rootHash, mptkey, proof); // double spending check
        bytes32 receiptHash = keccak256(rlpdata);
        require(spentReceipt[receiptHash] == false, "double spent!");
        spentReceipt[receiptHash] = true;
        uint256 events = receiptVerify(rlpdata);
        require(events > 0, "no valid event");
    }

	function receiptVerify(bytes memory rlpdata) private returns(uint256 events) {
        RLPReader.RLPItem memory stacks = rlpdata.toRlpItem();
        RLPReader.RLPItem[] memory receipt = stacks.toList();
        //bytes memory PostStateOrStatus = receipt[0].toBytes();
        //uint CumulativeGasUsed = receipt[1].toUint();
        //bytes memory Bloom = receipt[2].toBytes();
        RLPReader.RLPItem[] memory Logs = receipt[3].toList();
        for(uint i = 0; i < Logs.length; i++) {
            RLPReader.RLPItem[] memory rlpLog = Logs[i].toList();
            address Address = rlpLog[0].toAddress();
            if(Address != otherSideBridge) continue;
            RLPReader.RLPItem[] memory Topics = rlpLog[1].toList(); // TODO: if is lock event
            bytes32[] memory topics = new bytes32[](Topics.length);
            for(uint j = 0; j < Topics.length; j++) {
                topics[j] = bytes32(Topics[j].toUint());
            }
            bytes memory Data = rlpLog[2].toBytes();
            if(topics[0] == lockEventSig){
                onLockEvent(topics, Data);
                events++;
                continue;
            }
            if(topics[0] == burnEventSig){
                onBurnEvent(topics, Data);
                events++;
                continue;
            }
            if(topics[0] == TokenMapReqEventSig){
                onTokenMapReq(topics, Data);
                events++;
                continue;
            }
            if(topics[0] == TokenMapAckEventSig){
                onTokenMapAck(topics, Data);
                events++;
                continue;
            }
        }
	}

    function onBurnEvent(bytes32[] memory topics, bytes memory Data) private {
        address token = address(uint160(uint256(topics[1])));
        //address sender = address(uint160(uint256(topics[2])));
        (uint256 amount, address recipient) = abi.decode(Data, (uint256, address));
        IERC20 lockedToken = IERC20(OtherSideMint[token]);
        lockedToken.transfer(recipient, amount);
    }

    function onLockEvent(bytes32[] memory topics, bytes memory Data) private {
        address token = address(uint160(uint256(topics[1])));
        //address sender = address(uint160(uint256(topics[2])));
        (uint256 amount, address recipient) = abi.decode(Data, (uint256, address));
        address mintToken = OtherSideLocked[token];
        require(mintToken != address(0));
        BridgedToken(mintToken).mint(recipient, amount);
    }

    function onTokenMapReq(bytes32[] memory topics, bytes memory Data) private {
        // event TokenMapReq(address indexed tokenReq, uint256 decimals, string name, string symbol);
        address tokenReq = address(uint160(uint256(topics[1])));
        require(OtherSideLocked[tokenReq] == address(0), "bridge already exist");
        uint8 decimals = uint8(uint256(topics[2]));
        (string memory name, string memory symbol) = abi.decode(Data, (string, string));
        BridgedToken mintAddress = new BridgedToken(name, symbol, decimals);
        ThisSideMint[address(mintAddress)] = tokenReq;
        OtherSideLocked[tokenReq] = address(mintAddress);
        emit TokenMapAck(tokenReq, address(mintAddress));
    }

    function onTokenMapAck(bytes32[] memory topics, bytes memory Data) private {
        // event TokenMapAck(address indexed tokenReq, address indexed tokenAck);
        Data;
        address tokenReq = address(uint160(uint256(topics[1])));
        address tokenAck = address(uint160(uint256(topics[2])));
        ThisSideLocked[tokenReq] = tokenAck;
        OtherSideMint[tokenAck] = tokenReq;
    }
}