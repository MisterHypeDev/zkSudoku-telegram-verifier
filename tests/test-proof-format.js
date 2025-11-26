// Test script to verify proof format for zkVerify
const fs = require('fs');

console.log('🔍 Testing Proof Format for zkVerify\n');

// Load current proof data
try {
  const proofData = JSON.parse(fs.readFileSync('real_groth16_proof.json', 'utf8'));
  const vkData = JSON.parse(fs.readFileSync('real_groth16_vk.json', 'utf8'));
  
  console.log('📄 Current Proof Data:');
  console.log('pi_a[0]:', proofData.pi_a[0].substring(0, 20) + '...');
  console.log('pi_b[0][0]:', proofData.pi_b[0][0].substring(0, 20) + '...');
  console.log('pi_c[0]:', proofData.pi_c[0].substring(0, 20) + '...');
  
  console.log('\n📄 Current VK Data:');
  console.log('vk_alpha_1[0]:', vkData.vk_alpha_1[0].substring(0, 20) + '...');
  console.log('nPublic:', vkData.nPublic);
  
  // Check if data looks like mock data
  const isMockProof = proofData.pi_a[0].includes('9c9c9c9c9c9c9c9c');
  const isMockVk = vkData.vk_alpha_1[0].includes('9b9b9b9b9b9b9b9b');
  
  console.log('\n🔍 Analysis:');
  console.log('Proof contains mock data:', isMockProof);
  console.log('VK contains mock data:', isMockVk);
  
  if (isMockProof || isMockVk) {
    console.log('\n❌ PROBLEM: You are using MOCK DATA!');
    console.log('zkVerify will reject mock data because it doesn\'t correspond to any real circuit.');
    console.log('\n✅ SOLUTION: Generate real proofs from zkREPL:');
    console.log('1. Go to https://zkrepl.dev/');
    console.log('2. Use the Poseidon hash circuit from generate-real-proofs.md');
    console.log('3. Generate real Groth16 proofs');
    console.log('4. Replace the mock files with real data');
  } else {
    console.log('\n✅ Data looks real! The issue might be elsewhere.');
  }
  
} catch (error) {
  console.log('❌ Error loading files:', error.message);
  console.log('Make sure real_groth16_proof.json and real_groth16_vk.json exist');
}

console.log('\n📋 Expected Format for zkVerify:');
console.log('proofData: {');
console.log('  vk: vkObject,           // Raw VK object (not base64)');
console.log('  proof: proofObject,     // Raw proof object (not base64)');
console.log('  publicSignals: [        // BigInt values');
console.log('    BigInt(time_sec),');
console.log('    BigInt(pid),');
console.log('    BigInt("0x" + nullifier),');
console.log('    BigInt("0x" + puzzle_commitment)');
console.log('  ]');
console.log('}'); 