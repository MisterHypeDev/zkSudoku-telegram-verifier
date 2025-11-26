
#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
use scale_info::TypeInfo;

#[derive(Clone, Eq, PartialEq, Encode, Decode, TypeInfo)]
pub struct PublicInputs {
    pub pid: u64,
    pub puzzle_commitment: [u8; 32],
    pub nullifier: [u8; 32],
    pub time_sec: u32,
}

pub trait SudokuProofVerifier {
    fn verify(public_inputs: &PublicInputs, proof: &[u8]) -> bool;
}
