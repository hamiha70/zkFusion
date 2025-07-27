// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title BidCommitment
 * @dev Contract for storing bid commitments tied to bidder addresses
 * @notice Each bidder can only submit one commitment, tied to their msg.sender
 */
contract BidCommitment {
    address public owner; // The address of the auction runner who created this instance
    mapping(address => bytes32) public commitments;
    mapping(address => uint256) public commitmentTimestamps;
    
    event BidCommitted(address indexed bidder, bytes32 commitment, uint256 timestamp);
    
    /**
     * @dev Constructor sets the owner (auction runner) for tracking purposes
     * @param _owner The address of the auction runner
     */
    constructor(address _owner) {
        owner = _owner;
    }
    
    /**
     * @dev Allows a bidder to commit to their bid
     * @param hash The Poseidon hash of (price, amount, nonce)
     */
    function commit(bytes32 hash) external {
        require(commitments[msg.sender] == bytes32(0), "Already committed");
        require(hash != bytes32(0), "Invalid commitment hash");
        
        commitments[msg.sender] = hash;
        commitmentTimestamps[msg.sender] = block.timestamp;
        
        emit BidCommitted(msg.sender, hash, block.timestamp);
    }
    
    /**
     * @dev Returns the commitment for a specific bidder
     * @param bidder The address of the bidder
     * @return bytes32 The commitment hash
     */
    function getCommitment(address bidder) external view returns (bytes32) {
        return commitments[bidder];
    }
    
    /**
     * @dev Returns the timestamp when a bidder made their commitment
     * @param bidder The address of the bidder
     * @return uint256 The timestamp of the commitment
     */
    function getCommitmentTimestamp(address bidder) external view returns (uint256) {
        return commitmentTimestamps[bidder];
    }
    
    /**
     * @dev Checks if a bidder has made a commitment
     * @param bidder The address of the bidder
     * @return bool True if the bidder has committed
     */
    function hasCommitted(address bidder) external view returns (bool) {
        return commitments[bidder] != bytes32(0);
    }
} 