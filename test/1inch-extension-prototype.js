/**
 * @file 1inch-extension-prototype.js
 * @title 1inch LOP Extension Prototype (Task 2.4)
 * @description This script serves as a minimal, focused prototype to de-risk the
 * off-chain logic for interacting with the 1inch Limit Order Protocol, specifically
 * for creating an order with a custom extension for zkFusion.
 *
 * It does NOT execute a transaction but focuses on correctly:
 * 1. Creating dummy ZK proof data.
 * 2. ABI-encoding the proof data for the getter contract.
 * 3. Constructing the `takingAmountData` bytestring.
 * 4. Building the final `Extension` object.
 * 5. Creating and logging a `LimitOrder` object, which demonstrates the correct salt generation.
 *
 * This provides the core, validated logic for the final `demo.ts` script.
 */

const { AbiCoder } = require('ethers');
const { LimitOrder, Extension } = require('../docs_external/1inch/limit-order-sdk/src/limit-order'); // Adjust path as needed
const { trim0x } = require('@1inch/byte-utils');
const { Address } = require('../docs_external/1inch/limit-order-sdk/src/address');

async function prototypeExtension() {
    console.log('🚀 Prototyping 1inch LOP Extension for zkFusion...');

    // =================================================================
    // 1. DUMMY DATA (Simulating output from our ZK pipeline)
    // =================================================================

    // A realistic-looking dummy Groth16 proof
    const dummyProof = {
        a: ['0x0c09262e3337e3d3f41723e7e83d898863f9d505e8a5a4c9c10f81d8c11a6f05', '0x264188339c3e98f0965d1a3a404983050072d65078518e906371f1e14918e976'],
        b: [
            ['0x23c91d4e0e4f8d6d6e7f7c6b12c6a016f4d8e8b2b3b4b5b6b7b8b9bacbdcedfe', '0x18b9b9b8b7b6b5b4b3b2a1a0a1a2a3a4a5a6a7a8a9abacadaeafb0b1b2b3b4b5'],
            ['0x09876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba', '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef']
        ],
        c: ['0x1a2b3c4d5e6f78901a2b3c4d5e6f78901a2b3c4d5e6f78901a2b3c4d5e6f7890', '0x0f1e2d3c4b5a69788796a5b4c3d2e1f0f1e2d3c4b5a69788796a5b4c3d2e1f0']
    };

    // Dummy public signals [totalFill, totalValue, numWinners] + originalWinnerBits
    const dummyPublicSignals = ['450', '340000', '3'];
    const dummyOriginalWinnerBits = ['1', '1', '0', '1', '0', '0', '0', '0']; // Example from test

    // Dummy addresses
    const ZK_FUSION_GETTER_ADDRESS = '0x1234567890123456789012345678901234567890';
    const COMMITMENT_CONTRACT_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const MAKER_ADDRESS = '0x1111111111111111111111111111111111111111';
    const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'; // Arbitrum WETH
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum USDC

    console.log('\n✅ Step 1: Dummy data prepared.');

    // =================================================================
    // 2. ABI ENCODING (The core off-chain logic)
    // =================================================================

    // The types must match EXACTLY what our ZkFusionGetter.sol will expect
    const getterArgTypes = [
        'tuple(uint256[2] a, uint256[2][2] b, uint256[2] c)', // proof
        'uint256[3]', // publicSignals [totalFill, totalValue, numWinners]
        'uint256[8]', // originalWinnerBits
        'address'     // commitmentContractAddress
    ];
    const getterArgValues = [
        dummyProof,
        dummyPublicSignals,
        dummyOriginalWinnerBits,
        COMMITMENT_CONTRACT_ADDRESS
    ];

    const proofData = AbiCoder.defaultAbiCoder().encode(getterArgTypes, getterArgValues);

    console.log('\n✅ Step 2: Getter calldata ABI-encoded.');
    console.log('   - Encoded Data (first 64 bytes):', proofData.substring(0, 66));

    // =================================================================
    // 3. EXTENSION OBJECT CONSTRUCTION (The 1inch SDK part)
    // =================================================================

    // As per our analysis: first 20 bytes are the getter address, the rest is our calldata.
    const takingAmountData = ZK_FUSION_GETTER_ADDRESS + trim0x(proofData);

    const extension = new Extension({
        ...Extension.EMPTY,
        takingAmountData: takingAmountData,
    });

    console.log('\n✅ Step 3: 1inch SDK Extension object constructed.');
    console.log('   - takingAmountData created and assigned.');

    // =================================================================
    // 4. LIMIT ORDER CREATION (Putting it all together)
    // =================================================================

    const orderInfo = {
        maker: new Address(MAKER_ADDRESS),
        makerAsset: new Address(WETH_ADDRESS),
        takerAsset: new Address(USDC_ADDRESS),
        makingAmount: 10n * (10n ** 18n), // 10 WETH
        takingAmount: 34000n * (10n ** 6n), // 34,000 USDC (example)
        // salt is omitted, so the SDK will generate it from the extension
    };

    // The SDK's LimitOrder class automatically handles the complex salt generation
    const limitOrder = new LimitOrder(orderInfo, undefined, extension);

    console.log('\n✅ Step 4: LimitOrder object created.');
    console.log('   - Maker:', limitOrder.maker.toString());
    console.log('   - Making Amount:', limitOrder.makingAmount.toString());
    console.log('   - Crucially, the SALT was auto-generated:');
    console.log('   - Salt:', limitOrder.salt.toString(16));

    // The `build()` method creates the final struct for signing
    const orderStruct = limitOrder.build();
    console.log('\n✅ Final Order Struct (for EIP-712 signing):');
    console.log(JSON.stringify(orderStruct, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
    ));
}

prototypeExtension().catch(console.error); 