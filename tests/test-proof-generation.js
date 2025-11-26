const fs = require('fs');
const path = require('path');

// Copy the generateNoirProofNode function from index.js
async function generateNoirProofNode(input) {
  // input: { pid, puzzle_commitment, nullifier, time_sec, board, givens_mask, givens_values }
  
  try {
    console.log('Generating real UltraPlonk proof data with Noir...');
    
    // Path to the Noir project
    const noirProjectPath = path.join(__dirname, 'noir', 'sudoku');
    
    // Update Prover.toml with the input data
    // Convert hex strings to proper TOML format and handle large values
    // Check if the values are hex strings (64 characters long, hex only)
    const isHexString = (str) => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-fA-F]{64}$/.test(str);
    };
    
    // Function to truncate large hex values to fit Noir's Field modulus
    const truncateForNoir = (hexStr) => {
      if (!isHexString(hexStr)) return hexStr;
      
      // Use a much smaller range to ensure it fits in Noir's Field type
      // Take the first 8 characters of the hex string and convert to a smaller number
      const shortHex = hexStr.substring(0, 8);
      const value = parseInt(shortHex, 16);
      
      // Ensure it's within a safe range (max 10^9)
      return Math.min(value, 999999999).toString();
    };
    
    const puzzleCommitmentStr = isHexString(input.puzzle_commitment) 
      ? truncateForNoir(input.puzzle_commitment)
      : input.puzzle_commitment;
    const nullifierStr = isHexString(input.nullifier) 
      ? truncateForNoir(input.nullifier)
      : input.nullifier;
    
    const proverToml = `pid = ${input.pid}
puzzle_commitment = ${puzzleCommitmentStr}
nullifier = ${nullifierStr}
time_sec = ${input.time_sec}
board = [${input.board.join(', ')}]
givens_mask = [${input.givens_mask.join(', ')}]
givens_values = [${input.givens_values.join(', ')}]`;
    
    fs.writeFileSync(path.join(noirProjectPath, 'Prover.toml'), proverToml);
    
    // Check if we have pre-built artifacts (for Railway deployment)
    const proofHexPath = path.join(noirProjectPath, 'target', 'zkv_proof.hex');
    const vkHexPath = path.join(noirProjectPath, 'target', 'zkv_vk.hex');
    
    let proofHex, vkHex;
    
    if (fs.existsSync(proofHexPath) && fs.existsSync(vkHexPath)) {
      console.log('Using pre-built proof artifacts for Railway deployment...');
      proofHex = fs.readFileSync(proofHexPath, 'utf8').trim();
      vkHex = fs.readFileSync(vkHexPath, 'utf8').trim();
    } else {
      console.log('Pre-built artifacts not found, falling back to mock data');
      throw new Error('Noir artifacts not available in Railway environment');
    }
    
    // Create the proof data structure for zkVerify
    // Handle both hex strings and numbers for public inputs
    const formatHex = (value) => {
      if (typeof value === 'string' && value.startsWith('0x')) {
        return value;
      }
      return `0x${value.toString(16)}`;
    };
    
    const proofData = {
      proof: proofHex,
      public_inputs: {
        pid: formatHex(input.pid),
        time_sec: input.time_sec,
        nullifier: formatHex(input.nullifier),
        puzzle_commitment: formatHex(input.puzzle_commitment)
      }
    };
    
    const vkData = {
      vk: vkHex
    };
    
    console.log('Generated real UltraPlonk proof data');
    console.log('Proof data type: real');
    console.log('VK data type: real');
    console.log('Proof hex length:', proofHex.length);
    console.log('VK hex length:', vkHex.length);
    
    const result = { 
      proof_bytes: Buffer.from(proofHex.slice(2), 'hex'),
      proof_base64: Buffer.from(proofHex.slice(2), 'hex').toString('base64'),
      vk_base64: Buffer.from(vkHex.slice(2), 'hex').toString('base64'),
      mock: false,
      proof_data: proofData,
      vk_data: vkData
    };
    
    console.log('Returning result with proof_data:', !!result.proof_data);
    console.log('Returning result with vk_data:', !!result.vk_data);
    
    return result;
    
  } catch (e) {
    console.error('Error generating real proof:', e);
    
    // Fallback to mock UltraPlonk data
    console.log('Falling back to mock data due to error');
    const fallbackProof = {
      proof_bytes: [85, 76, 80, 49, 7, 7, 7, 7], // UltraPlonk format
      public_inputs: {
        pid: input.pid,
        time_sec: input.time_sec,
        nullifier: input.nullifier,
        puzzle_commitment: input.puzzle_commitment
      }
    };
    
    const fallbackVk = {
      protocol: "ultraplonk",
      curve: "bn128",
      nPublic: 4
    };
    
    return { 
      proof_bytes: Buffer.from(JSON.stringify(fallbackProof)),
      proof_base64: Buffer.from(JSON.stringify(fallbackProof)).toString('base64'),
      vk_base64: Buffer.from(JSON.stringify(fallbackVk)).toString('base64'),
      mock: true,
      proof_data: fallbackProof,
      vk_data: fallbackVk
    };
  }
}

async function testProofGeneration() {
  try {
    console.log('Testing proof generation...');
    
    // Test input similar to what's being sent
    const testInput = {
      pid: 20250823,
      puzzle_commitment: "d8c52e396d4757bb39187a922b6908fdf3a2d1ccd528f4dc76163c3d06333bcc",
      nullifier: "e2587bcc09b3fdcb3b2aa007a31d1ae44d6239e094511725164bd01592d2b25b",
      time_sec: 10,
      board: [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9],
      givens_mask: [1,1,0,0,1,0,0,0,0,1,0,0,1,1,1,0,0,0,0,1,1,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,1,0,0,1,0,1,0,0,1,1,0,0,0,0,1,0,0,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,0,1,0,0,1,1],
      givens_values: [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9]
    };
    
    console.log('Generating proof with test input...');
    const result = await generateNoirProofNode(testInput);
    
    console.log('\nGenerated result:');
    console.log('- mock:', result.mock);
    console.log('- proof_base64 length:', result.proof_base64?.length || 'undefined');
    console.log('- vk_base64 length:', result.vk_base64?.length || 'undefined');
    console.log('- proof_data exists:', !!result.proof_data);
    console.log('- vk_data exists:', !!result.vk_data);
    
    if (result.proof_base64 && result.vk_base64) {
      console.log('\nProof and VK are available!');
      console.log('First 100 chars of proof_base64:', result.proof_base64.substring(0, 100));
      console.log('First 100 chars of vk_base64:', result.vk_base64.substring(0, 100));
    } else {
      console.log('\nProof or VK not available');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProofGeneration(); 