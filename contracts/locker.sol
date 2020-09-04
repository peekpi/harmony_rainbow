pragma solidity ^0.5.0;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
contract Locker {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    IERC20 public ethToken_;

    mapping(bytes32 => bool) public usedEvents_;

    event Unlocked(uint256 amount, address recipient);

    mapping(address => uint256) public wards;

    function rely(address guy) external auth {
        wards[guy] = 1;
    }

    function deny(address guy) external auth {
        require(guy != owner, "Locker/cannot deny the owner");
        wards[guy] = 0;
    }

    modifier auth {
        require(wards[msg.sender] == 1, "Locker/not-authorized");
        _;
    }

    address public owner;

    /**
     * @dev constructor
     * @param ethToken token contract address, e.g., erc20 contract
     */
    constructor(IERC20 ethToken) public {
        owner = msg.sender;
        wards[msg.sender] = 1;
        ethToken_ = ethToken;
    }
}
