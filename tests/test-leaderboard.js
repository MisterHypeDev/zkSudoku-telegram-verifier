#!/usr/bin/env node

// Simple test script for the leaderboard functionality
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
};

async function testLeaderboard() {
  console.log('🧪 Testing ZkSudoku Leaderboard Functionality\n');

  // Test 1: Supabase Connection
  console.log('1. Testing Supabase Connection...');
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    console.log('✅ Supabase client created successfully');
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    console.log('   This is expected if Supabase is not configured');
  }

  // Test 2: API Endpoints (if server is running)
  console.log('\n2. Testing API Endpoints...');
  try {
    const response = await fetch('http://localhost:3102/api/leaderboard');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Leaderboard API is accessible');
      console.log(`   Found ${data.count || 0} entries`);
    } else {
      console.log('❌ Leaderboard API returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Leaderboard API not accessible (server may not be running)');
    console.log('   Error:', error.message);
  }

  // Test 3: Sample Leaderboard Entry
  console.log('\n3. Testing Sample Entry...');
  const sampleEntry = {
    id: 'test-' + Date.now(),
    address: '0x1234...5678',
    score: 120,
    proof_url: 'https://zkverify-testnet.subscan.io/extrinsic/0x2b22d61da2ed5b3d1a6233bbde2712972e47868a928865b3ae36b4a5271ab6c7',
    date: new Date().toISOString(),
    time_sec: 120,
    user_id: 'test-user-123',
    puzzle_id: '20250115',
    extrinsic_hash: '0x2b22d61da2ed5b3d1a6233bbde2712972e47868a928865b3ae36b4a5271ab6c7'
  };

  console.log('✅ Sample entry created:');
  console.log(`   Player: ${sampleEntry.address}`);
  console.log(`   Time: ${sampleEntry.time_sec}s`);
  console.log(`   Proof: ${sampleEntry.proof_url}`);

  // Test 4: Time Formatting
  console.log('\n4. Testing Time Formatting...');
  const testTimes = [30, 65, 120, 3600];
  testTimes.forEach(seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
    console.log(`   ${seconds}s → ${formatted}`);
  });

  console.log('\n🎉 Leaderboard test completed!');
  console.log('\nNext steps:');
  console.log('1. Set up Supabase (see LEADERBOARD_SETUP.md)');
  console.log('2. Start the bot server: npm start');
  console.log('3. Test the webapp leaderboard interface');
  console.log('4. Submit a puzzle solution to see it appear in the leaderboard');
}

// Run the test
testLeaderboard().catch(console.error); 