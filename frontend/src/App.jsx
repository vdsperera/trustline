import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './index.css'
import abis from './abis.json'
import { parseError, calculateRemainingCapacity, validateDepositAmount } from './utils.js'

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState('')
  const [contractsData, setContractsData] = useState(null)
  
  const [poolContract, setPoolContract] = useState(null)
  const [usdtContract, setUsdtContract] = useState(null)
  
  const [isOwner, setIsOwner] = useState(false)
  const [poolLiquidity, setPoolLiquidity] = useState('0')
  const [userBalance, setUserBalance] = useState('0')
  const [activeLoan, setActiveLoan] = useState(null)
  
  const [whitelistAddress, setWhitelistAddress] = useState('')
  const [whitelistName, setWhitelistName] = useState('')
  const [whitelistedFriends, setWhitelistedFriends] = useState(() => {
    try {
      const saved = localStorage.getItem('trustline_whitelisted_friends')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [friendsDetails, setFriendsDetails] = useState({})
  const [borrowAmount, setBorrowAmount] = useState('5')
  const [depositAmount, setDepositAmount] = useState('20')
  const [remainingDepositCapacity, setRemainingDepositCapacity] = useState('20')
  
  // Exchange Rate State (defaults to 333.14 LKR/USDT)
  const [lkrRate, setLkrRate] = useState(() => {
    try {
      return localStorage.getItem('trustline_lkr_rate') || '333.14'
    } catch {
      return '333.14'
    }
  })
  const [rateInput, setRateInput] = useState(() => {
    try {
      return localStorage.getItem('trustline_lkr_rate') || '333.14'
    } catch {
      return '333.14'
    }
  })
  
  // UX States
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    // Load contract data from Env and static ABI
    if (import.meta.env.VITE_POOL_ADDRESS && import.meta.env.VITE_USDT_ADDRESS) {
      setContractsData({
        poolAddress: import.meta.env.VITE_POOL_ADDRESS,
        usdtAddress: import.meta.env.VITE_USDT_ADDRESS,
        poolAbi: abis.poolAbi,
        usdtAbi: abis.usdtAbi
      })
    } else {
      console.error('Environment variables for contract addresses are missing!')
    }
  }, [])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true)
        const _provider = new ethers.BrowserProvider(window.ethereum)
        await _provider.send("eth_requestAccounts", [])
        const _signer = await _provider.getSigner()
        const _address = await _signer.getAddress()
        
        setProvider(_provider)
        setSigner(_signer)
        setAddress(_address)
        
        if (contractsData) {
          const _pool = new ethers.Contract(contractsData.poolAddress, contractsData.poolAbi, _signer)
          const _usdt = new ethers.Contract(contractsData.usdtAddress, contractsData.usdtAbi, _signer)
          
          setPoolContract(_pool)
          setUsdtContract(_usdt)
          
          const ownerAddr = await _pool.owner()
          const isCurrentOwner = ownerAddr.toLowerCase() === _address.toLowerCase()
          setIsOwner(isCurrentOwner)
          
          await refreshData(_pool, _usdt, _address, isCurrentOwner)
          addToast("Wallet connected successfully!")
        }
      } catch (error) {
        addToast(error.message || "User rejected request", 'error')
      } finally {
        setLoading(false)
      }
    } else {
      addToast("Please install MetaMask!", 'error')
    }
  }

  const refreshData = async (_pool = poolContract, _usdt = usdtContract, _addr = address, _isOwner = isOwner) => {
    if (!_pool || !_usdt || !_addr) return
    try {
      const liq = await _pool.availableLiquidity()
      const decimals = await _usdt.decimals()
      
      setPoolLiquidity(ethers.formatUnits(liq, decimals))
      
      const bal = await _usdt.balanceOf(_addr)
      setUserBalance(ethers.formatUnits(bal, decimals))

      try {
        const maxPool = await _pool.MAX_POOL_SIZE()
        const totalHistorical = await _pool.totalHistoricalPoolSize()
        const remaining = calculateRemainingCapacity(maxPool, totalHistorical)
        setRemainingDepositCapacity(ethers.formatUnits(remaining, decimals))
      } catch (err) {
        console.error("Could not fetch pool capacity:", err)
      }
      
      const loan = await _pool.activeLoans(_addr)
      if (loan.principal > 0n) {
        // Calculate interest manually since there is no view function on the contract
        const now = Math.floor(Date.now() / 1000)
        const timeElapsed = BigInt(now) - loan.startTime
        const interest = (loan.principal * loan.dailyInterestRate * timeElapsed) / 864000000n
        const totalDebt = loan.principal + interest
        
        setActiveLoan({
          principal: ethers.formatUnits(loan.principal, decimals),
          totalDebt: ethers.formatUnits(totalDebt, decimals),
          interestAccrued: ethers.formatUnits(interest, decimals),
          interestRate: (Number(loan.dailyInterestRate) / 100).toFixed(2),
          startTimeRaw: Number(loan.startTime) * 1000,
          startTimeStr: new Date(Number(loan.startTime) * 1000).toLocaleString()
        })
      } else {
        setActiveLoan(null)
      }

      // Check on-chain status of friends in directory if owner
      if (_isOwner) {
        try {
          // 1. Load saved friends/aliases from localStorage
          const saved = JSON.parse(localStorage.getItem('trustline_whitelisted_friends') || '[]')
          const addressMap = new Map()

          for (const item of saved) {
            if (item.address && ethers.isAddress(item.address)) {
              addressMap.set(item.address.toLowerCase(), {
                name: item.name || '',
                rawName: item.name || '',
                address: ethers.getAddress(item.address)
              })
            }
          }

          // 2. Query historical on-chain WhitelistUpdated events
          try {
            const filter = _pool.filters.WhitelistUpdated()
            const logs = await _pool.queryFilter(filter, 0)
            for (const log of logs) {
              const uAddr = log.args?.user
              if (uAddr && ethers.isAddress(uAddr)) {
                const lower = uAddr.toLowerCase()
                if (!addressMap.has(lower)) {
                  addressMap.set(lower, {
                    name: `Friend (${uAddr.slice(0, 6)}...${uAddr.slice(-4)})`,
                    rawName: '',
                    address: ethers.getAddress(uAddr)
                  })
                }
              }
            }
          } catch (eventErr) {
            console.warn("Could not query historical WhitelistUpdated events:", eventErr)
          }

          // 3. Check live on-chain status & loan for all discovered addresses
          const detailsMap = {}
          const mergedFriends = []

          for (const [lower, friend] of addressMap.entries()) {
            try {
              const isW = await _pool.whitelist(friend.address)
              const fLoan = await _pool.activeLoans(friend.address)
              const hasActiveLoan = fLoan.principal > 0n
              
              let loanDetails = {
                isWhitelisted: isW,
                hasActiveLoan
              }

              if (hasActiveLoan) {
                const now = Math.floor(Date.now() / 1000)
                const timeElapsed = BigInt(now) - fLoan.startTime
                const interest = (fLoan.principal * fLoan.dailyInterestRate * timeElapsed) / 864000000n
                const totalDebt = fLoan.principal + interest
                const hours = Math.floor(Number(timeElapsed) / 3600)
                const days = (hours / 24).toFixed(1)

                loanDetails = {
                  ...loanDetails,
                  principal: ethers.formatUnits(fLoan.principal, decimals),
                  interestAccrued: ethers.formatUnits(interest, decimals),
                  totalDebt: ethers.formatUnits(totalDebt, decimals),
                  interestRate: (Number(fLoan.dailyInterestRate) / 100).toFixed(2),
                  startTimeStr: new Date(Number(fLoan.startTime) * 1000).toLocaleString(),
                  durationStr: hours >= 24 ? `${days} days (${hours}h)` : `${hours} hours`
                }
              }

              detailsMap[lower] = loanDetails
              mergedFriends.push({
                name: friend.name || `Friend (${friend.address.slice(0, 6)}...${friend.address.slice(-4)})`,
                rawName: friend.rawName || '',
                address: friend.address
              })
            } catch (err) {
              console.error("Failed to query status for", friend.address, err)
            }
          }

          setWhitelistedFriends(mergedFriends)
          setFriendsDetails(detailsMap)
        } catch (err) {
          console.error("Failed to refresh whitelisted friends:", err)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeposit = async () => {
    if (!usdtContract || !poolContract || !depositAmount) return
    try {
      setLoading(true)
      const validation = validateDepositAmount(depositAmount, remainingDepositCapacity)
      if (!validation.valid) {
        addToast(validation.error, 'error')
        return
      }

      const decimals = await usdtContract.decimals()
      const amount = ethers.parseUnits(depositAmount, decimals)
      
      const tx1 = await usdtContract.approve(contractsData.poolAddress, amount)
      await tx1.wait()
      
      const tx2 = await poolContract.deposit(amount)
      await tx2.wait()
      
      await refreshData()
      addToast(`Successfully deposited ${depositAmount} USDT!`)
    } catch (e) {
      addToast(parseError(e, poolContract?.interface), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleWhitelistAdd = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!poolContract || !whitelistAddress) return
    const cleanAddr = whitelistAddress.trim()
    if (!ethers.isAddress(cleanAddr)) {
      addToast("Please enter a valid wallet address", 'error')
      return
    }
    const cleanName = whitelistName.trim() || `Friend (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`

    try {
      setLoading(true)
      const tx = await poolContract.addToWhitelist(cleanAddr)
      await tx.wait()

      const existingIdx = whitelistedFriends.findIndex(f => f.address.toLowerCase() === cleanAddr.toLowerCase())
      let updated
      if (existingIdx >= 0) {
        updated = [...whitelistedFriends]
        updated[existingIdx] = { ...updated[existingIdx], name: cleanName, rawName: whitelistName.trim() }
      } else {
        updated = [...whitelistedFriends, { name: cleanName, rawName: whitelistName.trim(), address: cleanAddr }]
      }
      setWhitelistedFriends(updated)
      try {
        localStorage.setItem('trustline_whitelisted_friends', JSON.stringify(
          updated.map(f => ({ name: f.rawName || f.name, address: f.address }))
        ))
      } catch (err) {
        console.error("Failed to save to localStorage:", err)
      }

      setWhitelistAddress('')
      setWhitelistName('')
      await refreshData()
      addToast(`${cleanName} whitelisted successfully!`)
    } catch (e) {
      addToast(parseError(e, poolContract?.interface), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleWhitelistRemove = async (targetAddress, friendName) => {
    if (!poolContract || !targetAddress) return
    try {
      setLoading(true)
      const tx = await poolContract.removeFromWhitelist(targetAddress)
      await tx.wait()
      await refreshData()
      addToast(`${friendName || 'Friend'} removed from whitelist!`)
    } catch (e) {
      addToast(parseError(e, poolContract?.interface), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRenameContact = (targetAddress, currentName) => {
    const defaultVal = currentName.startsWith("Friend (") ? "" : currentName
    const newName = window.prompt("Enter a nickname for this friend:", defaultVal)
    if (newName === null) return
    const trimmed = newName.trim()
    const displayName = trimmed || `Friend (${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)})`

    const updated = whitelistedFriends.map(f => 
      f.address.toLowerCase() === targetAddress.toLowerCase() 
        ? { ...f, name: displayName, rawName: trimmed }
        : f
    )
    setWhitelistedFriends(updated)

    try {
      localStorage.setItem('trustline_whitelisted_friends', JSON.stringify(
        updated.map(f => ({ name: f.rawName || f.name, address: f.address }))
      ))
    } catch (err) {
      console.error("Failed to save renamed friend to localStorage:", err)
    }
    addToast(`Updated nickname to "${displayName}"`)
  }

  const handleDeleteContact = (targetAddress, isWhitelistedOnChain) => {
    if (isWhitelistedOnChain) {
      addToast("Address is still active on-chain. Click 'Revoke' first to remove permissions.", 'error')
      return
    }
    const updated = whitelistedFriends.filter(f => f.address.toLowerCase() !== targetAddress.toLowerCase())
    setWhitelistedFriends(updated)
    try {
      localStorage.setItem('trustline_whitelisted_friends', JSON.stringify(
        updated.map(f => ({ name: f.rawName || f.name, address: f.address }))
      ))
    } catch (err) {
      console.error("Failed to update localStorage:", err)
    }
    addToast("Removed from directory")
  }

  const handleSaveRate = () => {
    const num = parseFloat(rateInput)
    if (!num || isNaN(num) || num <= 0) {
      addToast("Please enter a valid positive exchange rate", 'error')
      return
    }
    const formatted = num.toFixed(2)
    setLkrRate(formatted)
    setRateInput(formatted)
    try {
      localStorage.setItem('trustline_lkr_rate', formatted)
    } catch (e) {
      console.error("Failed to save rate to localStorage:", e)
    }
    addToast(`Exchange rate updated to 1 USDT = ${formatted} LKR`)
  }

  const handleBorrow = async () => {
    if (!poolContract || !borrowAmount) return
    try {
      setLoading(true)
      const decimals = await usdtContract.decimals()
      const amount = ethers.parseUnits(borrowAmount, decimals)
      const tx = await poolContract.borrow(amount)
      await tx.wait()
      await refreshData()
      addToast(`Successfully borrowed ${borrowAmount} USDT!`)
      setBorrowAmount('5')
    } catch (e) {
      addToast(parseError(e, poolContract?.interface), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRepay = async () => {
    if (!poolContract || !usdtContract) return
    try {
      setLoading(true)
      const loan = await poolContract.activeLoans(address)
      const now = Math.floor(Date.now() / 1000)
      const timeElapsed = BigInt(now) - loan.startTime
      const interest = (loan.principal * loan.dailyInterestRate * timeElapsed) / 864000000n
      // Approve slightly more (5 minutes of extra interest) to ensure transaction doesn't fail while mining
      const buffer = (loan.principal * loan.dailyInterestRate * 300n) / 864000000n
      const maxApproval = loan.principal + interest + buffer
      
      const tx1 = await usdtContract.approve(contractsData.poolAddress, maxApproval)
      await tx1.wait()
      
      const tx2 = await poolContract.repay()
      await tx2.wait()
      
      await refreshData()
      addToast("Loan successfully repaid!")
    } catch (e) {
      addToast(parseError(e, poolContract?.interface), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Trustline</h1>
        {!address ? (
          <button className="btn" onClick={connectWallet} disabled={loading}>
            {loading ? <div className="spinner"></div> : "Connect Wallet"}
          </button>
        ) : (
          <div className="badge">
            <div style={{width: 8, height: 8, borderRadius: '50%', background: 'var(--success)'}}></div>
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
      </header>

      {!address && (
        <div className="hero">
          <h1>Peer-to-Peer Loans, Reimagined</h1>
          <p>Trustline is a decentralized liquidity pool that allows whitelisted friends to borrow and repay USDT seamlessly.</p>
          <button className="btn" onClick={connectWallet} disabled={loading} style={{padding: '1rem 2rem', fontSize: '1.1rem'}}>
            {loading ? <div className="spinner"></div> : "Connect Wallet to Start"}
          </button>
        </div>
      )}

      {address && !contractsData && (
        <div className="card highlight">
          <h2>Configuration Missing</h2>
          <p style={{color: 'var(--text-muted)'}}>Contract data not found. Please ensure your deployment script exported the ABI.</p>
        </div>
      )}

      {address && contractsData && (
        <>
          <div className="grid">
            <div className="card">
              <h2>My Wallet</h2>
              <div className="stat">
                <span className="stat-label">USDT Balance</span>
                <span className="stat-value">{userBalance}</span>
                <span className="sub-lkr" style={{marginTop: '0.25rem'}}>
                  ≈ LKR {Math.round(Number(userBalance) * Number(lkrRate)).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="card">
              <h2>Pool Liquidity</h2>
              <div className="stat">
                <span className="stat-label">Available to Borrow</span>
                <span className="stat-value highlight">{poolLiquidity}</span>
                <span className="sub-lkr" style={{marginTop: '0.25rem'}}>
                  ≈ LKR {Math.round(Number(poolLiquidity) * Number(lkrRate)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="card highlight">
              <div className="admin-header-row">
                <div>
                  <h2>Admin Dashboard</h2>
                  <p style={{color: 'var(--text-muted)', marginBottom: '0.5rem'}}>You are connected as the pool owner.</p>
                </div>
                <div className="rate-setting-bar">
                  <span className="rate-label">Rate: 1 USDT =</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="1" 
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="rate-input"
                    placeholder="333.14"
                  />
                  <span className="rate-currency">LKR</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleSaveRate}
                    disabled={!rateInput || Number(rateInput) <= 0 || rateInput === lkrRate}
                  >
                    Save
                  </button>
                </div>
              </div>
              
              <div className="grid">
                <div>
                  <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Liquidity Management</h3>
                  <div className="input-group">
                    <input 
                      type="number" 
                      min="0.1"
                      step="0.1"
                      placeholder="Amount (USDT)" 
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <button 
                      className="btn btn-secondary btn-max" 
                      type="button"
                      onClick={() => setDepositAmount(remainingDepositCapacity)}
                      disabled={loading || Number(remainingDepositCapacity) <= 0}
                      title="Set to max remaining capacity"
                    >
                      Max
                    </button>
                    <button 
                      className="btn" 
                      onClick={handleDeposit} 
                      disabled={
                        loading || 
                        !depositAmount || 
                        Number(depositAmount) <= 0 || 
                        (Number(remainingDepositCapacity) > 0 && Number(depositAmount) > Number(remainingDepositCapacity)) ||
                        Number(remainingDepositCapacity) <= 0
                      }
                    >
                      {loading ? <div className="spinner"></div> : "Deposit"}
                    </button>
                  </div>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                    {Number(remainingDepositCapacity) <= 0 
                      ? "Pool is at maximum capacity (20 USDT)" 
                      : `Remaining deposit capacity: ${remainingDepositCapacity} USDT`}
                  </p>
                </div>
                
                <div>
                  <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Add Whitelisted Friend</h3>
                  <div className="input-group">
                    <input 
                      type="text" 
                      placeholder="Friend Name / Alias (e.g. Kasun)" 
                      value={whitelistName}
                      onChange={(e) => setWhitelistName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <input 
                      type="text" 
                      placeholder="Wallet address (0x...)" 
                      value={whitelistAddress}
                      onChange={(e) => setWhitelistAddress(e.target.value)}
                    />
                    <button className="btn" onClick={handleWhitelistAdd} disabled={loading || !whitelistAddress}>
                      {loading ? <div className="spinner"></div> : "Add"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="friends-directory">
                <div className="friends-directory-header">
                  <h3 style={{fontSize: '1rem', color: 'var(--text-muted)'}}>
                    Whitelisted Friends Directory ({whitelistedFriends.length})
                  </h3>
                </div>

                {whitelistedFriends.length === 0 ? (
                  <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', margin: '0.5rem 0'}}>
                    No friends in directory yet. Add a friend's name and address above to track and grant borrowing permissions.
                  </p>
                ) : (
                  <div className="friends-list">
                    {whitelistedFriends.map((friend) => {
                      const details = friendsDetails[friend.address.toLowerCase()] || {}
                      const isWhitelistedOnChain = details.isWhitelisted
                      const hasActiveLoan = details.hasActiveLoan

                      return (
                        <div key={friend.address} className="friend-card">
                          <div className="friend-card-main">
                            <div className="friend-info">
                              <div className="friend-header">
                                <span className="friend-name">{friend.name}</span>
                                <button 
                                  className="btn-icon-inline"
                                  onClick={() => handleRenameContact(friend.address, friend.name)}
                                  title="Edit nickname"
                                  type="button"
                                >
                                  ✏️
                                </button>
                                {isWhitelistedOnChain ? (
                                  <span className="badge-status badge-active">Whitelisted</span>
                                ) : (
                                  <span className="badge-status badge-inactive">Not Whitelisted</span>
                                )}
                                {hasActiveLoan && (
                                  <span className="badge-status badge-loan">Active Loan: {details.principal} USDT</span>
                                )}
                              </div>
                              <div className="friend-address" title={friend.address}>
                                <code>{friend.address.slice(0, 8)}...{friend.address.slice(-6)}</code>
                              </div>
                            </div>

                            <div className="friend-actions">
                              {isWhitelistedOnChain ? (
                                <button 
                                  className="btn btn-secondary btn-sm btn-danger-outline" 
                                  onClick={() => handleWhitelistRemove(friend.address, friend.name)}
                                  disabled={loading}
                                  title="Revoke borrowing permission on-chain"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  onClick={() => {
                                    setWhitelistName(friend.rawName || (friend.name.startsWith("Friend (") ? "" : friend.name))
                                    setWhitelistAddress(friend.address)
                                  }}
                                  disabled={loading}
                                  title="Fill into form to re-add on-chain"
                                >
                                  Re-add
                                </button>
                              )}
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{padding: '0.45rem 0.7rem'}}
                                onClick={() => handleDeleteContact(friend.address, isWhitelistedOnChain)}
                                title="Delete from local directory"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {hasActiveLoan && (
                            <div className="friend-loan-details">
                              <div className="loan-detail-grid">
                                <div className="loan-detail-item">
                                  <span className="loan-detail-label">Principal</span>
                                  <span className="loan-detail-value">{details.principal} USDT</span>
                                </div>
                                <div className="loan-detail-item">
                                  <span className="loan-detail-label">Interest ({details.interestRate}% Daily)</span>
                                  <span className="loan-detail-value danger">+{details.interestAccrued} USDT</span>
                                </div>
                                <div className="loan-detail-item">
                                  <span className="loan-detail-label">Total Debt Owed</span>
                                  <span className="loan-detail-value highlight-debt">
                                    {details.totalDebt} USDT 
                                    <span className="sub-lkr"> (≈ LKR {Math.round(Number(details.totalDebt) * Number(lkrRate)).toLocaleString()})</span>
                                  </span>
                                </div>
                                <div className="loan-detail-item">
                                  <span className="loan-detail-label">Loan Duration</span>
                                  <span className="loan-detail-value muted" title={details.startTimeStr}>
                                    {details.durationStr}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <h2>Borrower Dashboard</h2>
              <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                You must be whitelisted by the owner to borrow funds.
              </p>
              
              {activeLoan ? (
                <div>
                  <div className="grid">
                    <div className="stat">
                      <span className="stat-label">Principal Borrowed</span>
                      <span className="stat-value">{activeLoan.principal} USDT</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Interest Accrued ({activeLoan.interestRate}% Daily)</span>
                      <span className="stat-value danger">+{activeLoan.interestAccrued} USDT</span>
                    </div>
                  </div>
                  
                  <div className="card highlight" style={{marginTop: '1rem', padding: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span style={{color: 'var(--text-muted)'}}>Loan Started</span>
                      <span>{activeLoan.startTimeStr}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                      <span style={{color: 'var(--text-muted)'}}>Time Elapsed</span>
                      <span>{Math.floor((Date.now() - activeLoan.startTimeRaw) / (1000 * 60 * 60))} hours</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem'}}>
                      <strong style={{fontSize: '1.2rem'}}>Total Debt</strong>
                      <div style={{textAlign: 'right'}}>
                        <strong style={{fontSize: '1.2rem', color: 'var(--danger)'}}>{activeLoan.totalDebt} USDT</strong>
                        <div className="sub-lkr" style={{fontSize: '0.85rem'}}>
                          ≈ LKR {Math.round(Number(activeLoan.totalDebt) * Number(lkrRate)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-danger" onClick={handleRepay} disabled={loading} style={{width: '100%', marginTop: '1rem'}}>
                    {loading ? <div className="spinner"></div> : "Repay Full Amount"}
                  </button>
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '1rem 0'}}>
                  <h3 style={{fontSize: '1.5rem', marginBottom: '1.5rem'}}>Request a Loan</h3>
                  <div className="input-group" style={{maxWidth: '300px', margin: '0 auto'}}>
                    <input 
                      type="number" 
                      min="0.1"
                      step="0.1"
                      placeholder="Amount (USDT)" 
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                    />
                    <button className="btn" onClick={handleBorrow} disabled={loading || !borrowAmount || Number(borrowAmount) <= 0 || Number(borrowAmount) > Number(poolLiquidity)}>
                      {loading ? <div className="spinner"></div> : "Borrow"}
                    </button>
                  </div>
                  <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem'}}>
                    Max available: {poolLiquidity} USDT
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
