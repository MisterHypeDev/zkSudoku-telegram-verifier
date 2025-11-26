# zkSudoku – Telegram ZK Sudoku Verifier (Noir + UltraPlonk + zkVerify)

Privacy-preserving Sudoku verification for Telegram users. Players solve locally, generate a zero-knowledge proof that the solution is correct, and optionally submit to zkVerify for public auditability.

- Telegram Mini App: @zksudokobot
- Public GitHub (Thrive submission): https://github.com/MisterHypeDev/zkSudoku-telegram-verifier

## What this project provides

- Zero-Knowledge Sudoku circuit in Noir (UltraPlonk)
- Web2-first Telegram Mini App UX
- Private off-chain verification (server verifies proof; solution never leaves device)
- Optional zkVerify (Volta) submission path and aggregation receipt capture
- Leaderboard gated by verified receipts or on-chain tx

## Architecture

```
┌───────────────┐   Prove (client)    ┌───────────────┐   Verify (server)   ┌───────────────┐
│  Telegram UI  │ ───────────────────▶ │    Backend    │ ───────────────────▶ │    zkVerify   │
│  (Mini App)   │   Noir + UltraPlonk  │ (Express/Noir)│  optional submit     │   (Volta)     │
└───────────────┘                      └───────────────┘                      └───────────────┘
      │                                         │
      └────── Leaderboard & receipts ◀──────────┘
```

## Circuit (Noir)

- Public inputs (nPublic = 4): `pid`, `puzzle_commitment`, `nullifier`, `time_sec`
- Private inputs: `board[81]`, `givens_mask[81]`, `givens_values[81]`
- Constraints: rows/columns/3×3 boxes are permutations of 1..9; givens are enforced
- Binding (work-in-progress hardening): in-circuit Poseidon commitment to bind `puzzle_commitment` to givens; pseudonymous `nullifier`

See `noir/sudoku/src/main.nr`.

## Running locally

Prerequisites:
- Node 18+
- Noir toolchain / Noir.js (0.39+)

Steps:
1. Install deps: `npm install`
2. Configure env: `cp config/config.env.example config/config.env` and set `BOT`, optionally `ZKV_WS`, `ZKV_ENABLED`
3. Start server: `node index.js`
4. Open Mini App URL from console, or run `/start` in Telegram with your bot token

Key endpoints:
- `GET /api/puzzle` → { puzzle, puzzle_commitment }
- `POST /api/check` → local combinatorial check + HMAC token (dev)
- `POST /api/verify-ultraplonk` → server verifies client proofs (planned for M1)
- `POST /api/zkverify` → optional submit to zkVerify (Volta)
- `GET /api/leaderboard` → verified results

## zkVerify integration

- Protocol: UltraPlonk
- Domain: 0 (Volta)
- Public inputs (order): `[pid, puzzle_commitment, nullifier, time_sec]`
- Client proves; server can either verify off-chain or submit to zkVerify for public receipts

## Status

- Mini App, backend, and Noir circuit are functional on test flows
- Current work: strict client-side proving, server-side verification endpoint, in-circuit binding (Poseidon), robust nullifier

## Docs

- End-to-end tutorial: `docs/tutorial/end-to-end.md`
- Telegram zkVerify roadmap: `TELEGRAM_ZKVERIFY_ROADMAP.md`

## License

MIT/Apache-2.0 (dual-licensed)
