// Import only the function without starting the server
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', 'config.env') });

// Mock the server startup to avoid port conflicts
const originalListen = require('http').Server.prototype.listen;
require('http').Server.prototype.listen = function() {
  // Do nothing - prevent server from starting
};

// Now import the function
const { generateNoirProofNode } = require('./index.js');

async function testRealProofs() {
  console.log('Testing real UltraPlonk proof generation...');
  
  const testInput = {
    pid: 20250817,
    puzzle_commitment: 123456789,
    nullifier: 987654321,
    time_sec: 5,
    board: [5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1, 4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9],
    givens_mask: [1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1],
    givens_values: [5, 3, 0, 0, 7, 0, 0, 0, 0, 6, 0, 0, 1, 9, 5, 0, 0, 0, 0, 9, 8, 0, 0, 0, 0, 6, 0, 8, 0, 0, 0, 6, 0, 0, 0, 3, 4, 0, 0, 8, 0, 3, 0, 0, 1, 7, 0, 0, 0, 2, 0, 0, 0, 6, 0, 6, 0, 0, 0, 0, 2, 8, 0, 0, 0, 0, 4, 1, 9, 0, 0, 5, 0, 0, 0, 0, 8, 0, 0, 7, 9]
  };
  
  try {
    const result = await generateNoirProofNode(testInput);
    
    console.log('Proof generation result:');
    console.log('- Mock:', result.mock);
    console.log('- Proof data type:', result.mock ? 'mock' : 'real');
    console.log('- VK data type:', result.mock ? 'mock' : 'real');
    console.log('- Proof length:', result.proof_bytes.length);
    console.log('- Proof data keys:', Object.keys(result.proof_data || {}));
    console.log('- VK data keys:', Object.keys(result.vk_data || {}));
    
    if (!result.mock) {
      console.log('✅ SUCCESS: Real UltraPlonk proof generated!');
      console.log('- Proof hex starts with:', result.proof_data.proof.substring(0, 20) + '...');
      console.log('- VK hex starts with:', result.vk_data.vk.substring(0, 20) + '...');
    } else {
      console.log('❌ FAILED: Still generating mock proofs');
    }
    
  } catch (error) {
    console.error('Error testing proof generation:', error);
  }
}

testRealProofs(); 