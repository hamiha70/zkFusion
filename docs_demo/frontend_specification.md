# zkFusion Frontend Specification v1.0

## Overview
Interactive dashboard for demonstrating zkFusion's ZK-powered Dutch auction system during ETHGlobal hackathon presentation.

## Architecture

### Tech Stack
- **Framework**: React 18 + Next.js 14 (local dev server)
- **Styling**: Tailwind CSS + custom zkFusion theme
- **State Management**: React Context + useReducer
- **Blockchain**: ethers.js v6 direct connection to Hardhat fork
- **Real-time**: WebSocket + polling for live updates

### Development Approach
- **Local Only**: No deployment needed (matches Hardhat fork)
- **Hardcoded Data**: Pre-filled demo data for reliability
- **Time-Efficient**: Focus on visual impact over full functionality

## Screen Specifications

### Screen 1: Maker Intent Dashboard
```
Purpose: Show the maker's perspective and auction setup
URL: /maker
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 🚀 zkFusion - Create Dutch Auction Intent              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Intent Configuration:                                   │
│ ┌─ Asset: WETH → USDC ────────────────────────────────┐│
│ │ Selling: 100.00 WETH                               ││
│ │ Minimum Price: 1700.00 USDC per WETH               ││
│ │ Max Bidders: 8                                     ││
│ │ Auction Duration: 300s                             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Infrastructure Status:                                  │
│ • Commitment Factory: 0xD384...d0e ✅ DEPLOYED         │
│ • Commitment Contract: 0x1234...5678 ✅ CREATED        │
│ • ZK Verifier: 0x4b5e...510 ✅ READY                   │
│                                                         │
│ Auction Status: 🟢 LIVE - 7/8 bids received            │
│ Current Best: 1800 USDC/WETH (Bid #6)                  │
│ Estimated Settlement: 172,500 USDC                     │
│                                                         │
│ [📊 View All Bids] [⚡ Settle Now] [📈 Gas Analysis]    │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Real-time auction status updates
- Contract addresses (proves deployment)
- Live bid counter and best price
- Action buttons for demo flow

### Screen 2: Bidder Interface
```
Purpose: Show bidder experience and commitment process
URL: /bidder
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 🎯 zkFusion - Submit Auction Bid                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Active Auction: 100 WETH @ ≥1700 USDC/WETH             │
│ Time Remaining: 245s | Bids: 7/8                       │
│                                                         │
│ Your Bid Configuration:                                 │
│ ┌─ Amount: 25.00 WETH ────────────────────────────────┐│
│ │ Price: 1725.00 USDC per WETH                        ││
│ │ Total Value: 43,125 USDC                            ││
│ │                                                     ││
│ │ Commitment Process:                                 ││
│ │ 1. Generate Poseidon Hash ✅ 0xabc123...def789      ││
│ │ 2. Post On-Chain Commitment ✅ Tx: 0x456...         ││
│ │ 3. Submit Off-Chain Details ✅ Encrypted            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Competitive Landscape:                                  │
│ • Higher Bids: 1 (you're #2 in queue)                  │
│ • Similar Bids: 2 (competitive zone)                   │
│ • Lower Bids: 4 (likely to lose)                       │
│                                                         │
│ Bid Status: ✅ COMMITTED & COMPETITIVE                  │
│                                                         │
│ [🔄 Update Bid] [📊 View Auction] [⚡ Auto-Settle]      │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Step-by-step commitment process
- Cryptographic proof (Poseidon hash)
- Competitive positioning
- Real transaction hashes

### Screen 3: Settlement Dashboard
```
Purpose: Show ZK proof generation and final settlement
URL: /settlement
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚡ zkFusion - Auction Settlement & ZK Proof            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Auction Results:                                        │
│ ┌─ Winners (4 bids, reordered by price): ──────────────┐│
│ │ #6: 10 WETH @ 1800 USDC ✅ Filled                   ││
│ │ #1: 20 WETH @ 1750 USDC ✅ Filled                   ││
│ │ #2: 30 WETH @ 1725 USDC ✅ Filled                   ││
│ │ #3: 40 WETH @ 1705 USDC ✅ Partial (40/50)          ││
│ │                                                     ││
│ │ Losers (3 bids): #4 (low price), #5 (capacity),    ││
│ │                  #7 (low price)                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ZK Proof Generation:                                    │
│ • Circuit: zkDutchAuction8.circom (~14k constraints)   │
│ • Hardware: Dell XPS15 (consumer laptop)               │
│ • Generation Time: ⏱️ 2.34s ✅ COMPLETE                │
│ • Proof Size: 768 bytes                                │
│ • Verification Gas: 35,124 gas                         │
│                                                         │
│ Settlement Economics:                                   │
│ • Total Sold: 100.00 WETH                              │
│ • Total Received: 172,500 USDC                         │
│ • Settlement Cost: 472,891 gas (~$0.09)                │
│ • Cost per WETH: $0.0009 (highly efficient)            │
│                                                         │
│ 1inch Integration:                                      │
│ • Order Hash: 0x789abc...123def                        │
│ • Extension Size: 1,322 bytes                          │
│ • Status: ✅ SUBMITTED TO 1INCH LOP                    │
│                                                         │
│ [🎉 View Transaction] [📊 Gas Breakdown] [🔄 New Auction] │
└─────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Clear winner/loser breakdown with original bid numbers
- Real ZK proof metrics and timing
- Economic analysis and gas efficiency
- 1inch integration proof

## Mini Block Explorer Component

**Embedded in all screens (bottom panel):**
```
┌─ 🔍 Live Blockchain Activity ────────────────────────────┐
│ Block #364175823 | Gas Used: 2.1M/30M | Time: 2s ago    │
│                                                          │
│ Recent Transactions:                                     │
│ 0xabc123... Deploy Groth16Verifier     ⛽ 390,237 gas   │
│ 0xdef456... Create Commitment Contract ⛽ 893,709 gas   │
│ 0x789abc... Generate ZK Proof          ⛽  35,124 gas   │
│ 0x123def... Submit 1inch Order         ⛽ 472,891 gas   │
│                                                          │
│ [📊 Gas Tracker] [🔗 View Full Explorer]                │
└──────────────────────────────────────────────────────────┘
```

## Data Sources & Updates

### Real-Time Data Flow
```
Hardhat Events → WebSocket → React Context → UI Updates
```

**Update Triggers:**
- Contract deployments (new addresses)
- Bid submissions (commitment hashes)
- ZK proof generation (timing data)
- Settlement completion (final results)

### Hardcoded Demo Data
```javascript
// Pre-filled for reliability during demo
const DEMO_DATA = {
  auction: {
    asset: "WETH",
    amount: "100.00",
    minPrice: "1700.00",
    maxBidders: 8
  },
  bids: [
    { id: 1, amount: "20", price: "1750", status: "winning" },
    { id: 2, amount: "30", price: "1725", status: "winning" },
    // ... 5 more bids
  ],
  contracts: {
    verifier: "0x4b5e98b74D50FE8180ee1db8DB90C034F2b80510",
    factory: "0xD384B2F466a6d39B486E11c4AC305a5635fFad0e",
    // ... other addresses
  }
}
```

## Styling & Theme

### Color Scheme (zkFusion Brand)
```css
:root {
  --zk-primary: #6366f1;     /* Indigo - ZK/crypto feel */
  --zk-secondary: #10b981;   /* Emerald - success/money */
  --zk-accent: #f59e0b;      /* Amber - attention/warning */
  --zk-dark: #1f2937;        /* Gray-800 - backgrounds */
  --zk-light: #f9fafb;       /* Gray-50 - cards */
}
```

### Component Design System
- **Cards**: Rounded corners, subtle shadows
- **Status Indicators**: Color-coded (green=success, blue=processing, red=failed)
- **Buttons**: Gradient backgrounds with hover effects
- **Typography**: Inter font, clear hierarchy
- **Icons**: Lucide React (consistent style)

## Development Timeline

### Phase 1: Core Structure (2-3 hours)
- [ ] Next.js setup with Tailwind
- [ ] Three main page components
- [ ] Basic routing and navigation
- [ ] Hardcoded demo data integration

### Phase 2: Real-Time Integration (2-3 hours)
- [ ] Ethers.js connection to Hardhat
- [ ] WebSocket setup for live updates
- [ ] Contract event listeners
- [ ] State management with Context

### Phase 3: Polish & Demo Prep (1-2 hours)
- [ ] Mini block explorer component
- [ ] Responsive design for OBS framing
- [ ] Animation and transition effects
- [ ] Demo script integration points

### Phase 4: Testing & Backup (1 hour)
- [ ] Simplified unified dashboard (fallback)
- [ ] Error handling and graceful degradation
- [ ] OBS scene testing
- [ ] Demo rehearsal

## Demo Integration Points

### OBS Scene Coordination
```javascript
// Expose functions for demo script coordination
window.zkFusionDemo = {
  showMakerView: () => router.push('/maker'),
  showBidderView: () => router.push('/bidder'),
  showSettlement: () => router.push('/settlement'),
  updateAuctionStatus: (status) => setAuctionStatus(status),
  triggerZKProof: () => setProofStatus('generating')
}
```

### Demo Script Hooks
- Automatic page transitions based on demo phase
- Real-time data updates from terminal execution
- Highlight active sections during explanation
- Auto-refresh every 2s during active demo

## Success Metrics

### Technical Goals
- [ ] All three screens functional and polished
- [ ] Real-time updates working smoothly
- [ ] Mini block explorer showing live data
- [ ] Responsive design for 1080p OBS capture

### Demo Goals
- [ ] Seamless integration with terminal demo
- [ ] Clear visual storytelling of auction flow
- [ ] Impressive technical depth display
- [ ] Professional presentation quality

---

**Next Steps:**
1. Create Next.js project structure
2. Implement core components with hardcoded data
3. Add real-time blockchain integration
4. Polish for demo presentation