const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 DECODING ERROR CODE & VERIFYING fillOrder FUNCTIONS");
  console.log("=" .repeat(70));
  
  const ADDRESS_1 = "0x1111111254fb6c44bac0bed2854e76f90643097d"; // Original
  const ADDRESS_2 = "0x111111125421ca6dc452d289314280a0f8642a65"; // GitHub
  const ERROR_CODE = "0x5cd5d233";
  
  console.log(`Address 1 (Original): ${ADDRESS_1}`);
  console.log(`Address 2 (GitHub):   ${ADDRESS_2}`);
  console.log(`Error Code to Decode: ${ERROR_CODE}`);
  console.log("");
  
  // === STEP 1: DECODE ERROR CODE ===
  console.log("🔍 STEP 1: DECODING ERROR CODE 0x5cd5d233");
  console.log("-".repeat(50));
  
  try {
    // Common 1inch LOP error signatures
    const commonErrors = [
      "error OrderExpired()",
      "error InvalidSignature()",
      "error InsufficientBalance()",
      "error InsufficientAllowance()",
      "error OrderAlreadyFilled()",
      "error InvalidOrder()",
      "error InvalidMaker()",
      "error InvalidTaker()",
      "error TransferFailed()",
      "error InvalidAmount()",
      "error OrderCancelled()",
      "error InvalidExtension()",
      "error InvalidGetter()",
      "error CallFailed()",
      "error ReentrancyGuard()",
      "error ZeroAddress()",
      "error InvalidNonce()",
      "error DeadlineExpired()",
      "error InvalidReceiver()",
      "error InvalidTraits()",
      "error InvalidSalt()",
      "error OrderNotFillable()",
      "error MakerAmountTooLow()",
      "error TakerAmountTooLow()",
      "error InvalidAsset()",
      "error AssetTransferFailed()",
      "error PredicateFailed()",
      "error InteractionFailed()",
      "error PostInteractionFailed()",
      "error GetterFailed()",
      "error InvalidData()",
      "error BadSignature()",
      "error WrongAmount()",
      "error WrongGetter()",
      "error PrivateOrder()",
      "error BadPool()",
      "error ZeroTargetIsForbidden()",
      "error OnlyOneAmountShouldBeZero()",
      "error SwapWithZeroAmount()",
      "error UnknownOrder()",
      "error RevertReasonForwarded(bytes reason)",
      "error SafeTransferFailed()",
      "error SafeTransferFromFailed()",
      "error PermitLengthTooLow()",
      "error InvalidPermit()",
      "error SimulationResults(bool success, bytes res)",
      "error ArbitraryStaticCallFailed()",
      "error OrderIsNotSuitableForMassInvalidation()",
      "error EpochManagerAndBitInvalidatorsAreIncompatible()",
      "error InvalidatedOrder()",
      "error TakingAmountTooHigh()",
      "error MakingAmountTooLow()",
      "error TransferFromMakerToTakerFailed()",
      "error TransferFromTakerToMakerFailed()",
      "error WrongSeriesNonce()",
      "error WrongPredicate()",
      "error NonceAlreadyUsed(uint256 invalidNonce)",
      "error AdvanceNonceFailed()",
      "error UnknownSelector(bytes4 selector)"
    ];
    
    const errorInterface = new ethers.Interface(commonErrors);
    
    try {
      const decodedError = errorInterface.parseError(ERROR_CODE);
      console.log(`✅ DECODED ERROR: ${decodedError.name}`);
      if (decodedError.args && decodedError.args.length > 0) {
        console.log(`   Arguments: ${decodedError.args}`);
      }
    } catch (decodeError) {
      console.log(`❌ Could not decode with common errors`);
      
      // Try to compute the selector manually
      const selector = ERROR_CODE.slice(0, 10);
      console.log(`   Error selector: ${selector}`);
      
      // Check if it matches any known selectors
      for (const errorSig of commonErrors) {
        if (errorSig.includes("(")) {
          const computedSelector = ethers.id(errorSig.split(" ")[1]).slice(0, 10);
          if (computedSelector.toLowerCase() === selector.toLowerCase()) {
            console.log(`✅ MATCHED: ${errorSig}`);
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error in decoding: ${error.message}`);
  }
  
  console.log("");
  
  // === STEP 2: VERIFY fillOrder FUNCTION ON BOTH ADDRESSES ===
  console.log("🔍 STEP 2: VERIFYING fillOrder FUNCTIONS");
  console.log("-".repeat(50));
  
  // Test different fillOrder signatures
  const fillOrderSignatures = [
    // Basic fillOrder (no args)
    "function fillOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256) external",
    // fillOrder with extension
    "function fillOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes,bytes32,bytes32,uint256,uint256) external",
    // fillOrderArgs (our current approach)
    "function fillOrderArgs((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,bytes) external",
    // fillOrderTo
    "function fillOrderTo((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,address) external",
    // fillOrderToWithPermit
    "function fillOrderToWithPermit((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,address,bytes) external"
  ];
  
  for (const [label, address] of [["Address 1 (Original)", ADDRESS_1], ["Address 2 (GitHub)", ADDRESS_2]]) {
    console.log(`\n📋 Testing ${label}: ${address}`);
    
    for (let i = 0; i < fillOrderSignatures.length; i++) {
      const signature = fillOrderSignatures[i];
      const functionName = signature.split("(")[0].split(" ")[1];
      
      try {
        const testABI = [signature];
        const contract = new ethers.Contract(address, testABI, ethers.provider);
        
        // Create dummy parameters
        const dummyOrder = [1n, 1n, 0n, 1n, 1n, 1n, 1n, 0n];
        const dummyR = ethers.ZeroHash;
        const dummyVs = ethers.ZeroHash;
        const dummyAmount = 1n;
        const dummyTraits = 0n;
        
        // Test the function exists by calling staticCall
        try {
          if (functionName === "fillOrder" && signature.includes("bytes,")) {
            // fillOrder with extension
            await contract[functionName].staticCall(dummyOrder, "0x", dummyR, dummyVs, dummyAmount, dummyTraits);
          } else if (functionName === "fillOrderArgs") {
            // fillOrderArgs
            await contract[functionName].staticCall(dummyOrder, dummyR, dummyVs, dummyAmount, dummyTraits, "0x");
          } else if (functionName === "fillOrderTo") {
            // fillOrderTo
            await contract[functionName].staticCall(dummyOrder, dummyR, dummyVs, dummyAmount, dummyTraits, ethers.ZeroAddress);
          } else if (functionName === "fillOrderToWithPermit") {
            // fillOrderToWithPermit
            await contract[functionName].staticCall(dummyOrder, dummyR, dummyVs, dummyAmount, dummyTraits, ethers.ZeroAddress, "0x");
          } else {
            // Basic fillOrder
            await contract[functionName].staticCall(dummyOrder, dummyR, dummyVs, dummyAmount, dummyTraits);
          }
          console.log(`   ✅ ${functionName}: EXISTS (reverts as expected)`);
        } catch (callError) {
          if (callError.message.includes("no matching fragment")) {
            console.log(`   ❌ ${functionName}: NOT FOUND`);
          } else {
            console.log(`   ✅ ${functionName}: EXISTS (reverts: ${callError.message.slice(0, 40)}...)`);
          }
        }
        
      } catch (contractError) {
        console.log(`   ❌ ${functionName}: Error creating contract interface`);
      }
    }
  }
  
  console.log("");
  
  // === STEP 3: CHECK ACTUAL FUNCTION SELECTORS ===
  console.log("🔍 STEP 3: COMPUTING FUNCTION SELECTORS");
  console.log("-".repeat(50));
  
  const functionSignatures = [
    "fillOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256)",
    "fillOrderArgs((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,bytes)",
    "fillOrderTo((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,address)",
    "hashOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))"
  ];
  
  for (const sig of functionSignatures) {
    const selector = ethers.id(sig).slice(0, 10);
    console.log(`${sig}`);
    console.log(`   Selector: ${selector}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 