#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::weights::Weight;

/// Weight functions for pallet_zk_sudoku
pub struct WeightInfo;

const WEIGHT_REF_TIME_PER_MICROS: u64 = 1_000;
const WEIGHT_PROOF_TIME_PER_KB: u64 = 200_000; // 200 microseconds per KB of proof

impl crate::WeightInfo for WeightInfo {
    /// Weight for the `submit_board` extrinsic
    fn submit_board() -> Weight {
        // Base weight for board validation - approximately 100 microseconds
        Weight::from_parts(100 * WEIGHT_REF_TIME_PER_MICROS, 0)
    }
    
    /// Weight for the `submit_proof` extrinsic
    /// Parameter c represents proof size in KB
    fn submit_proof(c: u32) -> Weight {
        // Base weight + additional weight per KB of proof
        let base = 100 * WEIGHT_REF_TIME_PER_MICROS; // 100 microseconds base
        let proof_size_cost = WEIGHT_PROOF_TIME_PER_KB.saturating_mul(c as u64);
        
        Weight::from_parts(base.saturating_add(proof_size_cost), 0)
    }
}