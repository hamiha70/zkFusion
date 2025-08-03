# zkFusion Dashboard

## ✨ Unified Demo Interface

A single-page dashboard showcasing zkFusion's ZK-powered Dutch auction system for the ETHGlobal hackathon demo.

### Features

- **✨ Sparkle-themed Design**: Prominent use of ✨ emoji throughout the interface
- **Unified Layout**: All three sections (Maker Intent, Live Auction, ZK Settlement) side by side
- **Real-time Updates**: Live blockchain activity simulation
- **OBS-Optimized**: Perfect for multi-terminal demo presentation
- **Brand Integration**: zkFusion colors and styling from logo assets

### Layout Structure

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Maker Intent  │  Live Auction   │ ZK Settlement   │
│                 │                 │                 │
│ ✨ Intent Config│ ✨ Winning Bids │ ✨ ZK Proof     │
│ 🏗️ Infrastructure│ 📊 Auction Data │ ⛽ Gas Analysis │
│ 📊 Status       │ 🎯 Bid Results  │ 🔗 1inch Link   │
└─────────────────┴─────────────────┴─────────────────┘
│              Mini Block Explorer                    │
│ ✨ Live Blockchain Activity + Recent Transactions  │
└─────────────────────────────────────────────────────┘
```

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build
```

### Demo Integration

- **URL**: http://localhost:3000
- **OBS Setup**: 1080p browser capture, 125% zoom
- **Auto-refresh**: Every 2 seconds during demo
- **Hardcoded Data**: Pre-filled for reliable presentation

### Key Components

- `UnifiedDashboard.jsx` - Main three-column layout
- `MiniBlockExplorer.jsx` - Bottom transaction feed
- `useAuction.jsx` - Demo data and state management
- Custom CSS with ✨ sparkle animations and zkFusion brand colors

### Color Scheme

- **Primary**: #6366f1 (Indigo - ZK/crypto)
- **Secondary**: #10b981 (Emerald - success/money)  
- **Accent**: #f59e0b (Amber - attention/gavel)
- **Gold**: #fbbf24 (Premium feel)
- **Purple**: #8b5cf6 (ZK theme)

Perfect for ETHGlobal hackathon presentation! ✨