const { zkVerifySession, ZkVerifyEvents } = require('zkverifyjs');

async function testFundedAccount() {
  try {
    console.log('Testing funded account submission...');
    
    // Use the mnemonic from config
    const seedPhrase = "whisper state way trick divide swallow absent hood direct rubber concert put";
    
    console.log('Creating session with mnemonic...');
    const session = await zkVerifySession.start()
      .Volta()
      .withAccount(seedPhrase);
    
    console.log('Session created successfully');
    
    // Get account info
    const accountInfo = await session.getAccountInfo();
    console.log('Account info:', accountInfo);
    
    const account = accountInfo[0];
    console.log('Account address:', account.address);
    console.log('Account balance:', account.freeBalance);
    console.log('Account nonce:', account.nonce);
    
    // Try to submit a simple transaction to test if the account works
    console.log('\nTesting account with a simple transaction...');
    
    // Create a mock proof for testing
    const mockProof = Buffer.from('mock proof data').toString('base64');
    const mockVk = Buffer.from('mock verification key').toString('base64');
    
    try {
      console.log('Attempting to submit mock proof...');
      
      const { events, transactionResult } = await session
        .verify()
          .ultraplonk({
            numberOfPublicInputs: 0
        })
        .execute({
          proofData: {
            vk: mockVk,
            proof: mockProof,
          },
          domainId: 0
        });
      
      console.log('Mock proof submission initiated');
      
      // Set up event listeners
      events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
        console.log("zkVerify: Included in block", eventData);
      });
      
      events.on(ZkVerifyEvents.NewAggregationReceipt, (eventData) => {
        console.log("zkVerify: New aggregation receipt", eventData);
      });
      
      events.on(ZkVerifyEvents.ErrorEvent, (eventData) => {
        console.error("zkVerify: Error event", eventData);
      });
      
      // Wait for result with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('zkVerify submission timeout after 30 seconds')), 30000);
      });
      
      console.log('Waiting for transaction result...');
      const txResult = await Promise.race([transactionResult, timeoutPromise]);
      console.log("zkVerify: Transaction completed", txResult);
      
    } catch (zkvError) {
      console.error('zkVerify submission failed:', zkvError?.message || zkvError);
      
      // Check if it's a balance issue or something else
      if (zkvError.message.includes('balance too low')) {
        console.log('This is a balance issue - the account needs more tokens');
      } else if (zkvError.message.includes('Invalid Transaction')) {
        console.log('This is a transaction validation issue - the proof format might be wrong');
      } else {
        console.log('This is a different type of error');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFundedAccount(); 