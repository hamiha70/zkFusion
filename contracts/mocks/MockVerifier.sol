// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title MockVerifier
 * @dev Mock ZK verifier for testing purposes
 * @notice This is a placeholder - replace with actual Circom-generated verifier
 */
contract MockVerifier {
    bool public alwaysReturn = true;
    
    event ProofVerified(bool result);
    
    /**
     * @dev Mock verification function that always returns true for testing
     * @param _pA First component of the proof
     * @param _pB Second component of the proof  
     * @param _pC Third component of the proof
     * @param _pubSignals Public signals/inputs
     * @return bool Always returns true in mock mode
     */
    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[8] memory _pubSignals
    ) external view returns (bool) {
        // Silence unused parameter warnings
        _pA;
        _pB;
        _pC;
        _pubSignals;
        
        // In a real verifier, this would verify the Groth16 proof
        // For testing, we just return the configured value
        return alwaysReturn;
    }
    
    /**
     * @dev Set the return value for testing (admin only)
     * @param _return The value to return from verifyProof
     */
    function setReturnValue(bool _return) external {
        alwaysReturn = _return;
    }
    
    /**
     * @dev View version of verifyProof for gas estimation
     */
    function verifyProofView(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[8] memory _pubSignals
    ) public view returns (bool) {
        // Silence unused variable warnings
        _pA;
        _pB;
        _pC;
        _pubSignals;
        
        return alwaysReturn;
    }
} 