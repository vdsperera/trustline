import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './index.css'

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
  const [borrowAmount, setBorrowAmount] = useState('5')
  
  // UX States
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    // Load contract data
    fetch('/src/contracts.json')
      .then(res => res.json())
      .then(data => setContractsData(data))
      .catch(e => console.error('Contracts JSON not found. Deploy contracts first!', e))
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
          setIsOwner(ownerAddr.toLowerCase() === _address.toLowerCase())
          
          await refreshData(_pool, _usdt, _address)
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

  const refreshData = async (_pool = poolContract, _usdt = usdtContract, _addr = address) => {
    if (!_pool || !_usdt || !_addr) return
    try {
      const liq = await _pool.availableLiquidity()
      const decimals = await _usdt.decimals()
      
      setPoolLiquidity(ethers.formatUnits(liq, decimals))
      
      const bal = await _usdt.balanceOf(_addr)
      setUserBalance(ethers.formatUnits(bal, decimals))
      
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeposit = async () => {
    if (!usdtContract || !poolContract) return
    try {
      setLoading(true)
      const decimals = await usdtContract.decimals()
      const amount = ethers.parseUnits("20", decimals)
      
      const tx1 = await usdtContract.approve(contractsData.poolAddress, amount)
      await tx1.wait()
      
      const tx2 = await poolContract.deposit(amount)
      await tx2.wait()
      
      await refreshData()
      addToast("Successfully deposited 20 USDT!")
    } catch (e) {
      addToast(e.reason || e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleWhitelist = async () => {
    if (!poolContract || !whitelistAddress) return
    try {
      setLoading(true)
      const tx = await poolContract.addToWhitelist(whitelistAddress)
      await tx.wait()
      addToast(`Address whitelisted!`)
      setWhitelistAddress('')
    } catch (e) {
      addToast(e.reason || e.message, 'error')
    } finally {
      setLoading(false)
    }
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
      addToast(e.reason || e.message, 'error')
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
      addToast(e.reason || e.message, 'error')
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
              </div>
            </div>
            
            <div className="card">
              <h2>Pool Liquidity</h2>
              <div className="stat">
                <span className="stat-label">Available to Borrow</span>
                <span className="stat-value highlight">{poolLiquidity}</span>
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="card highlight">
              <h2>Admin Dashboard</h2>
              <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>You are connected as the pool owner.</p>
              
              <div className="grid">
                <div>
                  <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Liquidity Management</h3>
                  <button className="btn" onClick={handleDeposit} disabled={loading} style={{width: '100%'}}>
                    {loading ? <div className="spinner"></div> : "Deposit 20 USDT"}
                  </button>
                </div>
                
                <div>
                  <h3 style={{marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)'}}>Access Control</h3>
                  <div className="input-group">
                    <input 
                      type="text" 
                      placeholder="Enter wallet address (0x...)" 
                      value={whitelistAddress}
                      onChange={(e) => setWhitelistAddress(e.target.value)}
                    />
                    <button className="btn" onClick={handleWhitelist} disabled={loading || !whitelistAddress}>
                      {loading ? <div className="spinner"></div> : "Add"}
                    </button>
                  </div>
                </div>
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
                    <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem'}}>
                      <strong style={{fontSize: '1.2rem'}}>Total Debt</strong>
                      <strong style={{fontSize: '1.2rem', color: 'var(--danger)'}}>{activeLoan.totalDebt} USDT</strong>
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
