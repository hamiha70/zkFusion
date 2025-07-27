// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title ILimitOrderProtocol
 * @dev Interface for 1inch Limit Order Protocol integration
 * @notice Simplified interface for the core fillOrder functionality
 */
interface ILimitOrderProtocol {
    struct Order {
        uint256 salt;
        address makerAsset;
        address takerAsset;
        address maker;
        address receiver;
        address allowedSender;
        uint256 makingAmount;
        uint256 takingAmount;
        uint256 offsets;
        bytes interactions;
    }
    
    /**
     * @dev Fills an order with specified parameters
     * @param order The order to fill
     * @param signature The maker's signature for the order
     * @param takingAmount The amount of taker asset to take
     * @param thresholdAmount The minimum amount of maker asset to receive
     * @param target The target address for interactions
     */
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        uint256 thresholdAmount,
        address target
    ) external returns (uint256 actualMakingAmount, uint256 actualTakingAmount);
    
    /**
     * @dev Fills an order to a specific target address
     * @param order The order to fill
     * @param signature The maker's signature for the order
     * @param takingAmount The amount of taker asset to take
     * @param thresholdAmount The minimum amount of maker asset to receive
     * @param target The target address to receive the maker asset
     * @param interaction Additional interaction data
     */
    function fillOrderTo(
        Order calldata order,
        bytes calldata signature,
        uint256 takingAmount,
        uint256 thresholdAmount,
        address target,
        bytes calldata interaction
    ) external returns (uint256 actualMakingAmount, uint256 actualTakingAmount);
    
    /**
     * @dev Returns the hash of an order
     * @param order The order to hash
     * @return bytes32 The order hash
     */
    function hashOrder(Order calldata order) external view returns (bytes32);
    
    /**
     * @dev Checks if an order is valid and fillable
     * @param order The order to check
     * @param signature The maker's signature
     * @param takingAmount The amount to take
     * @return bool True if the order is valid
     */
    function checkPredicate(Order calldata order, bytes calldata signature, uint256 takingAmount) external view returns (bool);
} 