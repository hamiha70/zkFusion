import React from 'react'
import { useAuction } from '../hooks/useAuction'
import { Gavel, Target, Zap, Clock, DollarSign, Shield, TrendingUp } from 'lucide-react'

const UnifiedDashboard = () => {
  const { auction, bids, contracts, zkProof, settlement } = useAuction()

  const winningBids = bids.filter(bid => bid.status === 'winning')
  const losingBids = bids.filter(bid => bid.status === 'losing')

  return (
    <div className="h-screen p-8">
      {/* 2-COLUMN LAYOUT: Left (3 sections) | Right (Auction Results) */}
      <div className="h-full grid grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: 3 sections stacked */}
        <div className="space-y-8">
          
          {/* TOP: Maker Intent */}
          <div className="card-glow p-8">
            <div className="flex items-center space-x-4 border-b border-zk-primary/20 pb-6 mb-8">
              <Gavel className="text-zk-accent" size={48} />
              <h2 className="text-6xl font-bold text-white">✨ Maker Intent</h2>
            </div>

            <div className="space-y-6">
              <h3 className="text-4xl font-semibold text-zk-accent">✨ Intent Configuration</h3>
              <div className="card-glow-accent p-6 space-y-4 text-5xl">
                <div className="flex justify-between">
                  <span className="text-gray-300">Asset Pair:</span>
                  <span className="font-bold text-white">{auction.asset} → {auction.targetAsset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Selling:</span>
                  <span className="font-bold text-emerald-400">{auction.amount} {auction.asset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Min Price:</span>
                  <span className="font-bold text-amber-400">{auction.minPrice} {auction.targetAsset}/{auction.asset}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE: ZK Settlement */}
          <div className="card-glow p-8">
            <div className="flex items-center space-x-4 border-b border-zk-primary/20 pb-6 mb-8">
              <Zap className="text-zk-accent" size={48} />
              <h2 className="text-6xl font-bold text-white">✨ ZK Settlement</h2>
            </div>

            <div className="space-y-6">
              <h3 className="text-4xl font-semibold text-zk-accent">✨ ZK Proof Generation</h3>
              <div className="card-glow-accent p-6 space-y-4 text-5xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Status:</span>
                  <span className="status-success text-4xl">✅ COMPLETE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Time:</span>
                  <span className="font-bold text-emerald-400">{zkProof.generationTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Constraints:</span>
                  <span className="font-bold text-indigo-400">~{zkProof.constraints.toLocaleString()}</span>
                </div>
              </div>

              <h3 className="text-4xl font-semibold text-zk-secondary flex items-center">
                <DollarSign size={40} />
                <span className="ml-3">Settlement Results ✨</span>
              </h3>
              <div className="card-glow-accent p-6 space-y-4 text-5xl">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Sold:</span>
                  <span className="font-bold text-emerald-400">{settlement.totalSold} WETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Received:</span>
                  <span className="font-bold gradient-text">{settlement.totalReceived} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Winners:</span>
                  <span className="font-bold text-amber-400">#6, #1, #2, #3</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: Gas & Integration */}
          <div className="card-glow p-8">
            <div className="flex items-center space-x-4 border-b border-zk-primary/20 pb-6 mb-8">
              <Shield className="text-zk-gold" size={48} />
              <h2 className="text-6xl font-bold text-white">✨ Gas & Integration</h2>
            </div>

            <div className="space-y-6">
              <h3 className="text-4xl font-semibold text-zk-primary">⛽ Gas Analysis</h3>
              <div className="space-y-3 text-5xl">
                <div className="flex justify-between">
                  <span className="text-gray-300">ZK Verification:</span>
                  <span className="font-bold text-emerald-400">{zkProof.verificationGas.toLocaleString()} gas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Settlement:</span>
                  <span className="font-bold text-white">{settlement.settlementCost.toLocaleString()} gas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Cost @ 0.1 gwei:</span>
                  <span className="font-bold text-amber-400">${settlement.costUSD}</span>
                </div>
              </div>

              <h3 className="text-4xl font-semibold text-zk-gold">🔗 1inch Integration</h3>
              <div className="space-y-3 text-5xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className="status-success text-4xl">✅ SUBMITTED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Extension:</span>
                  <span className="font-bold text-white">1,322 bytes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Auction Results */}
        <div className="card-glow p-8">
          <div className="flex items-center space-x-4 border-b border-zk-primary/20 pb-6 mb-8">
            <Target className="text-zk-primary" size={48} />
            <h2 className="text-6xl font-bold text-white">✨ Auction Results</h2>
          </div>

          {/* Auction Overview */}
          <div className="text-center p-8 card-glow-accent mb-8">
            <div className="text-8xl font-bold gradient-text mb-4">
              {auction.amount} {auction.asset}
            </div>
            <div className="text-5xl text-gray-300">
              @ ≥{auction.minPrice} {auction.targetAsset}/{auction.asset}
            </div>
          </div>

          {/* All Bids: Winners + Losers */}
          <div className="space-y-6">
            <h3 className="text-4xl font-semibold text-zk-secondary flex items-center">
              <TrendingUp size={40} />
              <span className="ml-3">Winning Bids ✨</span>
            </h3>
            
            {/* 4 Winning Bids */}
            <div className="space-y-4">
              {winningBids.map((bid) => (
                <div key={bid.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-emerald-400 font-bold text-5xl">Bid #{bid.id} ✨</span>
                    <span className="status-success text-4xl">WINNING</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-5xl">
                    <div>
                      <span className="text-gray-400">Amount: </span>
                      <span className="font-bold text-white">{bid.amount} WETH</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price: </span>
                      <span className="font-bold text-emerald-400">{bid.price} USDC/WETH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-4xl font-semibold text-gray-400 mt-8">Losing Bids</h3>
            
            {/* 3 Losing Bids */}
            <div className="space-y-4">
              {losingBids.map((bid) => (
                <div key={bid.id} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-6 opacity-70">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 font-bold text-5xl">Bid #{bid.id}</span>
                    <span className="text-4xl text-red-400 bg-red-400/10 px-4 py-2 rounded">
                      {bid.reason}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-5xl">
                    <div>
                      <span className="text-gray-500">Amount: </span>
                      <span className="text-gray-300">{bid.amount} WETH</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Price: </span>
                      <span className="text-gray-300">{bid.price} USDC/WETH</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedDashboard