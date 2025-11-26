use anyhow::{anyhow, Result};
use clap::Parser;
use sudoku_verifier_lib::{verify_sudoku, BOARD_SIZE};

/// Parse a comma-separated list of 81 digits (1..=9)
fn parse_board(s: &str) -> Result<[u8; BOARD_SIZE]> {
    let parts: Vec<&str> = s.split(',').collect();
    if parts.len() != BOARD_SIZE { return Err(anyhow!("expected 81 comma-separated values")); }
    let mut out = [0u8; BOARD_SIZE];
    for (i, p) in parts.iter().enumerate() {
        let v: u8 = p.trim().parse()?;
        out[i] = v;
    }
    Ok(out)
}

#[derive(Parser, Debug)]
#[command(name = "sudoku-cli", about = "Verify Sudoku board validity")] 
struct Args {
    /// 81 comma-separated digits (1..=9) in row-major order
    #[arg(long)]
    board: String,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let board = parse_board(&args.board)?;
    let ok = verify_sudoku(&board);
    if ok {
        println!("valid");
        Ok(())
    } else {
        println!("invalid");
        Err(anyhow!("board is invalid"))
    }
}
