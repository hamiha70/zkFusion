# OBS Demo Script for zkFusion Hackathon Presentation

## Scene Setup (3-minute demo)

### Scene 1: "Introduction" (0-30s)
**Purpose**: Hook the audience with the user experience
```
Layout:
├── Webcam (top-right corner, 25% size, circular crop)
├── Browser (localhost:3000/maker) - 70% main area  
├── zkFusion Logo (top-left, 15% size)
└── Text Overlay: "zkFusion: Trustless DeFi Auctions"

Audio: Introduce the problem and solution
Script: "Traditional Dutch auctions require trust. zkFusion eliminates that with zero-knowledge proofs..."
```

### Scene 2: "Technical Deep Dive" (30s-2m30s)  
**Purpose**: Show the technical implementation in action
```
Layout:
├── Webcam (top-right, 20% size)
├── Terminal 1 (demo script) - 40% left side
├── Terminal 2 (hardhat logs) - 25% bottom-right
├── Terminal 3 (gas analysis) - 25% top-right  
└── Browser (transparent overlay, 15% opacity) - background

Audio: Walk through technical implementation
Script: "Let me show you how this works under the hood..."

Key Moments:
- 0:45 - ZK proof generation (highlight timing)
- 1:15 - Contract deployments (show addresses)
- 1:45 - Gas analysis (emphasize efficiency)
- 2:15 - 1inch integration (prove it's real)
```

### Scene 3: "Settlement & Results" (2m30s-3m)
**Purpose**: Show the final results and economic viability
```
Layout:
├── Webcam (top-left, 30% size)
├── Browser (localhost:3000/settlement) - 65% main area
└── Terminal (demo script completion) - small bottom overlay

Audio: Wrap up with results and future vision
Script: "The auction settles in 2.3 seconds with just $0.09 in gas costs..."
```

## OBS Hotkeys Setup

```
F1 - Switch to Scene 1 (Introduction)
F2 - Switch to Scene 2 (Technical Deep Dive)  
F3 - Switch to Scene 3 (Settlement)
F4 - Toggle webcam on/off
F5 - Highlight active terminal (add colored border)
F6 - Browser refresh (for live updates)
F7 - Start/stop recording
F8 - Mute/unmute microphone
```

## Terminal Window Arrangement

### Terminal 1: Demo Script (Interactive Mode)
```bash
# Position: Left side, 40% width
cd /home/hamiha70/Projects/ETHGlobal/Unite_1Inch_Jul25/zkFusion
npm run demo
# Font: 14px, high contrast
# Colors: Green text on black background
```

### Terminal 2: Hardhat Network Logs  
```bash
# Position: Bottom-right, 25% width
npx hardhat node --verbose
# Font: 12px
# Colors: Blue text on dark background
# Filter: Show only contract deployments and transactions
```

### Terminal 3: Gas Analysis
```bash
# Position: Top-right, 25% width  
npm run demo:gas
# Font: 12px
# Colors: Yellow text on dark background
# Purpose: Real-time gas cost tracking
```

### Browser: Frontend Dashboard
```
URL: http://localhost:3000
Position: Background/overlay depending on scene
Auto-refresh: Every 2 seconds during demo
Zoom: 125% for better visibility
```

## Presentation Flow & Timing

### Opening Hook (0-15s)
```
Scene: Introduction
Audio: "Dutch auctions are everywhere in DeFi, but they all have one problem..."
Visual: Show maker dashboard with intent setup
Action: None (static display)
```

### Problem Statement (15-30s)
```
Scene: Introduction  
Audio: "You have to trust the auctioneer. zkFusion changes that."
Visual: Highlight "Verifiable, Trustless" features
Action: Mouse hover over key features
```

### Technical Demonstration (30s-2m30s)
```
Scene: Technical Deep Dive
Audio: "Let me show you how this works..."

Key Timestamps:
0:30 - Start demo script, show infrastructure setup
0:45 - ZK proof generation (highlight 2.3s timing)
1:00 - Contract deployments (show real addresses) 
1:15 - Bid submission and commitment process
1:30 - Auction results with reordering explanation
1:45 - Gas analysis (emphasize 35k gas for ZK verification)
2:00 - 1inch integration (prove it's real infrastructure)
2:15 - Settlement completion
```

### Results & Economic Impact (2m30s-3m)
```
Scene: Settlement
Audio: "The results speak for themselves..."
Visual: Settlement dashboard with final numbers
Key Points:
- $0.09 settlement cost
- 2.3s proof generation  
- Real 1inch integration
- 90% technical completion
```

## Backup Plans

### If Frontend Not Ready
```
Fallback: Extended terminal demo with browser showing:
- Arbiscan contract pages
- Simple HTML status page
- Hardhat network explorer
```

### If Technical Issues
```
Fallback: Pre-recorded demo segments
- ZK proof generation video
- Contract deployment screenshots  
- Gas analysis charts
```

### If Time Constraints
```
Simplified Demo (90 seconds):
- 30s: Problem + solution overview
- 45s: Live technical demonstration
- 15s: Results and economic viability
```

## Audio Script Outline

### Introduction (0-30s)
"Hi, I'm [Name] and this is zkFusion - the first trustless Dutch auction system for DeFi. Traditional auctions require you to trust the auctioneer, but what if you could verify the results cryptographically? That's exactly what we've built."

### Technical Demo (30s-2m30s)  
"Let me show you how this works. We start by forking Arbitrum mainnet to interact with real 1inch contracts. Watch as we generate a zero-knowledge proof for a complex auction with 7 bids in just 2.3 seconds. The ZK verification costs only 35,000 gas - that's $0.09 total settlement cost. This isn't a simulation - we're deploying real contracts and integrating with the actual 1inch Limit Order Protocol."

### Conclusion (2m30s-3m)
"zkFusion achieves 90% technical completion with a clear path to production. We've proven that complex DeFi mechanisms can be both trustless and economically viable. This is the future of intent-based trading."

## Technical Setup Checklist

### Before Demo
- [ ] All terminals positioned and configured
- [ ] Frontend running on localhost:3000
- [ ] Hardhat network running with verbose logs
- [ ] Demo script tested and working
- [ ] OBS scenes configured and tested
- [ ] Audio levels checked
- [ ] Backup materials ready

### During Demo
- [ ] Start with Scene 1 (Introduction)
- [ ] Use F-keys for smooth scene transitions
- [ ] Keep webcam active but not dominant
- [ ] Highlight active terminals as you speak
- [ ] Let the demo script run naturally
- [ ] End with Scene 3 (Results)

### After Demo
- [ ] Save recording for documentation
- [ ] Export key screenshots
- [ ] Document any issues for next iteration

---

**Total Demo Time**: 3 minutes
**Preparation Time**: 30 minutes setup + 15 minutes testing
**Success Metric**: Clear technical demonstration + compelling user story