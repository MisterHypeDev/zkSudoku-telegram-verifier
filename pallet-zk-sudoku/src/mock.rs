#![cfg(feature = "frame")]

use crate as pallet_zk_sudoku;
use frame_support::{construct_runtime, parameter_types, traits::Everything};
use frame_system as system;

pub type AccountId = u64;
pub type BlockNumber = u64;

parameter_types! {
	pub const BlockHashCount: u64 = 250;
}

#[derive(Clone, Eq, PartialEq)]
pub struct Test;
impl system::Config for Test {
	type BaseCallFilter = Everything;
	type BlockWeights = ();
	type BlockLength = ();
	type DbWeight = ();
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type Block = frame_system::mocking::MockBlock<Test>;
	type Hash = sp_core::H256;
	type Hashing = sp_runtime::traits::BlakeTwo256;
	type AccountId = AccountId;
	type Lookup = sp_runtime::traits::IdentityLookup<AccountId>;
	type Header = sp_runtime::generic::Header<BlockNumber, sp_runtime::traits::BlakeTwo256>;
	type PalletInfo = PalletInfo;
	type AccountData = ();
	type OnNewAccount = (); 
	type OnKilledAccount = (); 
	type SystemWeightInfo = (); 
	type SS58Prefix = (); 
	type OnSetCode = (); 
	type MaxConsumers = frame_support::traits::ConstU32<16>;
	type Version = ();
}

impl pallet_zk_sudoku::pallet::Config for Test {
	 type RuntimeEvent = RuntimeEvent;
	 type WeightInfo = crate::weights::WeightInfo;
}

construct_runtime!(
	pub enum Runtime where
		Block = frame_system::mocking::MockBlock<Test>,
		NodeBlock = frame_system::mocking::MockBlock<Test>,
		UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>,
	{
		System: system::{Pallet, Call, Config<T>, Storage, Event<T>},
		ZkSudoku: pallet_zk_sudoku::{Pallet, Call, Storage, Event<T>},
	}
);

pub fn new_ext() -> sp_io::TestExternalities {
	let mut t = frame_system::GenesisConfig::default().build_storage::<Runtime>().unwrap();
	let ext = sp_io::TestExternalities::new(t);
	ext
}
