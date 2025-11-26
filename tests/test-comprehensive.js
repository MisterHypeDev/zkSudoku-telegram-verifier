#!/usr/bin/env node

// Comprehensive test for Logic Lane implementation
const http = require('http');

const BASE_URL = 'http://localhost:3102';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testLogicLaneComprehensive() {
  console.log('🧪 Comprehensive Logic Lane Test...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Get all Logic Lane puzzles
  console.log('1. Testing /api/logic-lane/puzzles endpoint...');
  try {
    const response = await makeRequest('/api/logic-lane/puzzles');
    
    if (response.status === 200 && response.data.ok && Array.isArray(response.data.puzzles) && response.data.puzzles.length > 0) {
      console.log('✅ Success: Found', response.data.puzzles.length, 'Logic Lane puzzles');
      response.data.puzzles.forEach(puzzle => {
        console.log(`   - ${puzzle.id}. ${puzzle.name} (${puzzle.variant}) - ${puzzle.difficulty}`);
      });
      testsPassed++;
    } else {
      console.log('❌ Failed: Invalid response format');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 2: Get specific puzzle by ID
  console.log('\n2. Testing /api/logic-lane/puzzle/1 endpoint...');
  try {
    const response = await makeRequest('/api/logic-lane/puzzle/1');
    
    if (response.status === 200 && response.data.ok && response.data.puzzle && response.data.puzzle.id === 1) {
      console.log('✅ Success: Retrieved puzzle 1 -', response.data.puzzle.name);
      console.log('   Variant:', response.data.puzzle.variant);
      console.log('   Difficulty:', response.data.puzzle.difficulty);
      console.log('   Has rules:', !!response.data.puzzle.rules);
      testsPassed++;
    } else {
      console.log('❌ Failed: Invalid puzzle data');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 3: Get puzzle by variant
  console.log('\n3. Testing /api/puzzle?variant=thermo endpoint...');
  try {
    const response = await makeRequest('/api/puzzle?variant=thermo');
    
    if (response.status === 200 && response.data.variant === 'thermo') {
      console.log('✅ Success: Retrieved thermo puzzle');
      console.log('   Name:', response.data.name);
      console.log('   Difficulty:', response.data.difficulty);
      testsPassed++;
    } else {
      console.log('❌ Failed: Invalid thermo puzzle data');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 4: Test puzzle submission with Logic Lane puzzle
  console.log('\n4. Testing puzzle submission with Logic Lane puzzle...');
  try {
    // First get a puzzle
    const puzzleResponse = await makeRequest('/api/logic-lane/puzzle/1');
    
    if (!puzzleResponse.data.ok) {
      throw new Error('Failed to get puzzle for testing');
    }
    
    const puzzle = puzzleResponse.data.puzzle;
    const solution = puzzle.solution || [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
    
    const submitResponse = await makeRequest('/api/submit', 'POST', {
      board: solution,
      puzzleId: puzzle.id,
      variant: puzzle.variant
    });
    
    if (submitResponse.status === 200 && submitResponse.data.ok) {
      console.log('✅ Success: Puzzle submission accepted');
      testsPassed++;
    } else {
      console.log('❌ Failed: Puzzle submission rejected -', submitResponse.data.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 5: Test check endpoint with Logic Lane puzzle
  console.log('\n5. Testing check endpoint with Logic Lane puzzle...');
  try {
    const checkResponse = await makeRequest('/api/check', 'POST', {
      board: [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9],
      pid: 'test123',
      user_id: 'testuser',
      puzzleId: 1,
      variant: 'thermo-diagonal'
    });
    
    if (checkResponse.status === 200 && checkResponse.data.ok && checkResponse.data.token && checkResponse.data.nullifier) {
      console.log('✅ Success: Check endpoint working with Logic Lane puzzle');
      testsPassed++;
    } else {
      console.log('❌ Failed: Check endpoint failed -', checkResponse.data.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 6: Test leaderboard filtering
  console.log('\n6. Testing leaderboard filtering by variant...');
  try {
    const leaderboardResponse = await makeRequest('/api/leaderboard?variant=thermo');
    
    if (leaderboardResponse.status === 200 && leaderboardResponse.data.ok && Array.isArray(leaderboardResponse.data.leaderboard)) {
      console.log('✅ Success: Leaderboard filtering working');
      console.log('   Found', leaderboardResponse.data.leaderboard.length, 'entries for thermo variant');
      testsPassed++;
    } else {
      console.log('❌ Failed: Leaderboard filtering failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 7: Test different puzzle variants
  console.log('\n7. Testing different puzzle variants...');
  try {
    const variants = ['thermo', 'palindrome', 'diagonal', 'thermo-diagonal'];
    let variantTestsPassed = 0;
    
    for (const variant of variants) {
      const response = await makeRequest(`/api/puzzle?variant=${variant}`);
      
      if (response.status === 200 && response.data.variant === variant) {
        console.log(`   ✅ ${variant}: OK`);
        variantTestsPassed++;
      } else {
        console.log(`   ❌ ${variant}: Failed`);
      }
    }
    
    if (variantTestsPassed === variants.length) {
      console.log('✅ Success: All puzzle variants working');
      testsPassed++;
    } else {
      console.log('❌ Failed: Some puzzle variants not working');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 8: Test puzzle solution endpoint
  console.log('\n8. Testing puzzle solution endpoint...');
  try {
    const solutionResponse = await makeRequest('/api/solution?puzzleId=1&variant=thermo-diagonal');
    
    if (solutionResponse.status === 200 && solutionResponse.data.solution && Array.isArray(solutionResponse.data.solution)) {
      console.log('✅ Success: Solution endpoint working');
      console.log('   Solution length:', solutionResponse.data.solution.length);
      testsPassed++;
    } else {
      console.log('❌ Failed: Solution endpoint failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Logic Lane implementation is working correctly.');
    console.log('\n🚀 Ready for production use!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run tests
testLogicLaneComprehensive().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
}); 