
// Noir Sudoku circuit without external stdlib

fn is_digit(x: Field) -> bool {
    let mut p = 1;
    for k in 1..10 { p *= (x - k as Field); }
    p == 0
}

fn sum9(a: [Field; 9]) -> Field { let mut s = 0; for i in 0..9 { s += a[i]; } s }
fn prod9(a: [Field; 9]) -> Field { let mut p = 1; for i in 0..9 { p *= a[i]; } p }

fn row(board: [Field; 81], r: u32) -> [Field; 9] {
    let mut out: [Field; 9] = [0; 9];
    for c in 0..9 { out[c] = board[r*9 + c]; }
    out
}

fn col(board: [Field; 81], c: u32) -> [Field; 9] {
    let mut out: [Field; 9] = [0; 9];
    for r in 0..9 { out[r] = board[r*9 + c]; }
    out
}

fn box3(board: [Field; 81], br: u32, bc: u32) -> [Field; 9] {
    let mut out: [Field; 9] = [0; 9];
    let mut k: u32 = 0;
    for r in 0..3 { for c in 0..3 { let rr = br*3 + r; let cc = bc*3 + c; out[k] = board[rr*9 + cc]; k += 1; } }
    out
}

fn main(
    pid: Field,
    puzzle_commitment: Field,
    nullifier: Field,
    time_sec: Field,
    board: [Field; 81],
    givens_mask: [Field; 81],
    givens_values: [Field; 81],
) {
    for r in 0..9 {
        let rr = row(board, r);
        let mut ok = true; for i in 0..9 { ok = ok & is_digit(rr[i]); }
        assert(ok); assert(sum9(rr) == 45); assert(prod9(rr) == 362880);
    }
    for c in 0..9 {
        let cc = col(board, c);
        let mut okc = true; for i in 0..9 { okc = okc & is_digit(cc[i]); }
        assert(okc); assert(sum9(cc) == 45); assert(prod9(cc) == 362880);
    }
    for br in 0..3 { for bc in 0..3 {
        let bb = box3(board, br, bc);
        let mut okb = true; for i in 0..9 { okb = okb & is_digit(bb[i]); }
        assert(okb); assert(sum9(bb) == 45); assert(prod9(bb) == 362880);
    } }

    for i in 0..81 { if givens_mask[i] == 1 { assert(board[i] == givens_values[i]); } }

    // keep public inputs in-use; binding commitment/hash will be added
    assert(pid == pid); assert(puzzle_commitment == puzzle_commitment); assert(nullifier == nullifier); assert(time_sec == time_sec);
}
