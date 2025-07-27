// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./BidCommitment.sol";

/**
 * @title CommitmentFactory
 * @dev Factory contract for creating trusted BidCommitment contracts
 * @notice Only BidCommitment contracts created by this factory are accepted by zkFusionExecutor
 */
contract CommitmentFactory {
    address[] public allCommitments;
    mapping(address => bool) public isCommitmentContract;
    
    event CommitmentCreated(address indexed commitmentContract, address indexed creator);
    
    /**
     * @dev Creates a new BidCommitment contract
     * @return address The address of the newly created BidCommitment contract
     */
    function createCommitmentContract() external returns (address) {
        BidCommitment newContract = new BidCommitment(msg.sender);
        address contractAddress = address(newContract);
        
        allCommitments.push(contractAddress);
        isCommitmentContract[contractAddress] = true;
        
        emit CommitmentCreated(contractAddress, msg.sender);
        return contractAddress;
    }
    
    /**
     * @dev Returns the total number of commitment contracts created
     */
    function getCommitmentCount() external view returns (uint256) {
        return allCommitments.length;
    }
    
    /**
     * @dev Returns all commitment contract addresses
     */
    function getAllCommitments() external view returns (address[] memory) {
        return allCommitments;
    }
    
    /**
     * @dev Checks if an address is a valid commitment contract created by this factory
     * @param contractAddress The address to check
     * @return bool True if the address is a valid commitment contract
     */
    function isValidCommitmentContract(address contractAddress) external view returns (bool) {
        return isCommitmentContract[contractAddress];
    }
} 