import React from 'react'
import { useAuction } from '../hooks/useAuction'
import { Gavel, Target, Zap, Clock, DollarSign, Shield, TrendingUp } from 'lucide-react'

const UnifiedDashboard = () => {
  const { auction, bids, contracts, zkProof, settlement } = useAuction()

  const winningBids = bids.filter(bid => bid.status === 'winning')
  const losingBids = bids.filter(bid => bid.status === 'losing')

  return (
    <div className="h-screen flex flex-col">
      {/* Main 3-column layout - optimized for 4K */}
      <div className="flex-1 grid grid-cols-3 gap-6 p-6">
        
        {/* LEFT SECTION: Maker Intent Dashboard */}
        <div className="card-glow space-y-4">
          <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
            <Gavel className="text-zk-accent" size={28} />
            <h2 className="text-3xl font-bold text-white">✨ Maker Intent</h2>
          </div>

          {/* Intent Configuration */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-accent flex items-center">
              <span>✨ Intent Configuration</span>
            </h3>
            <div className="card-glow-accent p-4 space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-gray-400">Asset Pair:</span>
                <span className="font-semibold text-white">{auction.asset} → {auction.targetAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Selling:</span>
                <span className="font-semibold text-zk-secondary">{auction.amount} {auction.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Min Price:</span>
                <span className="font-semibold text-amber-400">{auction.minPrice} {auction.targetAsset}/{auction.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Bidders:</span>
                <span className="font-semibold text-white">{auction.maxBidders}</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Status */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-secondary flex items-center">
              <Shield size={20} />
              <span className="ml-2">Infrastructure ✨</span>
            </h3>
            <div className="space-y-2 text-base">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Factory:</span>
                <div className="flex items-center space-x-1">
                  <span className="mono-address">{contracts.factory.slice(0, 8)}...</span>
                  <span className="status-success">DEPLOYED</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Commitment:</span>
                <div className="flex items-center space-x-1">
                  <span className="mono-address">{contracts.commitment.slice(0, 8)}...</span>
                  <span className="status-success">CREATED</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Verifier:</span>
                <div className="flex items-center space-x-1">
                  <span className="mono-address">{contracts.verifier.slice(0, 8)}...</span>
                  <span className="status-success">READY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Status */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-primary flex items-center">
              <Clock size={20} />
              <span className="ml-2">Auction Status</span>
            </h3>
            <div className="card-glow-accent p-4 space-y-3 text-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="status-success">🟢 LIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bids:</span>
                <span className="font-semibold text-amber-400">{bids.length}/{auction.maxBidders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Best Offer:</span>
                <span className="font-semibold text-emerald-400">1800 USDC/WETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. Settlement:</span>
                <span className="font-semibold gradient-text">{settlement.totalReceived} USDC</span>
              </div>
            </div>
            <button className="sparkle-button w-full text-lg py-3">
              ⚡ Settle Auction
            </button>
          </div>
        </div>

        {/* MIDDLE SECTION: ZK Dutch Auction Results */}
        <div className="card-glow space-y-4">
          <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
            <Target className="text-zk-primary" size={28} />
            <h2 className="text-3xl font-bold text-white">✨ ZK Dutch Auction Results</h2>
          </div>

          {/* Auction Overview */}
          <div className="text-center p-5 card-glow-accent">
            <div className="text-4xl font-bold gradient-text">
              {auction.amount} {auction.asset}
            </div>
            <div className="text-lg text-gray-300">
              @ ≥{auction.minPrice} {auction.targetAsset}/{auction.asset}
            </div>
          </div>

          {/* Winning Bids */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-secondary flex items-center justify-between">
              <span className="flex items-center">
                <TrendingUp size={24} />
                <span className="ml-2">Winning Bids ✨</span>
              </span>
              <span className="text-base text-gray-300">(reordered by price)</span>
            </h3>
            <div className="space-y-4">
              {winningBids.map((bid) => (
                <div key={bid.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-semibold text-lg">Bid #{bid.id}</span>
                      <span className="text-base">✨</span>
                    </div>
                    <span className="status-success text-base">WINNING</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-base">
                    <div>
                      <span className="text-gray-400">Amount: </span>
                      <span className="font-semibold text-white">{bid.amount} WETH</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price: </span>
                      <span className="font-semibold text-emerald-400">{bid.price} USDC/WETH</span>
                    </div>
                  </div>
                  <div className="mt-3 text-base">
                    <span className="text-gray-400">Bidder: </span>
                    <span className="mono-address text-base">{bid.bidder.slice(0, 10)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losing Bids */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-400">Losing Bids</h3>
            <div className="space-y-3">
              {losingBids.map((bid) => (
                <div key={bid.id} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 opacity-70">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 font-semibold text-lg">Bid #{bid.id}</span>
                    <span className="text-base text-red-400 bg-red-400/10 px-3 py-1 rounded">
                      {bid.reason}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-base">
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

        {/* RIGHT SECTION: ZK Settlement */}
        <div className="card-glow space-y-4">
          <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
            <Zap className="text-zk-accent" size={28} />
            <h2 className="text-3xl font-bold text-white">✨ ZK Settlement</h2>
          </div>

          {/* ZK Proof Status */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-accent">
              ✨ ZK Proof Generation
            </h3>
            <div className="card-glow-accent p-4 space-y-3 text-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <span className="status-success">✅ COMPLETE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time:</span>
                <span className="font-semibold text-emerald-400">{zkProof.generationTime}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Size:</span>
                <span className="font-semibold text-white">{zkProof.proofSize} bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Constraints:</span>
                <span className="font-semibold text-indigo-400">~{zkProof.constraints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hardware:</span>
                <span className="text-xs text-white">Dell XPS15</span>
              </div>
            </div>
          </div>

          {/* Settlement Results */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-secondary flex items-center">
              <DollarSign size={20} />
              <span className="ml-2">Settlement Results ✨</span>
            </h3>
            <div className="card-glow-accent p-4 space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Sold:</span>
                <span className="font-semibold text-emerald-400">{settlement.totalSold} WETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Received:</span>
                <span className="font-semibold gradient-text">{settlement.totalReceived} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Winners:</span>
                <span className="font-semibold text-amber-400">#6, #1, #2, #3</span>
              </div>
            </div>
          </div>

          {/* Gas Analysis */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-primary flex items-center">
              <span>⛽ Gas Analysis</span>
            </h3>
            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-gray-400">ZK Verification:</span>
                <span className="font-semibold text-emerald-400">{zkProof.verificationGas.toLocaleString()} gas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Settlement:</span>
                <span className="font-semibold text-white">{settlement.settlementCost.toLocaleString()} gas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cost @ 0.1 gwei:</span>
                <span className="font-semibold text-amber-400">${settlement.costUSD}</span>
              </div>
              <div className="text-center pt-2">
                <div className="text-base text-zk-accent">
                  ✨ Economically Viable ✨
                </div>
              </div>
            </div>
          </div>

          {/* 1inch Integration */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-zk-gold">
              🔗 1inch Integration
            </h3>
            <div className="space-y-2 text-base">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Order Hash:</span>
                <span className="mono-address text-xs">{settlement.orderHash.slice(0, 10)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Extension:</span>
                <span className="font-semibold text-white">1,322 bytes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="status-success">✅ SUBMITTED</span>
              </div>
            </div>
            <button className="sparkle-button w-full text-lg py-3">
              🎉 View Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedDashboard