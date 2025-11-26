#![cfg(feature = "frame")]

use super::*;
use crate::pallet::{Pallet as ZkSudoku, Error as PalletError};
use frame_support::{assert_ok, assert_noop, BoundedVec};

#[test]
fn submit_valid_board_emits_verified() {
	use crate::mock::*;
	let mut ext = new_ext();
	ext.execute_with(|| {
		let board: [u8; sudoku_verifier_lib::BOARD_SIZE] = [
			5,3,4,6,7,8,9,1,2,
			6,7,2,1,9,5,3,4,8,
			1,9,8,3,4,2,5,6,7,
			8,5,9,7,6,1,4,2,3,
			4,2,6,8,5,3,7,9,1,
			7,1,3,9,2,4,8,5,6,
			9,6,1,5,3,7,2,8,4,
			2,8,7,4,1,9,6,3,5,
			3,4,5,2,8,6,1,7,9,
		];
		let bvec: BoundedVec<u8, frame_support::traits::ConstU32<81>> = BoundedVec::try_from(board.to_vec()).unw
rap();
		assert_ok!(ZkSudoku::<Runtime>::submit_board(RuntimeOrigin::signed(1), 42, bvec));
	});
}

#[test]
fn submit_invalid_board_rejected() {
	use crate::mock::*;
	let mut ext = new_ext();
	ext.execute_with(|| {
		let mut board: [u8; sudoku_verifier_lib::BOARD_SIZE] = [
			5,3,4,6,7,8,9,1,2,
			6,7,2,1,9,5,3,4,8,
			1,9,8,3,4,2,5,6,7,
			8,5,9,7,6,1,4,2,3,
			4,2,6,8,5,3,7,9,1,
			7,1,3,9,2,4,8,5,6,
			9,6,1,5,3,7,2,8,4,
			2,8,7,4,1,9,6,3,5,
			3,4,5,2,8,6,1,7,9,
		];
		board[1] = 5; // make row invalid
		let bvec: BoundedVec<u8, frame_support::traits::ConstU32<81>> = BoundedVec::try_from(board.to_vec()).unw
rap();
		assert_noop!(ZkSudoku::<Runtime>::submit_board(RuntimeOrigin::signed(1), 42, bvec), PalletError::<Runti
me>::InvalidBoard);
	});
}


#[test]
fn submit_proof_happy_path() {
	use crate::mock::*;
	use codec::Encode;
	let mut ext = new_ext();
	ext.execute_with(|| {
		let pi = crate::types::PublicInputs { pid: 42, puzzle_commitment: [1u8;32], nullifier: [2u8;32], time_sec: 7 };
		let pi_bytes = pi.encode();
		let public_inputs: BoundedVec<u8, frame_support::traits::ConstU32<256>> = BoundedVec::try_from(pi_bytes).unwrap();
		let proof: BoundedVec<u8, frame_support::traits::ConstU32<8192>> = BoundedVec::try_from(vec![9u8;64]).unwrap();
		assert_ok!(crate::pallet::Pallet::<Runtime>::submit_proof(RuntimeOrigin::signed(1), public_inputs, proof));
	});
}
