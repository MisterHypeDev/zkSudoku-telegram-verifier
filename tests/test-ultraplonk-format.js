// Test script to show correct UltraPlonk format for zkVerify
const fs = require('fs');

console.log('🔍 Testing UltraPlonk Format for zkVerify\n');

// According to zkVerify docs, UltraPlonk expects:
// 1. Proof: Raw binary data (Buffer)
// 2. VK: Raw binary data (Buffer)

console.log('📋 Correct UltraPlonk Format (from zkVerify docs):');
console.log('proofData: {');
console.log('  vk: base64Vk,        // Base64 encoded raw VK binary');
console.log('  proof: base64Proof,  // Base64 encoded raw proof binary');
console.log('}');
console.log('');

// Current bot is using JSON objects instead of raw binary
console.log('❌ Current Bot Issue:');
console.log('- Loading Groth16 JSON files (real_groth16_proof.json, real_groth16_vk.json)');
console.log('- Trying to use Groth16 format as UltraPlonk');
console.log('- UltraPlonk expects raw binary data, not JSON objects');
console.log('');

console.log('✅ Solution:');
console.log('1. Generate real UltraPlonk proofs using Noir CLI');
console.log('2. Use raw binary files (not JSON)');
console.log('3. Convert to base64 as required by zkVerify');
console.log('');

// Show what the files should look like
console.log('📁 Expected File Structure:');
console.log('bot/');
console.log('├── target/');
console.log('│   ├── proof          # Raw binary proof from Noir');
console.log('│   ├── vk             # Raw binary VK from Noir');
console.log('│   ├── zkv_proof.hex  # Hex format for zkVerify');
console.log('│   └── zkv_vk.hex     # Hex format for zkVerify');
console.log('└── index.js           # Updated to use raw binary');
console.log('');

console.log('🔧 Next Steps:');
console.log('1. Follow setup-ultraplonk-noir.md to install Noir');
console.log('2. Generate real UltraPlonk proofs using bb CLI');
console.log('3. Update bot to load raw binary files');
console.log('4. Convert to base64 format for zkVerify submission');
console.log('');

console.log('📖 Reference: https://docs.zkverify.io/overview/getting-started/generating-proof'); 