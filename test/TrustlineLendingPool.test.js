import { expect } from "chai";
import hre from "hardhat";

describe("TrustlineLendingPool", function () {
  let usdt;
  let pool;
  let owner;
  let user1;
  let user2;

  const MAX_POOL_SIZE = 20n * 10n**6n; // 20 USDT

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    const Pool = await hre.ethers.getContractFactory("TrustlineLendingPool");
    pool = await Pool.deploy(owner.address, usdt.target);

    // Mint some USDT to owner and users for testing
    await usdt.mint(owner.address, 100n * 10n**6n);
    await usdt.mint(user1.address, 100n * 10n**6n);
    await usdt.mint(user2.address, 100n * 10n**6n);
  });

  describe("Access Controller & Whitelist", function () {
    it("Should allow owner to add/remove from whitelist", async function () {
      await pool.addToWhitelist(user1.address);
      expect(await pool.whitelist(user1.address)).to.be.true;

      await pool.removeFromWhitelist(user1.address);
      expect(await pool.whitelist(user1.address)).to.be.false;
    });

    it("Should prevent non-owners from updating whitelist", async function () {
      await expect(pool.connect(user1).addToWhitelist(user2.address))
        .to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause and unpause", async function () {
      await pool.pause();
      expect(await pool.paused()).to.be.true;

      await pool.unpause();
      expect(await pool.paused()).to.be.false;
    });

    it("Should allow owner to set interest rate", async function () {
      await pool.setInterestRate(300); // 3%
      expect(await pool.globalDailyInterestRate()).to.equal(300n);
    });
  });

  describe("Deposit & Withdraw", function () {
    beforeEach(async function () {
      // Approve pool to spend owner's USDT
      await usdt.connect(owner).approve(pool.target, MAX_POOL_SIZE);
    });

    it("Should allow owner to deposit up to MAX_POOL_SIZE", async function () {
      await pool.deposit(10n * 10n**6n);
      expect(await pool.availableLiquidity()).to.equal(10n * 10n**6n);
      expect(await pool.totalHistoricalPoolSize()).to.equal(10n * 10n**6n);

      await pool.deposit(10n * 10n**6n);
      expect(await pool.availableLiquidity()).to.equal(20n * 10n**6n);
    });

    it("Should revert if deposit exceeds MAX_POOL_SIZE", async function () {
      await pool.deposit(20n * 10n**6n);
      await usdt.connect(owner).approve(pool.target, 1n * 10n**6n);
      await expect(pool.deposit(1n * 10n**6n)).to.be.revertedWithCustomError(pool, "ExceedsMaxPoolSize");
    });

    it("Should revert if deposit amount is 0", async function () {
      await expect(pool.deposit(0n)).to.be.revertedWithCustomError(pool, "InvalidAmount");
    });

    it("Should allow owner to withdraw available liquidity", async function () {
      await pool.deposit(10n * 10n**6n);
      await pool.withdraw(5n * 10n**6n);
      expect(await pool.availableLiquidity()).to.equal(5n * 10n**6n);
    });

    it("Should revert if withdraw exceeds available liquidity", async function () {
      await pool.deposit(10n * 10n**6n);
      await expect(pool.withdraw(15n * 10n**6n)).to.be.revertedWithCustomError(pool, "InsufficientAvailableLiquidity");
    });

    it("Should revert if withdraw amount is 0", async function () {
      await pool.deposit(10n * 10n**6n);
      await expect(pool.withdraw(0n)).to.be.revertedWithCustomError(pool, "InvalidAmount");
    });

    it("Should revert non-owner deposits and withdrawals", async function () {
      await usdt.connect(user1).approve(pool.target, 10n * 10n**6n);
      await expect(pool.connect(user1).deposit(10n * 10n**6n)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
      await expect(pool.connect(user1).withdraw(10n * 10n**6n)).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
    });
  });

  describe("Borrow & Repay", function () {
    const DEPOSIT_AMOUNT = 20n * 10n**6n;
    const BORROW_AMOUNT = 5n * 10n**6n;

    beforeEach(async function () {
      // Owner deposits 20 USDT
      await usdt.connect(owner).approve(pool.target, DEPOSIT_AMOUNT);
      await pool.deposit(DEPOSIT_AMOUNT);
      
      // Whitelist user1
      await pool.addToWhitelist(user1.address);
    });

    it("Should allow whitelisted user to borrow", async function () {
      await pool.connect(user1).borrow(BORROW_AMOUNT);
      
      const loan = await pool.activeLoans(user1.address);
      expect(loan.principal).to.equal(BORROW_AMOUNT);
      expect(await pool.availableLiquidity()).to.equal(DEPOSIT_AMOUNT - BORROW_AMOUNT);
      expect(await usdt.balanceOf(user1.address)).to.equal(100n * 10n**6n + BORROW_AMOUNT);
    });

    it("Should revert if not whitelisted", async function () {
      await expect(pool.connect(user2).borrow(BORROW_AMOUNT))
        .to.be.revertedWithCustomError(pool, "NotWhitelisted");
    });

    it("Should revert if paused", async function () {
      await pool.pause();
      await expect(pool.connect(user1).borrow(BORROW_AMOUNT))
        .to.be.revertedWithCustomError(pool, "EnforcedPause");
    });

    it("Should revert if user already has an active loan", async function () {
      await pool.connect(user1).borrow(BORROW_AMOUNT);
      await expect(pool.connect(user1).borrow(BORROW_AMOUNT))
        .to.be.revertedWithCustomError(pool, "LoanAlreadyActive");
    });

    it("Should revert if pool has insufficient liquidity", async function () {
      await pool.connect(user1).borrow(20n * 10n**6n);
      await pool.addToWhitelist(user2.address);
      await expect(pool.connect(user2).borrow(1n * 10n**6n))
        .to.be.revertedWithCustomError(pool, "InsufficientLiquidity");
    });

    it("Should revert if borrow amount is 0", async function () {
      await expect(pool.connect(user1).borrow(0n))
        .to.be.revertedWithCustomError(pool, "InvalidAmount");
    });

    it("Should accurately calculate interest and repay loan", async function () {
      await pool.connect(user1).borrow(BORROW_AMOUNT);

      // Fast forward time by 10 days
      const daysToFastForward = 10;
      await hre.network.provider.send("evm_increaseTime", [daysToFastForward * 86400]);
      await hre.network.provider.send("evm_mine");

      // 5 USDT * 2% per day * 10 days = 1 USDT interest
      // 5,000,000 * 200 * 10 / 10000 = 1,000,000 (1 USDT)
      const expectedRepayment = 6n * 10n**6n; // 6 USDT

      // Approve pool to spend user1's USDT
      // Approve a generous amount to account for slightly more time elapsed (due to mining latency)
      await usdt.connect(user1).approve(pool.target, 10n * 10n**6n);

      await pool.connect(user1).repay();

      // Verify state changes
      const loan = await pool.activeLoans(user1.address);
      expect(loan.principal).to.equal(0n);
      
      const newLiquidity = await pool.availableLiquidity();
      // Liquidity should be original 20 + at least 1 USDT interest
      expect(newLiquidity).to.be.greaterThanOrEqual(DEPOSIT_AMOUNT + 1n * 10n**6n);
    });

    it("Should revert repay if user has no active loan", async function () {
      await expect(pool.connect(user1).repay())
        .to.be.revertedWithCustomError(pool, "NoActiveLoan");
    });

    it("Should revert repay if insufficient allowance", async function () {
      await pool.connect(user1).borrow(BORROW_AMOUNT);
      await expect(pool.connect(user1).repay())
        .to.be.revertedWithCustomError(pool, "InsufficientAllowance");
    });
  });
});
