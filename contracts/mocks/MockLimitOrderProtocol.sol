// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../interfaces/ILimitOrderProtocol.sol";

/**
 * @title MockLimitOrderProtocol
 * @dev Mock implementation of 1inch Limit Order Protocol for testing
 * @notice This simulates the basic fillOrder functionality
 */
contract MockLimitOrderProtocol is ILimitOrderProtocol {
    mapping(bytes32 => uint256) public filledAmounts;
    
    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 makingAmount,
        uint256 takingAmount
    );
    
    /**
     * @dev Mock fillOrder implementation
     */
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        uint256 thresholdAmount,
        address target
    ) external override returns (uint256 actualMakingAmount, uint256 actualTakingAmount) {
        // Silence unused parameter warnings
        signature;
        thresholdAmount;
        
        bytes32 orderHash = hashOrder(order);
        
        // Simple validation
        require(takingAmount > 0, "Taking amount must be positive");
        require(takingAmount <= order.takingAmount, "Taking amount exceeds order");
        require(filledAmounts[orderHash] + takingAmount <= order.takingAmount, "Order overfilled");
        
        // Calculate proportional making amount
        actualTakingAmount = takingAmount;
        actualMakingAmount = (order.makingAmount * takingAmount) / order.takingAmount;
        
        // Update filled amount
        filledAmounts[orderHash] += actualTakingAmount;
        
        // Use target address or fallback to maker
        address receiver = target != address(0) ? target : order.maker;
        
        emit OrderFilled(orderHash, order.maker, msg.sender, actualMakingAmount, actualTakingAmount);
        
        return (actualMakingAmount, actualTakingAmount);
    }
    
    /**
     * @dev Mock fillOrderTo implementation
     */
    function fillOrderTo(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        uint256 thresholdAmount,
        address target,
        bytes calldata interaction
    ) external override returns (uint256 actualMakingAmount, uint256 actualTakingAmount) {
        // Silence unused parameter warnings
        interaction;
        
        return fillOrder(order, signature, takingAmount, thresholdAmount, target);
    }
    
    /**
     * @dev Simple order hash implementation
     */
    function hashOrder(Order calldata order) public pure override returns (bytes32) {
        return keccak256(abi.encode(
            order.salt,
            order.makerAsset,
            order.takerAsset,
            order.maker,
            order.receiver,
            order.allowedSender,
            order.makingAmount,
            order.takingAmount,
            order.offsets,
            keccak256(order.interactions)
        ));
    }
    
    /**
     * @dev Mock predicate check - always returns true for testing
     */
    function checkPredicate(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount
    ) external pure override returns (bool) {
        // Silence unused parameter warnings
        order;
        signature;
        takingAmount;
        
        return true;
    }
    
    /**
     * @dev Get filled amount for an order
     */
    function getFilledAmount(Order calldata order) external view returns (uint256) {
        return filledAmounts[hashOrder(order)];
    }
    
    /**
     * @dev Check if order is completely filled
     */
    function isOrderFilled(Order calldata order) external view returns (bool) {
        return filledAmounts[hashOrder(order)] >= order.takingAmount;
    }
} 