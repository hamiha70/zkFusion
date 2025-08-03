import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { ethers } from 'ethers'

// Demo data matching your specification
const DEMO_DATA = {
  auction: {
    asset: "WETH",
    targetAsset: "USDC", 
    amount: "100.00",
    minPrice: "1700.00",
    maxBidders: 8,
    duration: 300,
    status: "live"
  },
  bids: [
    { id: 1, bidder: "0x2B42c87A4b25699A413A5F45ff60d22a4d3c1a74", amount: "20", price: "1750", status: "winning", commitment: "0x13913425591057632296365763607915417121342573208920775884677917667349792778776" },
    { id: 2, bidder: "0x9c4171b4d39d735873a216A6B7a5A4e1A6c8c4A2", amount: "30", price: "1725", status: "winning", commitment: "0x10600257239115344715357683120607068087379286645322706697033344505679496137240" },
    { id: 3, bidder: "0xA1b2c3d4E5F678901234567890AbCdEf12345678", amount: "50", price: "1705", status: "winning", commitment: "0x17256895801874070266775975134243831737496127730156519371815324709620861049052" },
    { id: 4, bidder: "0xB1c2d3e4F5678901234567890aBcDeF123456789", amount: "25", price: "1690", status: "losing", reason: "Price below minimum", commitment: "0x09876543210123456789012345678901234567890123456789012345678901234567890123456" },
    { id: 5, bidder: "0xC1d2e3f4A5B678901234567890bCdEfA12345678", amount: "40", price: "1700", status: "losing", reason: "Exceeds remaining amount", commitment: "0x11111111111111111111111111111111111111111111111111111111111111111111111111111" },
    { id: 6, bidder: "0xD1e2f3a4B5C678901234567890cDefAb12345678", amount: "10", price: "1800", status: "winning", commitment: "0x22222222222222222222222222222222222222222222222222222222222222222222222222222" },
    { id: 7, bidder: "0xE1f2a3b4C5D678901234567890dEfaBc12345678", amount: "15", price: "1650", status: "losing", reason: "Price below minimum", commitment: "0x33333333333333333333333333333333333333333333333333333333333333333333333333333" }
  ],
  contracts: {
    verifier: "0x4b5e98b74D50FE8180ee1db8DB90C034F2b80510",
    factory: "0xD384B2F466a6d39B486E11c4AC305a5635fFad0e", 
    executor: "0x18e3205b45398A41373DA89591e8C5f6c500317b",
    getter: "0xaE4D47B4CBF874FcD130e13D3373291660B0e872",
    commitment: "0x1234567890123456789012345678901234567890"
  },
  zkProof: {
    status: "complete",
    generationTime: 2.34,
    proofSize: 768,
    verificationGas: 35124,
    constraints: 14311
  },
  settlement: {
    totalSold: "100.00",
    totalReceived: "172500.00", 
    settlementCost: 472891,
    costUSD: 0.09,
    orderHash: "0x789abc123def456789abc123def456789abc123def456789abc123def456789abc"
  },
  blockExplorer: {
    currentBlock: 364175823,
    recentTxs: [
      { hash: "0xabc123", type: "Deploy Groth16Verifier", gas: 390237, timestamp: "2s ago" },
      { hash: "0xdef456", type: "Create Commitment Contract", gas: 893709, timestamp: "5s ago" },
      { hash: "0x789abc", type: "Generate ZK Proof", gas: 35124, timestamp: "8s ago" },
      { hash: "0x123def", type: "Submit 1inch Order", gas: 472891, timestamp: "12s ago" }
    ]
  }
}

const AuctionContext = createContext()

const auctionReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_AUCTION_STATUS':
      return {
        ...state,
        auction: { ...state.auction, status: action.payload }
      }
    case 'UPDATE_ZK_PROOF':
      return {
        ...state,
        zkProof: { ...state.zkProof, ...action.payload }
      }
    case 'ADD_TRANSACTION':
      return {
        ...state,
        blockExplorer: {
          ...state.blockExplorer,
          recentTxs: [action.payload, ...state.blockExplorer.recentTxs.slice(0, 3)]
        }
      }
    default:
      return state
  }
}

export const AuctionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(auctionReducer, DEMO_DATA)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate block progression
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          hash: `0x${Math.random().toString(16).substr(2, 6)}`,
          type: "Block Update",
          gas: Math.floor(Math.random() * 100000),
          timestamp: "now"
        }
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const updateAuctionStatus = (status) => {
    dispatch({ type: 'UPDATE_AUCTION_STATUS', payload: status })
  }

  const updateZKProof = (proofData) => {
    dispatch({ type: 'UPDATE_ZK_PROOF', payload: proofData })
  }

  return (
    <AuctionContext.Provider value={{
      ...state,
      updateAuctionStatus,
      updateZKProof
    }}>
      {children}
    </AuctionContext.Provider>
  )
}

export const useAuction = () => {
  const context = useContext(AuctionContext)
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider')
  }
  return context
}