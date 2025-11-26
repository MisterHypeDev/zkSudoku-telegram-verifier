const http = require('http');

const API_BASE = 'http://localhost:3102';
let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3102,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(body)
          };
          resolve(response);
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest(testName, testFn) {
  try {
    await testFn();
    console.log(`✅ ${testName}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
    testsFailed++;
  }
}

// Validate Sudoku solution
function isValidSudokuSolution(board) {
  if (!Array.isArray(board) || board.length !== 81) {
    return false;
  }
  
  // Check for valid numbers (1-9)
  for (let i = 0; i < 81; i++) {
    if (board[i] < 1 || board[i] > 9) {
      return false;
    }
  }
  
  // Check rows
  for (let row = 0; row < 9; row++) {
    const seen = new Set();
    for (let col = 0; col < 9; col++) {
      const num = board[row * 9 + col];
      if (seen.has(num)) return false;
      seen.add(num);
    }
  }
  
  // Check columns
  for (let col = 0; col < 9; col++) {
    const seen = new Set();
    for (let row = 0; row < 9; row++) {
      const num = board[row * 9 + col];
      if (seen.has(num)) return false;
      seen.add(num);
    }
  }
  
  // Check 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = new Set();
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
          const num = board[row * 9 + col];
          if (seen.has(num)) return false;
          seen.add(num);
        }
      }
    }
  }
  
  return true;
}

async function main() {
  console.log('🧪 Logic Lane Puzzle Integrity Test...\n');

  // Test 1: Load all puzzles
  await runTest('Load all Logic Lane puzzles', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    if (response.status !== 200 || !response.data.puzzles) {
      throw new Error('Failed to load puzzles');
    }
    console.log(`   Found ${response.data.puzzles.length} puzzles`);
  });

  // Test 2: Validate each puzzle's structure
  await runTest('Validate puzzle data structure', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    for (const puzzle of puzzles) {
      if (!puzzle.id || !puzzle.name || !puzzle.variant || !puzzle.difficulty) {
        throw new Error(`Puzzle ${puzzle.id} missing required fields`);
      }
      if (!puzzle.rules || typeof puzzle.rules !== 'object') {
        throw new Error(`Puzzle ${puzzle.id} missing rules`);
      }
    }
    console.log(`   All ${puzzles.length} puzzles have valid structure`);
  });

  // Test 3: Validate puzzle solutions
  await runTest('Validate puzzle solutions', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    for (const puzzle of puzzles) {
      const solutionResponse = await makeRequest('GET', `/api/solution?puzzleId=${puzzle.id}&variant=${puzzle.variant}`);
      if (solutionResponse.status !== 200 || !solutionResponse.data.solution) {
        throw new Error(`No solution found for puzzle ${puzzle.id}`);
      }
      
      const solution = solutionResponse.data.solution;
      if (!isValidSudokuSolution(solution)) {
        throw new Error(`Invalid solution for puzzle ${puzzle.id}`);
      }
    }
    console.log(`   All ${puzzles.length} puzzles have valid solutions`);
  });

  // Test 4: Test puzzle commitments
  await runTest('Validate puzzle commitments', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    for (const puzzle of puzzles) {
      const puzzleResponse = await makeRequest('GET', `/api/logic-lane/puzzle/${puzzle.id}`);
      if (puzzleResponse.status !== 200 || !puzzleResponse.data.puzzle.puzzle_commitment) {
        throw new Error(`No commitment for puzzle ${puzzle.id}`);
      }
      
      const commitment = puzzleResponse.data.puzzle.puzzle_commitment;
      if (commitment.length !== 64) { // SHA-256 hex length
        throw new Error(`Invalid commitment length for puzzle ${puzzle.id}`);
      }
    }
    console.log(`   All ${puzzles.length} puzzles have valid commitments`);
  });

  // Test 5: Test puzzle submission with solutions
  await runTest('Test puzzle submission with solutions', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    for (const puzzle of puzzles) {
      const solutionResponse = await makeRequest('GET', `/api/solution?puzzleId=${puzzle.id}&variant=${puzzle.variant}`);
      const solution = solutionResponse.data.solution;
      
      const submitResponse = await makeRequest('POST', '/api/submit', {
        puzzleId: puzzle.id,
        variant: puzzle.variant,
        board: solution,
        user_id: 'testuser',
        pid: `test-${puzzle.id}`
      });
      
      if (submitResponse.status !== 200 || !submitResponse.data.ok) {
        throw new Error(`Submission failed for puzzle ${puzzle.id}`);
      }
    }
    console.log(`   All ${puzzles.length} puzzle solutions accepted`);
  });

  // Test 6: Test puzzle checking with solutions
  await runTest('Test puzzle checking with solutions', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    for (const puzzle of puzzles) {
      const solutionResponse = await makeRequest('GET', `/api/solution?puzzleId=${puzzle.id}&variant=${puzzle.variant}`);
      const solution = solutionResponse.data.solution;
      
      const checkResponse = await makeRequest('POST', '/api/check', {
        puzzleId: puzzle.id,
        variant: puzzle.variant,
        board: solution,
        user_id: 'testuser',
        pid: `test-${puzzle.id}`
      });
      
      if (checkResponse.status !== 200 || !checkResponse.data.ok) {
        throw new Error(`Check failed for puzzle ${puzzle.id}`);
      }
    }
    console.log(`   All ${puzzles.length} puzzle solutions validated`);
  });

  // Test 7: Test puzzle variants (allow duplicates for same variant type)
  await runTest('Test puzzle variants', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    const variants = new Set();
    for (const puzzle of puzzles) {
      variants.add(puzzle.variant);
    }
    console.log(`   Found ${variants.size} unique variants: ${Array.from(variants).join(', ')}`);
  });

  // Test 8: Test puzzle difficulties
  await runTest('Test puzzle difficulties', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    const puzzles = response.data.puzzles;
    
    const difficulties = new Set();
    for (const puzzle of puzzles) {
      if (!['easy', 'medium', 'hard'].includes(puzzle.difficulty)) {
        throw new Error(`Invalid difficulty: ${puzzle.difficulty}`);
      }
      difficulties.add(puzzle.difficulty);
    }
    console.log(`   Found difficulties: ${Array.from(difficulties).join(', ')}`);
  });

  console.log('\n📊 Puzzle Integrity Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All puzzle integrity tests passed!');
    console.log('🔒 All Logic Lane puzzles are valid and secure.');
  } else {
    console.log('\n⚠️  Some integrity tests failed. Please review the puzzle data.');
  }
}

main().catch(console.error); 