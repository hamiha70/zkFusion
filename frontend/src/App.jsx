import React from 'react'
import UnifiedDashboard from './components/UnifiedDashboard'
import MiniBlockExplorer from './components/MiniBlockExplorer'
import { AuctionProvider } from './hooks/useAuction'

function App() {
  return (
    <AuctionProvider>
      <div className="min-h-screen bg-gradient-to-br from-zk-dark via-gray-900 to-zk-dark">
        {/* Header with sparkle branding */}
        <header className="border-b border-zk-primary/20 bg-zk-dark/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl animate-pulse-slow">✨</div>
                <h1 className="text-3xl font-bold gradient-text">
                  zkFusion
                </h1>
                <div className="text-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}>✨</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-zk-accent">
                  The Future of Near-Instantaneous Trustless Intent-Based DeFi Auctions
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  ETHGlobal Unite + 1inch Hackathon 2025
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Single Unified Dashboard */}
        {/* Main Content - Full Height */}
        <main className="flex-1">
          <UnifiedDashboard />
        </main>

        {/* Mini Block Explorer at bottom */}
        <MiniBlockExplorer />
      </div>
    </AuctionProvider>
  )
}

export default App