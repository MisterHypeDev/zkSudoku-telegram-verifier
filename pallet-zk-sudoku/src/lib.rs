#![cfg_attr(not(feature = "std"), no_std)]

mod types;
mod weights;

#[cfg(feature = "frame")]
pub use pallet::*;
pub use weights::WeightInfo;

#[cfg(feature = "frame")]
mod mock;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

#[cfg(feature = "frame")]
#[frame_support::pallet]
pub mod pallet {
	use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
	use frame_system::pallet_prelude::*;
	use sudoku_verifier_lib::{verify_sudoku, BOARD_SIZE};

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The pallet's runtime event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
		
		/// Weight information for the extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}
	
	/// Weight information for the pallet extrinsics.
	pub trait WeightInfo {
		/// Weight for the `submit_board` extrinsic.
		fn submit_board() -> Weight;
		
		/// Weight for the `submit_proof` extrinsic.
		/// Parameter c represents proof size in KB.
		fn submit_proof(c: u32) -> Weight;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A Sudoku board was submitted and verified.
		Verified { who: T::AccountId, puzzle_id: u64 },
		/// A Sudoku board was submitted but failed verification.
		Rejected { who: T::AccountId, puzzle_id: u64 },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Board length must be exactly 81 digits.
		InvalidLength,
		/// Board failed Sudoku constraints.
		InvalidBoard,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Submit a Sudoku board for verification. `board` must be 81 digits 1..=9.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::submit_board())]
		pub fn submit_board(
			origin: OriginFor<T>,
			puzzle_id: u64,
			board: BoundedVec<u8, ConstU32<81>>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(board.len() == BOARD_SIZE, Error::<T>::InvalidLength);

			let mut arr = [0u8; BOARD_SIZE];
			arr.copy_from_slice(&board);

			if verify_sudoku(&arr) {
				Self::deposit_event(Event::Verified { who, puzzle_id });
				Ok(())
			} else {
				Self::deposit_event(Event::Rejected { who, puzzle_id });
				Err(Error::<T>::InvalidBoard.into())
			}
		}

		/// Submit a ZK proof + public inputs for on-chain verification.
		/// Uses UltraPlonk-compatible proof verification.
		#[pallet::call_index(1)]
		#[pallet::weight({
			// Base weight + additional per KB of proof data
			let proof_size = proof_bytes.len() as u32;
			T::WeightInfo::submit_proof(proof_size / 1024 + 1)
		})]
		pub fn submit_proof(
			origin: OriginFor<T>,
			public_inputs: BoundedVec<u8, ConstU32<256>>, // SCALE-encoded types::PublicInputs
			proof_bytes: BoundedVec<u8, ConstU32<8192>>,   // proof bytes of chosen scheme
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Decode PublicInputs and verify via library (wired to our no_std lib)
			let pi: crate::types::PublicInputs = match parity_scale_codec::Decode::decode(&mut &public_inputs[..]) {
				Ok(pi) => pi,
				Err(_) => return Err(DispatchError::Other("DecodePublicInputs")),
			};
			let proof_slice: &[u8] = &proof_bytes;
			let pi_for_lib = zkv_sudoku_verify_lib::PublicInputs { 
				pid: pi.pid, 
				puzzle_commitment: pi.puzzle_commitment, 
				nullifier: pi.nullifier, 
				time_sec: pi.time_sec 
			};
			match zkv_sudoku_verify_lib::verify_proof(&pi_for_lib, proof_slice) {
				Ok(_) => { Self::deposit_event(Event::Verified { who, puzzle_id: pi.pid }); Ok(()) },
				Err(_) => { Self::deposit_event(Event::Rejected { who, puzzle_id: pi.pid }); Err(Error::<T>::InvalidBoard.into()) }
			}
		}
	}
}

// In standalone mode, expose a thin wrapper API over the core verifier.
#[cfg(not(feature = "frame"))]
pub mod standalone {
	use sudoku_verifier_lib::{verify_sudoku, BOARD_SIZE};

	pub fn verify(board: &[u8; BOARD_SIZE]) -> bool {
		verify_sudoku(board)
	}
}
