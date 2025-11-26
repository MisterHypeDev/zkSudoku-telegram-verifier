#![cfg(feature = "runtime-benchmarks")]

use super::*;
use frame_benchmarking::{benchmarks, whitelisted_caller};
use frame_system::RawOrigin;
use sp_std::prelude::*;
use crate::Pallet as ZkSudoku;

const PUZZLE_ID: u64 = 42;

/// Prepare a valid Sudoku solution
fn valid_sudoku_board() -> [u8; BOARD_SIZE] {
    [
        5, 3, 4, 6, 7, 8, 9, 1, 2,
        6, 7, 2, 1, 9, 5, 3, 4, 8,
        1, 9, 8, 3, 4, 2, 5, 6, 7,
        8, 5, 9, 7, 6, 1, 4, 2, 3,
        4, 2, 6, 8, 5, 3, 7, 9, 1,
        7, 1, 3, 9, 2, 4, 8, 5, 6,
        9, 6, 1, 5, 3, 7, 2, 8, 4,
        2, 8, 7, 4, 1, 9, 6, 3, 5,
        3, 4, 5, 2, 8, 6, 1, 7, 9
    ]
}

/// Prepare ULP proof with specified size
fn create_proof_bytes(size: u32) -> Vec<u8> {
    let mut proof_bytes = Vec::with_capacity(size as usize);
    
    // ULP1 prefix
    proof_bytes.extend_from_slice(&[85, 76, 80, 49]); // "ULP1"
    
    // Fill the rest with mock proof data to reach desired size
    while proof_bytes.len() < size as usize {
        proof_bytes.push(1);
    }
    
    proof_bytes
}

/// Prepare public inputs for the ULP proof
fn create_public_inputs() -> crate::types::PublicInputs {
    crate::types::PublicInputs {
        pid: PUZZLE_ID,
        puzzle_commitment: [1u8; 32],
        nullifier: [2u8; 32],
        time_sec: 1234,
    }
}

benchmarks! {
    submit_board {
        let caller: T::AccountId = whitelisted_caller();
        let board = valid_sudoku_board();
        let bounded_board = BoundedVec::<u8, ConstU32<81>>::try_from(board.to_vec())
            .expect("Board should fit in the bound");
    }: _(RawOrigin::Signed(caller.clone()), PUZZLE_ID, bounded_board)
    verify {
        // Check that successful verification event was emitted
        System::<T>::assert_last_event(Event::Verified { who: caller, puzzle_id: PUZZLE_ID }.into());
    }
    
    submit_proof {
        let caller: T::AccountId = whitelisted_caller();
        
        // Scale proof size based on parameter c
        let c in 1 .. 10;
        let proof_size = c * 1024; // 1KB to 10KB
        
        // Prepare public inputs
        let pi = create_public_inputs();
        let encoded_pi = pi.encode();
        let bounded_pi = BoundedVec::<u8, ConstU32<256>>::try_from(encoded_pi)
            .expect("Public inputs should fit in the bound");
        
        // Prepare proof with the specified size
        let proof = create_proof_bytes(proof_size);
        let bounded_proof = BoundedVec::<u8, ConstU32<8192>>::try_from(proof)
            .expect("Proof should fit in the bound");
    }: _(RawOrigin::Signed(caller.clone()), bounded_pi, bounded_proof)
    verify {
        // Check that successful verification event was emitted
        System::<T>::assert_last_event(Event::Verified { who: caller, puzzle_id: PUZZLE_ID }.into());
    }
    
    impl_benchmark_test_suite!(ZkSudoku, crate::mock::new_test_ext(), crate::mock::Test);
}