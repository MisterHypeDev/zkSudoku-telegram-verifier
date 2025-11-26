/**
 * Test file for Telegram zkVerify Integration
 */

const TelegramZkVerifyIntegration = require('./telegram-zkverify-integration');

async function testTelegramZkVerifyIntegration() {
    console.log('🧪 Testing Telegram zkVerify Integration...\n');

    // Create integration instance
    const integration = new TelegramZkVerifyIntegration({
        zkvWs: process.env.ZKV_WS || 'wss://volta-rpc.zkverify.io',
        seedPhrase: process.env.ZKV_SIGNER_MNEMONIC
    });

    try {
        // Test 1: Initialize connection
        console.log('1. Testing initialization...');
        const initialized = await integration.initialize();
        if (initialized) {
            console.log('✅ Success: Connected to zkVerify');
        } else {
            console.log('⚠️ Warning: Could not connect to zkVerify (continuing with mock tests)');
        }

        // Test 2: Validate Telegram user ID
        console.log('\n2. Testing Telegram user ID validation...');
        const validUserId = 12345;
        const invalidUserId = 0;
        
        if (integration.isValidTelegramUserId(validUserId)) {
            console.log('✅ Success: Valid user ID accepted');
        } else {
            console.log('❌ Error: Valid user ID rejected');
        }
        
        if (!integration.isValidTelegramUserId(invalidUserId)) {
            console.log('✅ Success: Invalid user ID rejected');
        } else {
            console.log('❌ Error: Invalid user ID accepted');
        }

        // Test 3: Manual user verification
        console.log('\n3. Testing manual user verification...');
        try {
            const result = integration.verifyTelegramUser(validUserId, 2);
            console.log('✅ Success: User verified manually');
            console.log(`   User ID: ${result.telegramUserId}`);
            console.log(`   Level: ${result.verificationLevel}`);
        } catch (error) {
            console.log('❌ Error:', error.message);
        }

        // Test 4: Get user status
        console.log('\n4. Testing user status retrieval...');
        const status = integration.getTelegramUserStatus(validUserId);
        if (status) {
            console.log('✅ Success: User status retrieved');
            console.log(`   Verification Level: ${status.verificationLevel}`);
            console.log(`   Verified At: ${status.verifiedAt}`);
        } else {
            console.log('❌ Error: Could not retrieve user status');
        }

        // Test 5: Generate nullifier
        console.log('\n5. Testing nullifier generation...');
        const nullifier = integration.generateNullifier(validUserId, 'test-puzzle-1');
        if (nullifier && nullifier.length === 64) {
            console.log('✅ Success: Nullifier generated');
            console.log(`   Nullifier: ${nullifier.substring(0, 16)}...`);
        } else {
            console.log('❌ Error: Invalid nullifier generated');
        }

        // Test 6: Test duplicate verification
        console.log('\n6. Testing duplicate verification prevention...');
        try {
            integration.verifyTelegramUser(validUserId, 3);
            console.log('❌ Error: Duplicate verification should have failed');
        } catch (error) {
            if (error.message.includes('already verified')) {
                console.log('✅ Success: Duplicate verification prevented');
            } else {
                console.log('❌ Error:', error.message);
            }
        }

        // Test 7: Get statistics
        console.log('\n7. Testing statistics...');
        const stats = integration.getStatistics();
        console.log('✅ Success: Statistics retrieved');
        console.log(`   Verified Users: ${stats.verifiedUsers}`);
        console.log(`   Total Submissions: ${stats.totalSubmissions}`);
        console.log(`   Success Rate: ${stats.successRate}%`);

        // Test 8: Get all verified users
        console.log('\n8. Testing verified users list...');
        const verifiedUsers = integration.getAllVerifiedUsers();
        console.log(`✅ Success: Found ${verifiedUsers.length} verified users`);

        // Test 9: Mock proof submission (if not connected to zkVerify)
        if (!initialized) {
            console.log('\n9. Testing mock proof submission...');
            const mockPublicInputs = {
                pid: 1,
                puzzle_commitment: Buffer.alloc(32, 1),
                nullifier: Buffer.alloc(32, 2),
                time_sec: 100
            };
            
            const mockProofBytes = Buffer.from([85, 76, 80, 49, ...Array(128).fill(1)]); // ULP1 + mock data
            
            try {
                const result = await integration.submitTelegramProof({
                    telegramUserId: validUserId,
                    publicInputs: mockPublicInputs,
                    proofBytes: mockProofBytes,
                    puzzleId: 'test-puzzle-1'
                });
                
                if (result.success) {
                    console.log('✅ Success: Mock proof submitted successfully');
                } else {
                    console.log('⚠️ Warning: Mock proof submission failed (expected without zkVerify connection)');
                    console.log(`   Error: ${result.error}`);
                }
            } catch (error) {
                console.log('⚠️ Warning: Mock proof submission failed (expected without zkVerify connection)');
                console.log(`   Error: ${error.message}`);
            }
        }

        // Test 10: Get user submissions
        console.log('\n10. Testing user submissions retrieval...');
        const submissions = integration.getTelegramUserSubmissions(validUserId);
        console.log(`✅ Success: Found ${submissions.length} submissions for user`);

        console.log('\n🎉 All tests completed!');
        
        // Final statistics
        const finalStats = integration.getStatistics();
        console.log('\n📊 Final Statistics:');
        console.log(`   Verified Users: ${finalStats.verifiedUsers}`);
        console.log(`   Total Submissions: ${finalStats.totalSubmissions}`);
        console.log(`   Successful Submissions: ${finalStats.successfulSubmissions}`);
        console.log(`   Failed Submissions: ${finalStats.failedSubmissions}`);
        console.log(`   Success Rate: ${finalStats.successRate}%`);

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testTelegramZkVerifyIntegration().catch(console.error);
}

module.exports = { testTelegramZkVerifyIntegration }; 