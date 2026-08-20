// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TrustlineLendingPool is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // --- Custom Errors ---
    error Unauthorized();
    error ExceedsMaxPoolSize();
    error TransferFailed();
    error InsufficientAvailableLiquidity();
    error NotWhitelisted();
    error LoanAlreadyActive();
    error InsufficientLiquidity();
    error NoActiveLoan();
    error InsufficientAllowance();
    error InvalidAmount();

    // --- Structs ---
    struct Loan {
        uint256 principal;
        uint256 startTime;
        uint256 dailyInterestRate;
    }

    // --- State Variables ---
    IERC20 public immutable usdtToken;
    mapping(address => Loan) public activeLoans;
    mapping(address => bool) public whitelist;
    
    uint256 public availableLiquidity;
    uint256 public globalDailyInterestRate;
    uint256 public totalHistoricalPoolSize;
    
    // USDT has 6 decimals on most L2s. So 20 USDT is 20 * 10^6
    uint256 public constant MAX_POOL_SIZE = 20 * 10**6;

    // --- Events ---
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 interestRate);
    event Repaid(address indexed user, uint256 amount);
    event WhitelistUpdated(address indexed user, bool isWhitelisted);
    event InterestRateUpdated(uint256 newRate);

    constructor(address initialOwner, address _usdtToken) Ownable(initialOwner) {
        usdtToken = IERC20(_usdtToken);
        // Initialize default global daily interest rate to 200 basis points (2%) 
        // 10000 = 100%
        globalDailyInterestRate = 200; 
    }

    // --- TASK-004: AccessController and Whitelist logic ---

    function addToWhitelist(address user) external onlyOwner {
        whitelist[user] = true;
        emit WhitelistUpdated(user, true);
    }

    function removeFromWhitelist(address user) external onlyOwner {
        whitelist[user] = false;
        emit WhitelistUpdated(user, false);
    }

    function setInterestRate(uint256 dailyRate) external onlyOwner {
        globalDailyInterestRate = dailyRate;
        emit InterestRateUpdated(dailyRate);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- TASK-005: Deposit and Withdraw logic ---

    function deposit(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (totalHistoricalPoolSize + amount > MAX_POOL_SIZE) {
            revert ExceedsMaxPoolSize();
        }

        totalHistoricalPoolSize += amount;
        availableLiquidity += amount;
        
        usdtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (amount > availableLiquidity) {
            revert InsufficientAvailableLiquidity();
        }
        
        availableLiquidity -= amount;
        
        usdtToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    // --- TASK-006: Borrow logic ---

    function borrow(uint256 amount) external whenNotPaused {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (!whitelist[msg.sender]) {
            revert NotWhitelisted();
        }
        if (activeLoans[msg.sender].principal > 0) {
            revert LoanAlreadyActive();
        }
        if (amount > availableLiquidity) {
            revert InsufficientLiquidity();
        }

        availableLiquidity -= amount;
        
        activeLoans[msg.sender] = Loan({
            principal: amount,
            startTime: block.timestamp,
            dailyInterestRate: globalDailyInterestRate
        });

        usdtToken.safeTransfer(msg.sender, amount);
        
        emit Borrowed(msg.sender, amount, globalDailyInterestRate);
    }

    // --- TASK-007: Repay and Interest logic ---

    function repay() external {
        Loan memory loan = activeLoans[msg.sender];
        if (loan.principal == 0) {
            revert NoActiveLoan();
        }

        uint256 timeElapsed = block.timestamp - loan.startTime;
        
        // Simple interest: Principal * Rate * Time / (10000 * SecondsInDay)
        // Rate is in basis points (10000 = 100%)
        uint256 interest = (loan.principal * loan.dailyInterestRate * timeElapsed) / (10000 * 86400);
        uint256 totalRepayment = loan.principal + interest;

        // Ensure user has approved enough
        if (usdtToken.allowance(msg.sender, address(this)) < totalRepayment) {
            revert InsufficientAllowance();
        }

        delete activeLoans[msg.sender];
        availableLiquidity += totalRepayment;
        
        usdtToken.safeTransferFrom(msg.sender, address(this), totalRepayment);
        
        emit Repaid(msg.sender, totalRepayment);
    }
}
