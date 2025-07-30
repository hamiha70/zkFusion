pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Minimal circuit to test single Poseidon hash
template TestSinglePoseidon() {
    signal input price;
    signal input amount;  
    signal input bidder;
    signal input contract;
    signal input expected;
    
    // Output what the circuit actually calculates
    signal output calculated;
    
    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== price;
    poseidon.inputs[1] <== amount;
    poseidon.inputs[2] <== bidder;
    poseidon.inputs[3] <== contract;
    
    // Capture the actual calculated hash
    calculated <== poseidon.out;
    
    // The constraint that's failing in our main circuit
    poseidon.out === expected;
}

// Main component for testing
component main = TestSinglePoseidon(); 