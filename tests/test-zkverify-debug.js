const { generateNoirProofNode } = require('./index.js');

async function testZkVerifyDebug() {
  try {
    console.log('Testing zkVerify debug...');
    
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
    
    console.log('Generated result:');
    console.log('- mock:', result.mock);
    console.log('- proof_base64 length:', result.proof_base64?.length || 'undefined');
    console.log('- vk_base64 length:', result.vk_base64?.length || 'undefined');
    console.log('- proof_data exists:', !!result.proof_data);
    console.log('- vk_data exists:', !!result.vk_data);
    
    if (result.proof_base64 && result.vk_base64) {
      console.log('Proof and VK are available, testing zkverifyjs...');
      
      try {
        const { zkVerifySession, ZkVerifyEvents } = require('zkverifyjs');
        
        console.log('Creating zkVerify session...');
        const session = await zkVerifySession.start()
          .Volta()
          .withAccount("//Alice");
        
        console.log('Session created successfully');
        
        console.log('Attempting proof submission...');
        const { events, transactionResult } = await session
          .verify()
            .ultraplonk({
              numberOfPublicInputs: 0
          })
          .execute({
            proofData: {
              vk: result.vk_base64,
              proof: result.proof_base64,
            },
            domainId: 0
          });
        
        console.log('Proof submission initiated successfully');
        
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
        
        // Wait for result
        const txResult = await transactionResult;
        console.log("zkVerify: Transaction completed", txResult);
        
      } catch (zkvError) {
        console.error('zkVerify submission failed:', zkvError?.message || zkvError);
        console.error('Full error:', zkvError);
      }
    } else {
      console.log('Proof or VK not available');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testZkVerifyDebug(); 