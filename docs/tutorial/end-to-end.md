# End-to-End ZK Sudoku Verification Tutorial

This tutorial guides you through the complete process of generating and verifying zero-knowledge proofs for Sudoku puzzles using the zkVerify blockchain.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable version)
- [Noir](https://noir-lang.org/getting_started/installation/) for generating ZK proofs
- Access to a zkVerify node (either local or the Volta testnet)

## Step 1: Set Up the Environment

First, clone the repository and build the project:

```bash
# Clone the repository
git clone https://github.com/your-username/zk-sudoku-verifier.git
cd zk-sudoku-verifier

# Build the project
cargo build --release
```

## Step 2: Generate a Sudoku Puzzle

For this tutorial, we'll use a pre-defined Sudoku puzzle with a known solution. In a real application, you would generate a random puzzle.

```
# Puzzle (0 represents empty cells)
5 3 0 | 0 7 0 | 0 0 0
6 0 0 | 1 9 5 | 0 0 0
0 9 8 | 0 0 0 | 0 6 0
---------------------
8 0 0 | 0 6 0 | 0 0 3
4 0 0 | 8 0 3 | 0 0 1
7 0 0 | 0 2 0 | 0 0 6
---------------------
0 6 0 | 0 0 0 | 2 8 0
0 0 0 | 4 1 9 | 0 0 5
0 0 0 | 0 8 0 | 0 7 9
```

## Step 3: Solve the Puzzle

Solve the Sudoku puzzle. For this tutorial, we'll use the solution:

```
5 3 4 | 6 7 8 | 9 1 2
6 7 2 | 1 9 5 | 3 4 8
1 9 8 | 3 4 2 | 5 6 7
---------------------
8 5 9 | 7 6 1 | 4 2 3
4 2 6 | 8 5 3 | 7 9 1
7 1 3 | 9 2 4 | 8 5 6
---------------------
9 6 1 | 5 3 7 | 2 8 4
2 8 7 | 4 1 9 | 6 3 5
3 4 5 | 2 8 6 | 1 7 9
```

## Step 4: Generate a Zero-Knowledge Proof

Using Noir, we'll generate a proof that we know the solution without revealing it:

1. Navigate to the Noir circuit directory:
   ```bash
   cd noir/sudoku
   ```

2. Create a witness file with your inputs:
   ```bash
   cat > witness.json << EOL
   {
     "puzzle_id": 42,
     "puzzle_commitment": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
     "solution": [
       5,3,4,6,7,8,9,1,2,
       6,7,2,1,9,5,3,4,8,
       1,9,8,3,4,2,5,6,7,
       8,5,9,7,6,1,4,2,3,
       4,2,6,8,5,3,7,9,1,
       7,1,3,9,2,4,8,5,6,
       9,6,1,5,3,7,2,8,4,
       2,8,7,4,1,9,6,3,5,
       3,4,5,2,8,6,1,7,9
     ],
     "given_cells": [
       true,true,false,false,true,false,false,false,false,
       true,false,false,true,true,true,false,false,false,
       false,true,true,false,false,false,false,true,false,
       true,false,false,false,true,false,false,false,true,
       true,false,false,true,false,true,false,false,true,
       true,false,false,false,true,false,false,false,true,
       false,true,false,false,false,false,true,true,false,
       false,false,false,true,true,true,false,false,true,
       false,false,false,false,true,false,false,true,true
     ]
   }
   EOL
   ```

3. Generate the proof:
   ```bash
   nargo prove --witness witness.json
   ```

4. This will create a `proof.json` file containing your zero-knowledge proof.

## Step 5: Convert the Proof for zkVerify

The Noir proof needs to be converted to a format compatible with zkVerify:

```bash
cd ../../
cargo run --bin sudoku-cli -- convert-proof --input noir/sudoku/proof.json --output proof_bytes.bin
```

This will create a file called `proof_bytes.bin` containing the UltraPlonk-compatible proof for zkVerify.

## Step 6: Submit the Proof to zkVerify

Now we'll submit the proof to the zkVerify blockchain:

1. Connect to the zkVerify Volta testnet:
   ```bash
   export ZKV_WS=wss://volta-rpc.zkverify.io
   ```

2. Submit the proof using our CLI:
   ```bash
   cargo run --bin sudoku-cli -- submit-proof --node $ZKV_WS --proof proof_bytes.bin
   ```

3. Alternatively, you can use the Polkadot.js App:
   - Go to https://polkadot.js.org/apps
   - Connect to the zkVerify Volta testnet
   - Navigate to Developer > Extrinsics
   - Select the zkSudoku pallet and submitProof extrinsic
   - Upload your public_inputs.scale and proof_bytes.bin files
   - Submit the transaction

## Step 7: Verify the Result

To check if your proof was accepted:

1. Using the CLI:
   ```bash
   cargo run --bin sudoku-cli -- check-verification --node $ZKV_WS --puzzle-id 42
   ```

2. Or check events in the Polkadot.js Explorer:
   - Navigate to Network > Explorer
   - Look for a "Verified" event from the zkSudoku pallet with your puzzle ID

## Step 8: Using the Telegram Bot (Optional)

For a more user-friendly experience, try our Telegram bot:

1. Search for @zkSudokuBot on Telegram
2. Start a conversation with the bot
3. Use the `/start` command to begin a new game
4. The bot will provide a Sudoku puzzle to solve
5. Submit your solution through the bot interface
6. The bot will generate a ZK proof and verify it on zkVerify automatically

## Troubleshooting

- **Proof Generation Fails**: Ensure your Noir version is compatible (v0.10.0+)
- **Verification Fails**: Check that your solution actually solves the puzzle correctly
- **Connection Issues**: Verify that the zkVerify node is accessible
- **Invalid Format Error**: Ensure the proof was converted correctly with the CLI tool

## Next Steps

Now that you've successfully verified a Sudoku solution on zkVerify, you can:

1. Explore the Noir circuit to understand how the ZK proof works
2. Modify the circuit to add additional constraints or features
3. Build your own ZK applications on zkVerify
4. Contribute to improving the zkSudoku verifier pallet

## Resources

- [Noir Documentation](https://noir-lang.org/)
- [zkVerify Documentation](https://docs.zkverify.io/)
- [Substrate Documentation](https://docs.substrate.io/)