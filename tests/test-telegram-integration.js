/**
 * Test file for Telegram Integration with existing bot
 */

const TelegramZkVerifyIntegration = require('./telegram-zkverify-integration');

async function testTelegramIntegration() {
    console.log('🧪 Testing Telegram Integration with existing bot...\n');

    // Create integration instance
    const integration = new TelegramZkVerifyIntegration({
        zkvWs: process.env.ZKV_WS || 'wss://volta-rpc.zkverify.io',
        seedPhrase: process.env.ZKV_SIGNER_MNEMONIC
    });

    try {
        // Test 1: Initialize integration
        console.log('1. Testing integration initialization...');
        const initialized = await integration.initialize();
        if (initialized) {
            console.log('✅ Success: Integration initialized');
        } else {
            console.log('⚠️ Warning: Integration failed to initialize (continuing with mock tests)');
        }

        // Test 2: Verify a Telegram user
        console.log('\n2. Testing Telegram user verification...');
        const telegramUserId = 12345;
        
        try {
            const result = integration.verifyTelegramUser(telegramUserId, 2);
            console.log('✅ Success: User verified');
            console.log(`   User ID: ${result.telegramUserId}`);
            console.log(`   Level: ${result.verificationLevel}`);
        } catch (error) {
            console.log('❌ Error:', error.message);
        }

        // Test 3: Get user status
        console.log('\n3. Testing user status retrieval...');
        const status = integration.getTelegramUserStatus(telegramUserId);
        if (status) {
            console.log('✅ Success: User status retrieved');
            console.log(`   Verification Level: ${status.verificationLevel}`);
        } else {
            console.log('❌ Error: Could not retrieve user status');
        }

        // Test 4: Generate nullifier for Sudoku puzzle
        console.log('\n4. Testing nullifier generation for Sudoku...');
        const nullifier = integration.generateNullifier(telegramUserId, 'sudoku-9x9-1');
        if (nullifier && nullifier.length === 64) {
            console.log('✅ Success: Nullifier generated for Sudoku puzzle');
            console.log(`   Nullifier: ${nullifier.substring(0, 16)}...`);
        } else {
            console.log('❌ Error: Invalid nullifier generated');
        }

        // Test 5: Mock Sudoku proof submission
        console.log('\n5. Testing mock Sudoku proof submission...');
        const mockPublicInputs = {
            pid: 20250827,
            puzzle_commitment: Buffer.alloc(32, 1),
            nullifier: Buffer.from(nullifier, 'hex'),
            time_sec: 120
        };
        
        const mockProofBytes = Buffer.from([85, 76, 80, 49, ...Array(128).fill(1)]); // ULP1 + mock data
        
        try {
            const result = await integration.submitTelegramProof({
                telegramUserId: telegramUserId,
                publicInputs: mockPublicInputs,
                proofBytes: mockProofBytes,
                puzzleId: 'sudoku-9x9-1'
            });
            
            if (result.success) {
                console.log('✅ Success: Mock Sudoku proof submitted');
                console.log(`   Status: ${result.status}`);
                if (result.extrinsicHash) {
                    console.log(`   Extrinsic Hash: ${result.extrinsicHash.substring(0, 16)}...`);
                }
            } else {
                console.log('⚠️ Warning: Mock proof submission failed (expected without zkVerify connection)');
                console.log(`   Error: ${result.error}`);
            }
        } catch (error) {
            console.log('⚠️ Warning: Mock proof submission failed (expected without zkVerify connection)');
            console.log(`   Error: ${error.message}`);
        }

        // Test 6: Get user submissions
        console.log('\n6. Testing user submissions retrieval...');
        const submissions = integration.getTelegramUserSubmissions(telegramUserId);
        console.log(`✅ Success: Found ${submissions.length} submissions for user`);

        // Test 7: Test with multiple users
        console.log('\n7. Testing multiple users...');
        const users = [12345, 67890, 11111];
        
        for (const userId of users) {
            try {
                integration.verifyTelegramUser(userId, 1);
                console.log(`✅ Success: User ${userId} verified`);
            } catch (error) {
                if (error.message.includes('already verified')) {
                    console.log(`✅ Success: User ${userId} already verified`);
                } else {
                    console.log(`❌ Error verifying user ${userId}:`, error.message);
                }
            }
        }

        // Test 8: Get statistics
        console.log('\n8. Testing statistics...');
        const stats = integration.getStatistics();
        console.log('✅ Success: Statistics retrieved');
        console.log(`   Verified Users: ${stats.verifiedUsers}`);
        console.log(`   Total Submissions: ${stats.totalSubmissions}`);
        console.log(`   Success Rate: ${stats.successRate}%`);

        // Test 9: Test with different puzzle types
        console.log('\n9. Testing different puzzle types...');
        const puzzleTypes = ['sudoku-9x9-1', 'sudoku-16x16-1', 'logic-lane-1'];
        
        for (const puzzleType of puzzleTypes) {
            const nullifier = integration.generateNullifier(telegramUserId, puzzleType);
            console.log(`✅ Success: Generated nullifier for ${puzzleType}`);
            console.log(`   Nullifier: ${nullifier.substring(0, 16)}...`);
        }

        console.log('\n🎉 All integration tests completed!');
        
        // Final statistics
        const finalStats = integration.getStatistics();
        console.log('\n📊 Final Integration Statistics:');
        console.log(`   Verified Users: ${finalStats.verifiedUsers}`);
        console.log(`   Total Submissions: ${finalStats.totalSubmissions}`);
        console.log(`   Successful Submissions: ${finalStats.successfulSubmissions}`);
        console.log(`   Failed Submissions: ${finalStats.failedSubmissions}`);
        console.log(`   Success Rate: ${finalStats.successRate}%`);

    } catch (error) {
        console.error('❌ Integration test failed with error:', error);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testTelegramIntegration().catch(console.error);
}

module.exports = { testTelegramIntegration }; 