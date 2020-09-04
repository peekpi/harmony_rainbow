pragma solidity 0.5.17;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract Locker {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    IERC20 public ethToken_;

    mapping(bytes32 => bool) public usedEvents_;

    event Locked(
        address indexed token,
        address indexed sender,
        uint256 amount,
        address recipient
    );

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

    /**
     * @dev lock tokens to be minted on harmony chain
     * @param recipient recipient address on the harmony chain
     * @param amount amount of tokens to lock
     */
    function lockToken(address recipient, uint256 amount) public {
        require(
            recipient != address(0),
            "Locker/recipient is a zero address"
        );
        require(amount > 0, "Locker/zero token locked");
        uint256 _balanceBefore = ethToken_.balanceOf(msg.sender);
        ethToken_.safeTransferFrom(msg.sender, address(this), amount);
        uint256 _balanceAfter = ethToken_.balanceOf(msg.sender);
        uint256 _actualAmount = _balanceBefore.sub(_balanceAfter);
        emit Locked(address(ethToken_), msg.sender, _actualAmount, recipient);
    }

    /**
     * @dev unlock tokens after burning them on harmony chain
     * @param amount amount of unlock tokens
     * @param recipient recipient of the unlock tokens
     * @param receiptId transaction hash of the burn event on harmony chain
     */
    function unlockToken(
        uint256 amount,
        address recipient,
        bytes32 receiptId
    ) public auth {
        require(
            !usedEvents_[receiptId],
            "Locker/The burn event cannot be reused"
        );
        usedEvents_[receiptId] = true;
        ethToken_.safeTransfer(recipient, amount);
        emit Unlocked(amount, recipient);
    }
}
