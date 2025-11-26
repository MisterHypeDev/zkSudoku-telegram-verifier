#![cfg_attr(not(feature = "std"), no_std)]

pub const BOARD_SIZE: usize = 81;
pub const DIM: usize = 9;

#[inline]
fn idx(row: usize, col: usize) -> usize {
    row * DIM + col
}

#[inline]
fn is_valid_digit(value: u8) -> bool {
    value >= 1 && value <= 9
}

#[inline]
fn reset_seen(seen: &mut [bool; 10]) {
    for v in seen.iter_mut() { *v = false; }
}

#[inline]
fn check_all_seen_once(seen: &[bool; 10]) -> bool {
    for d in 1..=9 {
        if !seen[d] { return false; }
    }
    true
}

/// Verify that the provided 9x9 board is a valid Sudoku solution.
/// Returns `true` if valid, `false` otherwise.
pub fn verify_sudoku(board: &[u8; BOARD_SIZE]) -> bool {
    let mut seen: [bool; 10] = [false; 10];

    // Check rows
    for r in 0..DIM {
        reset_seen(&mut seen);
        for c in 0..DIM {
            let v = board[idx(r, c)];
            if !is_valid_digit(v) { return false; }
            if seen[v as usize] { return false; }
            seen[v as usize] = true;
        }
        if !check_all_seen_once(&seen) { return false; }
    }

    // Check columns
    for c in 0..DIM {
        reset_seen(&mut seen);
        for r in 0..DIM {
            let v = board[idx(r, c)];
            if !is_valid_digit(v) { return false; }
            if seen[v as usize] { return false; }
            seen[v as usize] = true;
        }
        if !check_all_seen_once(&seen) { return false; }
    }

    // Check 3x3 subgrids
    for br in (0..DIM).step_by(3) {
        for bc in (0..DIM).step_by(3) {
            reset_seen(&mut seen);
            for r in br..br + 3 {
                for c in bc..bc + 3 {
                    let v = board[idx(r, c)];
                    if !is_valid_digit(v) { return false; }
                    if seen[v as usize] { return false; }
                    seen[v as usize] = true;
                }
            }
            if !check_all_seen_once(&seen) { return false; }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_solution_passes() {
        let board: [u8; BOARD_SIZE] = [
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
        assert!(verify_sudoku(&board));
    }

    #[test]
    fn invalid_row_fails() {
        let mut board: [u8; BOARD_SIZE] = [
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
        board[0] = 5;
        board[1] = 5;
        assert!(!verify_sudoku(&board));
    }

    #[test]
    fn invalid_subgrid_fails() {
        let mut board: [u8; BOARD_SIZE] = [
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
        // Break a 3x3 box: duplicate a value in top-left box
        board[0] = 1; // now box has two 1s
        assert!(!verify_sudoku(&board));
    }

    #[test]
    fn invalid_digit_fails() {
        let mut board: [u8; BOARD_SIZE] = [
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
        board[10] = 0;
        assert!(!verify_sudoku(&board));
    }
}
