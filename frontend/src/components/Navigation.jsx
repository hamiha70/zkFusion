import React from 'react'
import { NavLink } from 'react-router-dom'
import { Gavel, Target, Zap } from 'lucide-react'

const Navigation = () => {
  const navItems = [
    {
      to: '/maker',
      icon: Gavel,
      label: 'Maker Intent',
      description: 'Create auction'
    },
    {
      to: '/bidder', 
      icon: Target,
      label: 'Bidder Interface',
      description: 'Submit bids'
    },
    {
      to: '/settlement',
      icon: Zap,
      label: 'Settlement',
      description: 'ZK proof & results'
    }
  ]

  return (
    <nav className="border-b border-zk-primary/10 bg-zk-light/5">
      <div className="container mx-auto px-6">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 py-4 px-2 border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-zk-accent text-zk-accent'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-zk-primary/50'
                  }`
                }
              >
                <Icon size={18} />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs opacity-70">{item.description}</span>
                </div>
                <span className="text-xs">✨</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navigation