import React from 'react'
import { useAuction } from '../hooks/useAuction'
import { Gavel, Target, Zap, Clock, DollarSign, Shield, TrendingUp } from 'lucide-react'

const UnifiedDashboard = () => {
  const { auction, bids, contracts, zkProof, settlement } = useAuction()

  const winningBids = bids.filter(bid => bid.status === 'winning')
  const losingBids = bids.filter(bid => bid.status === 'losing')

  return (
    <div className="grid grid-cols-3 gap-8 h-full">
      
      {/* LEFT SECTION: Maker Intent Dashboard */}
      <div className="card-glow p-6 space-y-6">
        <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
          <Gavel className="text-zk-accent" size={24} />
          <h2 className="text-xl font-bold sparkle-text">Maker Intent</h2>
        </div>

        {/* Intent Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-accent flex items-center">
            <span>✨</span>
            <span className="ml-2">Intent Configuration</span>
          </h3>
          <div className="card-glow-accent p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Asset Pair:</span>
              <span className="font-semibold">{auction.asset} → {auction.targetAsset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Selling:</span>
              <span className="font-semibold text-zk-secondary">{auction.amount} {auction.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Price:</span>
              <span className="font-semibold text-zk-accent">{auction.minPrice} {auction.targetAsset}/{auction.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Bidders:</span>
              <span className="font-semibold">{auction.maxBidders}</span>
            </div>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-secondary flex items-center">
            <Shield size={18} />
            <span className="ml-2">Infrastructure Status</span>
            <span className="ml-2">✨</span>
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Commitment Factory:</span>
              <div className="flex items-center space-x-2">
                <span className="mono-address">{contracts.factory.slice(0, 10)}...</span>
                <span className="status-success">DEPLOYED</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Commitment Contract:</span>
              <div className="flex items-center space-x-2">
                <span className="mono-address">{contracts.commitment.slice(0, 10)}...</span>
                <span className="status-success">CREATED</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">ZK Verifier:</span>
              <div className="flex items-center space-x-2">
                <span className="mono-address">{contracts.verifier.slice(0, 10)}...</span>
                <span className="status-success">READY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auction Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-primary flex items-center">
            <Clock size={18} />
            <span className="ml-2">Auction Status</span>
          </h3>
          <div className="card-glow-accent p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="status-success">🟢 LIVE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bids Received:</span>
              <span className="font-semibold text-zk-accent">{bids.length}/{auction.maxBidders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Best Offer:</span>
              <span className="font-semibold text-zk-secondary">1800 USDC/WETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Est. Settlement:</span>
              <span className="font-semibold gradient-text">{settlement.totalReceived} USDC</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="sparkle-button w-full">
            ⚡ Settle Auction
          </button>
        </div>
      </div>

      {/* MIDDLE SECTION: Bidder Interface & Auction Results */}
      <div className="card-glow p-6 space-y-6">
        <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
          <Target className="text-zk-primary" size={24} />
          <h2 className="text-xl font-bold sparkle-text">Live Auction</h2>
        </div>

        {/* Auction Overview */}
        <div className="space-y-4">
          <div className="text-center p-4 card-glow-accent">
            <div className="text-2xl font-bold gradient-text">
              {auction.amount} {auction.asset}
            </div>
            <div className="text-sm text-gray-400">
              @ ≥{auction.minPrice} {auction.targetAsset}/{auction.asset}
            </div>
          </div>
        </div>

        {/* Winning Bids */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-secondary flex items-center">
            <TrendingUp size={18} />
            <span className="ml-2">Winning Bids</span>
            <span className="ml-2">✨</span>
            <span className="ml-auto text-sm text-gray-400">(reordered by price)</span>
          </h3>
          <div className="space-y-2">
            {winningBids.map((bid) => (
              <div key={bid.id} className="bg-zk-secondary/10 border border-zk-secondary/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-zk-secondary font-semibold">Bid #{bid.id}</span>
                    <span className="text-xs">✨</span>
                  </div>
                  <span className="status-success">WINNING</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Amount: </span>
                    <span className="font-semibold">{bid.amount} WETH</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price: </span>
                    <span className="font-semibold text-zk-secondary">{bid.price} USDC/WETH</span>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  <span className="text-gray-400">Bidder: </span>
                  <span className="mono-address">{bid.bidder.slice(0, 12)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Losing Bids */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-400 flex items-center">
            <span>Losing Bids</span>
          </h3>
          <div className="space-y-2">
            {losingBids.map((bid) => (
              <div key={bid.id} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">Bid #{bid.id}</span>
                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                    {bid.reason}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Amount: </span>
                    <span>{bid.amount} WETH</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Price: </span>
                    <span>{bid.price} USDC/WETH</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Settlement Dashboard */}
      <div className="card-glow p-6 space-y-6">
        <div className="flex items-center space-x-3 border-b border-zk-primary/20 pb-4">
          <Zap className="text-zk-accent" size={24} />
          <h2 className="text-xl font-bold sparkle-text">ZK Settlement</h2>
        </div>

        {/* ZK Proof Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-accent flex items-center">
            <span>✨</span>
            <span className="ml-2">ZK Proof Generation</span>
          </h3>
          <div className="card-glow-accent p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status:</span>
              <span className="status-success">✅ COMPLETE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Generation Time:</span>
              <span className="font-semibold text-zk-secondary">{zkProof.generationTime}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Proof Size:</span>
              <span className="font-semibold">{zkProof.proofSize} bytes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Circuit Constraints:</span>
              <span className="font-semibold text-zk-primary">~{zkProof.constraints.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hardware:</span>
              <span className="text-sm">Dell XPS15 laptop</span>
            </div>
          </div>
        </div>

        {/* Settlement Results */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-secondary flex items-center">
            <DollarSign size={18} />
            <span className="ml-2">Settlement Results</span>
            <span className="ml-2">✨</span>
          </h3>
          <div className="card-glow-accent p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Sold:</span>
              <span className="font-semibold text-zk-secondary">{settlement.totalSold} WETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Received:</span>
              <span className="font-semibold gradient-text">{settlement.totalReceived} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Winning Bidders:</span>
              <span className="font-semibold text-zk-accent">#6, #1, #2, #3</span>
            </div>
          </div>
        </div>

        {/* Gas Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-primary flex items-center">
            <span>⛽</span>
            <span className="ml-2">Gas Analysis</span>
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">ZK Verification:</span>
              <span className="font-semibold text-zk-secondary">{zkProof.verificationGas.toLocaleString()} gas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Settlement:</span>
              <span className="font-semibold">{settlement.settlementCost.toLocaleString()} gas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cost @ 0.1 gwei:</span>
              <span className="font-semibold text-zk-accent">${settlement.costUSD}</span>
            </div>
            <div className="text-center pt-2">
              <div className="text-xs text-zk-accent">
                ✨ Economically Viable for Real-World Use ✨
              </div>
            </div>
          </div>
        </div>

        {/* 1inch Integration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zk-gold flex items-center">
            <span>🔗</span>
            <span className="ml-2">1inch Integration</span>
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Order Hash:</span>
              <span className="mono-address">{settlement.orderHash.slice(0, 12)}...</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Extension Size:</span>
              <span className="font-semibold">1,322 bytes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="status-success">✅ SUBMITTED TO 1INCH LOP</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="sparkle-button w-full">
            🎉 View Transaction
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnifiedDashboard