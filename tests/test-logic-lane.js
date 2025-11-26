#!/usr/bin/env node

// Test script for Logic Lane implementation
const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3102';

async function testLogicLane() {
  console.log('🧪 Testing Logic Lane Implementation...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Get all Logic Lane puzzles
  console.log('1. Testing /api/logic-lane/puzzles endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/logic-lane/puzzles`);
    const data = await response.json();
    
    if (data.ok && Array.isArray(data.puzzles) && data.puzzles.length > 0) {
      console.log('✅ Success: Found', data.puzzles.length, 'Logic Lane puzzles');
      console.log('   Puzzles:', data.puzzles.map(p => `${p.name} (${p.variant})`).join(', '));
      testsPassed++;
    } else {
      console.log('❌ Failed: Invalid response format');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 2: Get specific puzzle
  console.log('\n2. Testing /api/logic-lane/puzzle/1 endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/logic-lane/puzzle/1`);
    const data = await response.json();
    
    if (data.ok && data.puzzle && data.puzzle.id === 1) {
      console.log('✅ Success: Retrieved puzzle 1 -', data.puzzle.name);
      console.log('   Variant:', data.puzzle.variant);
      console.log('   Difficulty:', data.puzzle.difficulty);
      testsPassed++;
    } else {
      console.log('❌ Failed: Invalid puzzle data');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 3: Test puzzle submission with Logic Lane puzzle
  console.log('\n3. Testing puzzle submission with Logic Lane puzzle...');
  try {
    // First get a puzzle
    const puzzleResponse = await fetch(`${BASE_URL}/api/logic-lane/puzzle/1`);
    const puzzleData = await puzzleResponse.json();
    
    if (!puzzleData.ok) {
      throw new Error('Failed to get puzzle for testing');
    }
    
    const puzzle = puzzleData.puzzle;
    const solution = puzzle.solution || [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
    
    const submitResponse = await fetch(`${BASE_URL}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: solution,
        puzzleId: puzzle.id,
        variant: puzzle.variant
      })
    });
    
    const submitData = await submitResponse.json();
    
    if (submitData.ok) {
      console.log('✅ Success: Puzzle submission accepted');
      testsPassed++;
    } else {
      console.log('❌ Failed: Puzzle submission rejected -', submitData.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 4: Test check endpoint with Logic Lane puzzle
  console.log('\n4. Testing check endpoint with Logic Lane puzzle...');
  try {
    const checkResponse = await fetch(`${BASE_URL}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9],
        pid: 'test123',
        user_id: 'testuser',
        puzzleId: 1,
        variant: 'thermo-diagonal'
      })
    });
    
    const checkData = await checkResponse.json();
    
    if (checkData.ok && checkData.token && checkData.nullifier) {
      console.log('✅ Success: Check endpoint working with Logic Lane puzzle');
      testsPassed++;
    } else {
      console.log('❌ Failed: Check endpoint failed -', checkData.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 5: Test leaderboard filtering
  console.log('\n5. Testing leaderboard filtering by variant...');
  try {
    const leaderboardResponse = await fetch(`${BASE_URL}/api/leaderboard?variant=thermo`);
    const leaderboardData = await leaderboardResponse.json();
    
    if (leaderboardData.ok && Array.isArray(leaderboardData.leaderboard)) {
      console.log('✅ Success: Leaderboard filtering working');
      console.log('   Found', leaderboardData.leaderboard.length, 'entries for thermo variant');
      testsPassed++;
    } else {
      console.log('❌ Failed: Leaderboard filtering failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
    testsFailed++;
  }
  
  // Test 6: Test puzzle variants
  console.log('\n6. Testing different puzzle variants...');
  try {
    const variants = ['thermo', 'palindrome', 'diagonal', 'thermo-diagonal'];
    let variantTestsPassed = 0;
    
    for (const variant of variants) {
      const response = await fetch(`${BASE_URL}/api/puzzle?variant=${variant}`);
      const data = await response.json();
      
      if (data.variant === variant) {
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
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Logic Lane implementation is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run tests
testLogicLane().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
}); 