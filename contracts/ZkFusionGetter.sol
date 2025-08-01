// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/ILimitOrderProtocol.sol";
import "./zkFusionExecutor.sol";
import "./BidCommitment.sol";

/**
 * @title ZkFusionGetter
 * @dev 1inch LOP IAmountGetter implementation for zkFusion Dutch auctions
 * @notice This contract bridges 1inch LOP with our ZK-powered auction system
 * 
 * Integration Flow:
 * 1. 1inch LOP calls getTakingAmount during order fill
 * 2. We decode ZK proof data from the extension.takingAmountData
 * 3. We verify the proof and return the calculated taking amount
 */
contract ZkFusionGetter {
    
    zkFusionExecutor public immutable executor;
    
    // Groth16 proof structure matching our circuit
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    
    event ProofVerified(
        address indexed commitmentContract,
        uint256 totalFill,
        uint256 totalValue,
        uint256 numWinners
    );
    
    constructor(address _executor) {
        executor = zkFusionExecutor(_executor);
    }
    
    /**
     * @dev IAmountGetter interface implementation for 1inch LOP
     * @param extension The order extension containing our ZK proof data
     * @return takingAmount The calculated taking amount from our ZK auction
     */
    function getTakingAmount(
        ILimitOrderProtocol.Order calldata /* order */,
        bytes calldata extension,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 /* makingAmount */,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) external returns (uint256 takingAmount) {
        // Decode our ZK proof data from extension
        // Format: [20-byte getter address][ABI-encoded proof data]
        require(extension.length >= 20, "Invalid extension length");
        
        // Skip the first 20 bytes (our contract address)
        bytes calldata proofData = extension[20:];
        
        // Decode the ABI-encoded proof data
        (
            Proof memory proof,
            uint256[3] memory publicSignals,
            uint256[8] memory originalWinnerBits,
            address commitmentContractAddress
        ) = abi.decode(proofData, (Proof, uint256[3], uint256[8], address));
        
        // Verify the auction proof and get the total value
        uint256 totalValue = verifyAuctionProof(
            proof,
            publicSignals,
            originalWinnerBits,
            commitmentContractAddress
        );
        
        emit ProofVerified(
            commitmentContractAddress,
            publicSignals[0], // totalFill
            totalValue,       // totalValue
            publicSignals[2]  // numWinners
        );
        
        return totalValue;
    }
    
    /**
     * @dev Verify ZK auction proof and return the total taking amount
     * @param proof The Groth16 proof structure
     * @param publicSignals Public signals [totalFill, totalValue, numWinners]
     * @param originalWinnerBits The original winner bits array (8 elements)
     * @param commitmentContractAddress Address of the commitment contract
     * @return totalValue The verified total taking amount
     */
    function verifyAuctionProof(
        Proof memory proof,
        uint256[3] memory publicSignals,
        uint256[8] memory originalWinnerBits,
        address commitmentContractAddress
    ) public view returns (uint256 totalValue) {
        // Convert Proof struct to uint[8] format expected by executor
        uint[8] memory proofArray = [
            proof.a[0], proof.a[1],           // pA
            proof.b[0][0], proof.b[0][1],     // pB[0]
            proof.b[1][0], proof.b[1][1],     // pB[1]
            proof.c[0], proof.c[1]            // pC
        ];
        
        // Convert to uint[3] for executor interface
        uint[3] memory publicSignalsArray = [
            uint(publicSignals[0]),
            uint(publicSignals[1]),
            uint(publicSignals[2])
        ];
        
        // Convert to uint[8] for executor interface
        uint[8] memory originalWinnerBitsArray;
        for (uint i = 0; i < 8; i++) {
            originalWinnerBitsArray[i] = uint(originalWinnerBits[i]);
        }
        
        // Call the executor's verifyAuctionProof function
        return executor.verifyAuctionProof(
            proofArray,
            publicSignalsArray,
            originalWinnerBitsArray,
            commitmentContractAddress
        );
    }
    
    /**
     * @dev Helper function to decode extension data (for testing/debugging)
     * @param extension The extension bytes to decode
     * @return proof The decoded Groth16 proof
     * @return publicSignals The decoded public signals
     * @return originalWinnerBits The decoded winner bits
     * @return commitmentContractAddress The decoded commitment contract address
     */
    function decodeExtension(bytes calldata extension) 
        external 
        pure 
        returns (
            Proof memory proof,
            uint256[3] memory publicSignals,
            uint256[8] memory originalWinnerBits,
            address commitmentContractAddress
        ) 
    {
        require(extension.length >= 20, "Invalid extension length");
        
        // Skip the first 20 bytes (getter contract address)
        bytes calldata proofData = extension[20:];
        
        return abi.decode(proofData, (Proof, uint256[3], uint256[8], address));
    }
} 