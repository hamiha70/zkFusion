// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Fixed circuit size for zkFusion hackathon
uint8 constant N_MAX_BIDS = 8;

/**
 * @title BidCommitment
 * @dev Contract for storing bid commitments in fixed arrays for ZK circuit compatibility
 * @notice Refactored to use fixed arrays matching our ZK circuit's N=8 design
 * 
 * Key Changes from v1:
 * - Fixed uint256[8] commitments array instead of mapping
 * - Fixed address[8] bidderAddresses array for tracking bidders
 * - Two-phase initialization with off-chain nullHash computation
 * - Direct array access for ZK circuit integration
 */
contract BidCommitment {
    address public owner; // The address of the auction runner who created this instance
    
    // Fixed arrays matching our ZK circuit design (N=8)
    uint256[N_MAX_BIDS] public commitments;      // Poseidon hashes of bids
    address[N_MAX_BIDS] public bidderAddresses;  // Corresponding bidder addresses
    uint256[N_MAX_BIDS] public commitmentTimestamps; // Timestamps for each commitment
    
    // State tracking
    uint8 public commitmentCount;
    bool public initialized;
    uint256 public nullHash; // Off-chain computed null hash for empty slots
    
    event BidCommitted(address indexed bidder, uint8 indexed slotIndex, uint256 commitment, uint256 timestamp);
    event ContractInitialized(uint256 nullHash, uint8 initialCommitments);
    
    /**
     * @dev Constructor sets the owner (auction runner) for tracking purposes
     * @param _owner The address of the auction runner
     */
    constructor(address _owner) {
        owner = _owner;
        commitmentCount = 0;
        initialized = false;
    }
    
    /**
     * @dev Two-phase initialization with off-chain computed nullHash
     * @param _nullHash The Poseidon hash representing null/empty commitments (computed off-chain)
     * @param _initialBidders Array of initial bidder addresses (can be empty)
     * @param _initialCommitments Array of initial commitments (can be empty)
     * @notice Only owner can initialize, and only once
     */
    function initialize(
        uint256 _nullHash,
        address[] calldata _initialBidders,
        uint256[] calldata _initialCommitments
    ) external {
        require(msg.sender == owner, "Only owner can initialize");
        require(!initialized, "Already initialized");
        require(_initialBidders.length == _initialCommitments.length, "Array length mismatch");
        require(_initialBidders.length <= N_MAX_BIDS, "Too many initial commitments");
        require(_nullHash != 0, "Invalid null hash");
        
        nullHash = _nullHash;
        
        // Set initial commitments
        uint8 i;
        for (i = 0; i < _initialBidders.length; i++) {
            require(_initialBidders[i] != address(0), "Invalid bidder address");
            require(_initialCommitments[i] != 0 && _initialCommitments[i] != _nullHash, "Invalid commitment");
            
            commitments[i] = _initialCommitments[i];
            bidderAddresses[i] = _initialBidders[i];
            commitmentTimestamps[i] = block.timestamp;
        }
        
        // Fill remaining slots with nullHash
        for (i = uint8(_initialBidders.length); i < N_MAX_BIDS; i++) {
            commitments[i] = _nullHash;
            bidderAddresses[i] = address(0);
            commitmentTimestamps[i] = 0;
        }
        
        commitmentCount = uint8(_initialBidders.length);
        initialized = true;
        
        emit ContractInitialized(_nullHash, commitmentCount);
    }
    
    /**
     * @dev Allows a bidder to commit to their bid (if slots available)
     * @param hash The Poseidon hash of (price, amount, nonce)
     * @notice Can only be called after initialization and if slots are available
     */
    function commit(uint256 hash) external {
        require(initialized, "Contract not initialized");
        require(commitmentCount < N_MAX_BIDS, "No available slots");
        require(hash != 0 && hash != nullHash, "Invalid commitment hash");
        
        // Check if bidder already committed
        for (uint8 i = 0; i < commitmentCount; i++) {
            require(bidderAddresses[i] != msg.sender, "Already committed");
        }
        
        // Add commitment to next available slot
        uint8 slotIndex = commitmentCount;
        commitments[slotIndex] = hash;
        bidderAddresses[slotIndex] = msg.sender;
        commitmentTimestamps[slotIndex] = block.timestamp;
        commitmentCount++;
        
        emit BidCommitted(msg.sender, slotIndex, hash, block.timestamp);
    }
    
    /**
     * @dev Returns the commitment at a specific array index
     * @param index Array index (0-7)
     * @return commitment The commitment hash at that index
     */
    function getCommitmentByIndex(uint8 index) external view returns (uint256 commitment) {
        require(index < N_MAX_BIDS, "Index out of bounds");
        return commitments[index];
    }
    
    /**
     * @dev Returns the bidder address at a specific array index
     * @param index Array index (0-7)
     * @return bidder The bidder address at that index
     */
    function getBidderByIndex(uint8 index) external view returns (address bidder) {
        require(index < N_MAX_BIDS, "Index out of bounds");
        return bidderAddresses[index];
    }
    
    /**
     * @dev Returns all commitments as a fixed array for ZK circuit
     * @return commitments The complete uint256[8] commitments array
     */
    function getAllCommitments() external view returns (uint256[N_MAX_BIDS] memory) {
        return commitments;
    }
    
    /**
     * @dev Returns all bidder addresses as a fixed array
     * @return bidders The complete address[8] bidder addresses array
     */
    function getAllBidders() external view returns (address[N_MAX_BIDS] memory) {
        return bidderAddresses;
    }
    
    /**
     * @dev Legacy compatibility: Returns commitment for a specific bidder
     * @param bidder The address of the bidder
     * @return commitment The commitment hash (0 if not found)
     */
    function getCommitment(address bidder) external view returns (uint256 commitment) {
        for (uint8 i = 0; i < commitmentCount; i++) {
            if (bidderAddresses[i] == bidder) {
                return commitments[i];
            }
        }
        return 0; // Not found
    }
    
    /**
     * @dev Legacy compatibility: Returns timestamp for a specific bidder
     * @param bidder The address of the bidder
     * @return timestamp The commitment timestamp (0 if not found)
     */
    function getCommitmentTimestamp(address bidder) external view returns (uint256 timestamp) {
        for (uint8 i = 0; i < commitmentCount; i++) {
            if (bidderAddresses[i] == bidder) {
                return commitmentTimestamps[i];
            }
        }
        return 0; // Not found
    }
    
    /**
     * @dev Legacy compatibility: Checks if a bidder has committed
     * @param bidder The address of the bidder
     * @return hasCommitted True if the bidder has committed
     */
    function hasCommitted(address bidder) external view returns (bool) {
        for (uint8 i = 0; i < commitmentCount; i++) {
            if (bidderAddresses[i] == bidder) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Returns contract state information
     * @return isInitialized Whether the contract is initialized
     * @return currentCount Current number of commitments
     * @return nullHashValue The null hash used for empty slots
     */
    function getContractState() external view returns (bool isInitialized, uint8 currentCount, uint256 nullHashValue) {
        return (initialized, commitmentCount, nullHash);
    }
} 