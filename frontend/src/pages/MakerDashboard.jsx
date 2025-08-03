import React from 'react'
import { useAuction } from '../hooks/useAuction'
import { CheckCircle, Clock, Users, DollarSign, Gavel } from 'lucide-react'

const MakerDashboard = () => {
  const { auction, contracts, bids } = useAuction()
  
  const winningBids = bids.filter(bid => bid.status === 'winning')
  const totalBids = bids.length
  const bestPrice = Math.max(...bids.map(bid => parseFloat(bid.price)))

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          <span className="sparkle-text gradient-text">Create Dutch Auction Intent</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Issue your intent and let the trustless auction system handle the rest ✨
        </p>
      </div>

      {/* Intent Configuration Card */}
      <div className="card-glow p-8 space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <Gavel className="text-zk-accent" size={24} />
          <h2 className="text-2xl font-semibold text-white">Intent Configuration</h2>
          <span className="text-xl">✨</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset Pair */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Asset Pair</label>
            <div className="card-glow-accent p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-white">{auction.asset}</span>
                  <span className="text-zk-accent">→</span>
                  <span className="text-lg font-bold text-white">{auction.targetAsset}</span>
                </div>
                <span className="text-sm">✨</span>
              </div>
            </div>
          </div>

          {/* Selling Amount */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Selling Amount</label>
            <div className="card-glow p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">{auction.amount} {auction.asset}</span>
                <span className="text-sm text-zk-accent">✨ Premium Asset</span>
              </div>
            </div>
          </div>

          {/* Minimum Price */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Minimum Price</label>
            <div className="card-glow p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">{auction.minPrice} {auction.targetAsset}/{auction.asset}</span>
                <span className="text-sm text-zk-secondary">✨ Floor Protected</span>
              </div>
            </div>
          </div>

          {/* Max Bidders */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Maximum Bidders</label>
            <div className="card-glow p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">{auction.maxBidders} bidders</span>
                <span className="text-sm text-zk-primary">✨ ZK Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure Status */}
      <div className="card-glow p-8 space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <CheckCircle className="text-zk-secondary" size={24} />
          <h2 className="text-2xl font-semibold text-white">Infrastructure Status</h2>
          <span className="text-xl">✨</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Commitment Factory', address: contracts.factory, status: 'DEPLOYED' },
            { name: 'Commitment Contract', address: contracts.commitment, status: 'CREATED' },
            { name: 'ZK Verifier', address: contracts.verifier, status: 'READY' },
            { name: 'zkFusion Executor', address: contracts.executor, status: 'ACTIVE' }
          ].map((contract) => (
            <div key={contract.name} className="card-glow-accent p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{contract.name}</span>
                <span className="status-success">{contract.status} ✨</span>
              </div>
              <div className="mono-address text-xs">
                {contract.address}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Auction Status */}
      <div className="card-glow p-8 space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="text-zk-accent animate-pulse" size={24} />
          <h2 className="text-2xl font-semibold text-white">Live Auction Status</h2>
          <span className="text-xl">✨</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Auction Status */}
          <div className="text-center space-y-2">
            <div className="text-3xl">🟢</div>
            <div className="text-lg font-semibold text-zk-secondary">LIVE AUCTION</div>
            <div className="text-sm text-gray-400">{totalBids}/{auction.maxBidders} bids received</div>
          </div>

          {/* Best Offer */}
          <div className="text-center space-y-2">
            <div className="text-3xl">✨</div>
            <div className="text-lg font-semibold text-zk-accent">Best Offer</div>
            <div className="text-2xl font-bold text-white">{bestPrice} {auction.targetAsset}/{auction.asset}</div>
          </div>

          {/* Estimated Settlement */}
          <div className="text-center space-y-2">
            <div className="text-3xl">💰</div>
            <div className="text-lg font-semibold text-zk-gold">Est. Settlement</div>
            <div className="text-2xl font-bold text-white">172,500 {auction.targetAsset}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <button className="sparkle-button">
            View All Bids
          </button>
          <button className="sparkle-button">
            Settle Now
          </button>
          <button className="sparkle-button">
            Gas Analysis
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Winning Bids', value: winningBids.length, color: 'text-zk-secondary' },
          { icon: DollarSign, label: 'Total Value', value: '172.5K USDC', color: 'text-zk-accent' },
          { icon: Clock, label: 'Avg Settlement', value: '2.3s', color: 'text-zk-primary' },
          { icon: Gavel, label: 'Gas Cost', value: '$0.09', color: 'text-zk-gold' }
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card-glow p-4 text-center space-y-2">
              <Icon className={`mx-auto ${stat.color}`} size={24} />
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label} ✨</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MakerDashboard