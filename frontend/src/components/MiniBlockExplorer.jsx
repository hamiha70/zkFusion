import React from 'react'
import { useAuction } from '../hooks/useAuction'
import { Activity, Clock, Fuel } from 'lucide-react'

const MiniBlockExplorer = () => {
  const { blockExplorer } = useAuction()

  return (
    <div className="border-t border-zk-primary/20 bg-zk-dark/90 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Block Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Activity className="text-zk-accent" size={18} />
              <span className="text-sm font-semibold text-zk-accent">Live Blockchain Activity</span>
              <span className="text-lg">✨</span>
            </div>
            <div className="text-sm text-gray-400">
              Block #{blockExplorer.currentBlock.toLocaleString()} | Gas Used: 2.1M/30M | Time: 2s ago
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Fuel size={14} className="text-zk-secondary" />
              <span className="text-gray-400">Avg Gas:</span>
              <span className="text-zk-secondary font-semibold">0.1 gwei</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={14} className="text-zk-primary" />
              <span className="text-gray-400">Block Time:</span>
              <span className="text-zk-primary font-semibold">2s</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          {blockExplorer.recentTxs.map((tx, index) => (
            <div key={index} className="bg-zk-light/5 border border-zk-primary/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="mono-address text-xs">{tx.hash}</span>
                <span className="text-xs text-gray-400">{tx.timestamp}</span>
              </div>
              <div className="text-sm font-medium text-zk-accent mb-1">
                {tx.type}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Fuel size={12} className="text-zk-secondary" />
                  <span className="text-xs text-zk-secondary font-semibold">
                    {tx.gas.toLocaleString()} gas
                  </span>
                </div>
                {tx.type.includes('ZK Proof') && (
                  <span className="text-xs">✨</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MiniBlockExplorer