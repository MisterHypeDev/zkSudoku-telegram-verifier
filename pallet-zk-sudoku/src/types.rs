#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "frame")]
use scale_info::TypeInfo;
#[cfg(feature = "frame")]
use codec::{Decode, Encode, MaxEncodedLen};

#[cfg_attr(feature = "frame", derive(Encode, Decode, TypeInfo, MaxEncodedLen))]
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct PublicInputs {
	pub pid: u64,
	pub puzzle_commitment: [u8; 32],
	pub nullifier: [u8; 32],
	pub time_sec: u32,
}

impl PublicInputs {
	pub const fn new(pid: u64, puzzle_commitment: [u8;32], nullifier: [u8;32], time_sec: u32) -> Self {
		Self { pid, puzzle_commitment, nullifier, time_sec }
	}
}
