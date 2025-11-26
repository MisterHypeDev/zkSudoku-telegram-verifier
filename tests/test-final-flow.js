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

async function main() {
  console.log('🧪 Final User Flow Test...\n');

  // Test 1: Load Logic Lane puzzles
  await runTest('Load Logic Lane puzzles', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzles');
    if (response.status !== 200 || !response.data.puzzles || response.data.puzzles.length !== 6) {
      throw new Error(`Expected 6 puzzles, got ${response.data.puzzles?.length || 0}`);
    }
  });

  // Test 2: Select a specific puzzle
  await runTest('Select Thermo Diagonal puzzle', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzle/1');
    if (response.status !== 200 || response.data.puzzle.name !== 'Thermo Diagonal') {
      throw new Error(`Expected Thermo Diagonal puzzle`);
    }
  });

  // Test 3: Get puzzle solution
  await runTest('Get puzzle solution', async () => {
    const response = await makeRequest('GET', '/api/solution?puzzleId=1&variant=thermo-diagonal');
    if (response.status !== 200 || !response.data.solution || response.data.solution.length !== 81) {
      throw new Error(`Expected 81-length solution`);
    }
  });

  // Test 4: Submit a completed puzzle
  await runTest('Submit completed puzzle', async () => {
    const solution = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
    const response = await makeRequest('POST', '/api/submit', {
      puzzleId: 1,
      variant: 'thermo-diagonal',
      board: solution,
      user_id: 'testuser',
      pid: 'test123'
    });
    if (response.status !== 200 || !response.data.ok) {
      throw new Error(`Submission failed`);
    }
  });

  // Test 5: Check puzzle validity
  await runTest('Check puzzle validity', async () => {
    const solution = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
    const response = await makeRequest('POST', '/api/check', {
      puzzleId: 1,
      variant: 'thermo-diagonal',
      board: solution,
      user_id: 'testuser',
      pid: 'test123'
    });
    if (response.status !== 200 || !response.data.ok) {
      throw new Error(`Check failed`);
    }
  });

  // Test 6: Test puzzle commitment
  await runTest('Verify puzzle commitment', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzle/1');
    if (response.status !== 200 || !response.data.puzzle.puzzle_commitment) {
      throw new Error(`No puzzle commitment found`);
    }
    const commitment = response.data.puzzle.puzzle_commitment;
    if (commitment.length !== 64) { // SHA-256 hex length
      throw new Error(`Invalid commitment length: ${commitment.length}`);
    }
  });

  // Test 7: Test different puzzle variant
  await runTest('Test Palindrome puzzle variant', async () => {
    const response = await makeRequest('GET', '/api/logic-lane/puzzle/palindrome');
    if (response.status !== 200 || response.data.puzzle.variant !== 'palindrome') {
      throw new Error(`Expected palindrome variant`);
    }
  });

  // Test 8: Test leaderboard filtering
  await runTest('Test leaderboard filtering', async () => {
    const response = await makeRequest('GET', '/api/leaderboard?variant=thermo-diagonal');
    if (response.status !== 200 || !response.data.leaderboard) {
      throw new Error(`Leaderboard filtering failed`);
    }
  });

  // Test 9: Test web interface accessibility
  await runTest('Test Logic Lane web interface', async () => {
    const response = await makeRequest('GET', '/webapp/logic-lane.html');
    if (response.status !== 200 || !response.data.includes('Logic Lane - ZkSudoku')) {
      throw new Error(`Logic Lane web interface not accessible`);
    }
  });

  // Test 10: Test main web interface
  await runTest('Test main web interface', async () => {
    const response = await makeRequest('GET', '/webapp/');
    if (response.status !== 200 || !response.data.includes('ZkSudoku')) {
      throw new Error(`Main web interface not accessible`);
    }
  });

  console.log('\n📊 Final Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Logic Lane implementation is fully functional.');
    console.log('🚀 Ready for production deployment!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

main().catch(console.error); 