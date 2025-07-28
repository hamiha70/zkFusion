// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../interfaces/ILimitOrderProtocol.sol";

/**
 * @title MockLimitOrderProtocol
 * @dev Mock implementation of 1inch Limit Order Protocol v4 for testing
 * @notice Updated to match real LOP v4 contract: 0x111111125421ca6dc452d289314280a0f8842a65
 */
contract MockLimitOrderProtocol is ILimitOrderProtocol {
    mapping(bytes32 => uint256) public filledAmounts;
    
    // Helper functions to work with Address type (which is uint256 in 1inch)
    function _addressFromUint(Address addr) internal pure returns (address) {
        return address(uint160(Address.unwrap(addr)));
    }
    
    function _addressToUint(address addr) internal pure returns (Address) {
        return Address.wrap(uint256(uint160(addr)));
    }
    
    /**
     * @dev Mock fillOrder implementation matching LOP v4 signature
     */
    function fillOrder(
        Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        TakerTraits takerTraits
    ) external payable override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        // Silence unused parameter warnings for mock
        r; vs; takerTraits;
        
        orderHash = hashOrder(order);
        address maker = _addressFromUint(order.maker);
        address makerAsset = _addressFromUint(order.makerAsset);
        address takerAsset = _addressFromUint(order.takerAsset);
        
        // Simple validation
        require(amount > 0, "Taking amount must be positive");
        require(amount <= order.takingAmount, "Taking amount exceeds order");
        require(filledAmounts[orderHash] + amount <= order.takingAmount, "Order overfilled");
        
        // Calculate proportional making amount
        takingAmount = amount;
        makingAmount = (order.makingAmount * amount) / order.takingAmount;
        
        // Update filled amount
        filledAmounts[orderHash] += takingAmount;
        
        // Calculate remaining amount for event
        uint256 remainingAmount = order.makingAmount - filledAmounts[orderHash];
        
        emit OrderFilled(orderHash, remainingAmount);
        
        return (makingAmount, takingAmount, orderHash);
    }
    
    /**
     * @dev Mock fillContractOrder implementation
     */
    function fillContractOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 amount,
        TakerTraits takerTraits
    ) external override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        // Silence unused parameter warnings for mock
        signature; takerTraits;
        
        orderHash = hashOrder(order);
        address maker = _addressFromUint(order.maker);
        
        // Calculate proportional fill
        uint256 remainingTaking = order.takingAmount - filledAmounts[orderHash];
        takingAmount = amount > remainingTaking ? remainingTaking : amount;
        makingAmount = (takingAmount * order.makingAmount) / order.takingAmount;
        
        // Update filled amount
        filledAmounts[orderHash] += takingAmount;
        
        // Calculate remaining amount for event
        uint256 remainingAmount = order.makingAmount - filledAmounts[orderHash];
        
        emit OrderFilled(orderHash, remainingAmount);
        
        return (makingAmount, takingAmount, orderHash);
    }
    
    /**
     * @dev Order hash implementation matching LOP v4
     */
    function hashOrder(Order calldata order) public pure override returns (bytes32) {
        return keccak256(abi.encode(
            order.salt,
            order.maker,
            order.receiver,
            order.makerAsset,
            order.takerAsset,
            order.makingAmount,
            order.takingAmount,
            order.makerTraits
        ));
    }
    
    /**
     * @dev Mock cancelOrder implementation
     */
    function cancelOrder(MakerTraits makerTraits, bytes32 orderHash) external override {
        // Silence unused parameter warning for mock
        makerTraits;
        
        // Mark order as fully filled (simple cancellation)
        filledAmounts[orderHash] = type(uint256).max;
    }
    
    /**
     * @dev Helper function to get filled amount for an order
     */
    function getFilledAmount(bytes32 orderHash) external view returns (uint256) {
        return filledAmounts[orderHash];
    }
    
    /**
     * @dev Helper function to check if order is fully filled
     */
    function isOrderFilled(Order calldata order) external view returns (bool) {
        bytes32 orderHash = hashOrder(order);
        return filledAmounts[orderHash] >= order.takingAmount;
    }
} 