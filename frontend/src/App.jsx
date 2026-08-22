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
      if (loan.active) {
        const totalDebt = await _pool.calculateInterest(_addr)
        setActiveLoan({
          principal: ethers.formatUnits(loan.principal, decimals),
          totalDebt: ethers.formatUnits(totalDebt, decimals),
          startTime: new Date(Number(loan.startTime) * 1000).toLocaleString()
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
    if (!poolContract) return
    try {
      setLoading(true)
      const decimals = await usdtContract.decimals()
      const amount = ethers.parseUnits("5", decimals)
      const tx = await poolContract.borrow(amount)
      await tx.wait()
      await refreshData()
      addToast("Successfully borrowed 5 USDT!")
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
      const debt = await poolContract.calculateInterest(address)
      
      const tx1 = await usdtContract.approve(contractsData.poolAddress, debt)
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
                      <span className="stat-value danger">{activeLoan.principal} USDT</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Debt (Incl. Interest)</span>
                      <span className="stat-value danger">{activeLoan.totalDebt} USDT</span>
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={handleRepay} disabled={loading} style={{width: '100%', marginTop: '1rem'}}>
                    {loading ? <div className="spinner"></div> : "Repay Full Amount"}
                  </button>
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '2rem 0'}}>
                  <h3 style={{fontSize: '2rem', marginBottom: '1.5rem'}}>Ready to borrow?</h3>
                  <button className="btn" onClick={handleBorrow} disabled={loading} style={{padding: '1rem 2rem'}}>
                    {loading ? <div className="spinner"></div> : "Borrow 5 USDT"}
                  </button>
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
