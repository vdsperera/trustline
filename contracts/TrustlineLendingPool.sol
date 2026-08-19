// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TrustlineLendingPool is Ownable, Pausable {

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

    // --- Structs ---
    struct Loan {
        uint256 principal;
        uint256 startTime;
        uint256 dailyInterestRate;
    }

    // --- State Variables ---
    mapping(address => Loan) public activeLoans;
    mapping(address => bool) public whitelist;
    uint256 public availableLiquidity;
    uint256 public globalDailyInterestRate;
    uint256 public totalHistoricalPoolSize;

    // --- Events ---
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 interestRate);
    event Repaid(address indexed user, uint256 amount);
    event WhitelistUpdated(address indexed user, bool isWhitelisted);
    event InterestRateUpdated(uint256 newRate);

    constructor(address initialOwner) Ownable(initialOwner) {
        // Initialize default global daily interest rate to 200 basis points (2%) if using basis points, 
        // or just rely on a set function later. We'll set it to 200 for now assuming basis points (10000 = 100%)
        globalDailyInterestRate = 200; 
    }

    // --- API Contracts / Stubs ---

    function deposit(uint256 amount) external onlyOwner {
        // empty stub
    }

    function withdraw(uint256 amount) external onlyOwner {
        // empty stub
    }

    function borrow(uint256 amount) external whenNotPaused {
        // empty stub
    }

    function repay() external {
        // empty stub
    }

    function addToWhitelist(address user) external onlyOwner {
        // empty stub
    }

    function removeFromWhitelist(address user) external onlyOwner {
        // empty stub
    }

    function setInterestRate(uint256 dailyRate) external onlyOwner {
        // empty stub
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
