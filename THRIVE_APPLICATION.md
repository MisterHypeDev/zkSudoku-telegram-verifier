# zkSudoku – Zero‑Knowledge Sudoku Verification Engine for Telegram (Thrive Submission)

## Project Overview

- **Project Name**: zkSudoku – Zero‑Knowledge Sudoku Verification Engine for Telegram  
- **Category**: Gaming (Web2 onboarding to ZK)  
- **Status**: Under Development (Testnet live)  
- **Telegram**: @zksudokobot  
- **Tech**: Noir (UltraPlonk), Node.js (Express), Telegram Mini App, zkVerify (Volta)  
- **GitHub**: https://github.com/MisterHypeDev/zkSudoku-telegram-verifier  

## Description

zkSudoku is a Web2‑friendly Telegram Mini App where users solve Sudoku and generate a zero‑knowledge proof that their solution is correct without revealing it. The proof is verified off‑chain for privacy and can optionally be submitted to zkVerify for public auditability and aggregation receipts. Noir circuits (UltraPlonk) power the proving flow, and zkVerify provides a scalable, low‑cost verification backend to drive high proof volume.

Strategic vision: zkSudoku is the first product in a broader **Telegram ZK Verifier** stack, enabling age checks, voting, quizzes, and skill attestations inside Telegram using zkVerify.

## Core Value

- **Privacy**: Solution never leaves the device (client‑side proving)
- **Fairness**: Proof‑verified gameplay; no cheating
- **Scale**: Daily puzzles and events drive recurring proof generation
- **Reuse**: Lays a reusable Telegram ZK verification layer for other bots

## Technical Plan

### Circuit (Noir / UltraPlonk)
- Public inputs (nPublic = 4): `pid`, `puzzle_commitment`, `nullifier`, `time_sec`
- Private inputs: `board[81]`, `givens_mask[81]`, `givens_values[81]`
- Constraints: rows/columns/3×3 boxes contain digits 1..9, all unique; givens enforced
- Binding (hardening):
  - In‑circuit Poseidon commitment to bind `puzzle_commitment` to `givens_values`
  - Pseudonymous `nullifier = H(user_secret, pid, salt)`; prevents replay; user_secret never transmitted
- Artifacts: pin circuit version and VK hash; publish VK; CI integrity checks

### Proof Pipeline (Client → Server → zkVerify)
- **Client (Mini App)**:
  - Load Noir artifact and UltraPlonk backend via `@noir-lang/noir_js`
  - Generate proof locally; transmit `{ proof_base64, vk_id | vk_base64, public_inputs }`
- **Server (Express)**:
  - Verify proof off‑chain via Noir/Barretenberg; return signed receipt over `(public_inputs || proof_digest)`
  - Optional: Submit to zkVerify via `zkverifyjs` (protocol: UltraPlonk, domainId: 0, nPublic: 4); persist txHash and aggregation receipts
- **Data flow**:
  - Public input ordering: `[pid, puzzle_commitment, nullifier, time_sec]`
  - Hex encoding for field elements; strict bigint conversions; no truncation
  - Replay resistance via salted nullifier; rate limits and receipt gating

### APIs / SDK
- `GET /api/puzzle` → { puzzle, puzzle_commitment }
- `POST /api/verify-ultraplonk` → off‑chain verification + receipt
- `POST /api/zkverify` → optional submit to zkVerify; returns { txHash, aggregationReceipt }
- `GET /api/leaderboard` → entries gated by verified receipts or on‑chain tx
- SDK v1 (Phase 2): client proving helper + server verify client for third‑party Telegram bots

### Observability / Performance
- Metrics: proving success rate, server verify latency (target P95 < 200ms), zkVerify submission success & latencies, DAU/WAU/MAU
- Dashboards: Grafana/Prometheus or Supabase analytics
- Throughput targets: off‑chain verify P95 < 200ms; zkVerify bursts ≥ 10 TPS during events

## Current State

- Noir circuit implemented; Mini App and backend functional on test flows
- Server‑side proving path (prototype) exists; shifting to client‑side proving + server‑side verification for privacy
- zkverifyjs Volta path: event subscriptions and receipt persistence planned

## Milestones (150 Days)

### Application (T0, 10%)
- Circuit spec with binding (Poseidon + nullifier), verification plan, UX designs, business plan

### M1 – Live Deployment (T+45, 10%)
- Private off‑chain verifier live (client‑side proving; server verification)
- Production Mini App, receipts, leaderboard
- zkVerify optional submission on Volta with event handling and receipt persistence
- Public docs: “Integrating zkVerify with Telegram Mini Apps”

### M2 – Initial Traction (T+90, 30%) – pick one
- ≥ 25,000 proofs sent to zkVerify OR ≥ 250 unique users using zkVerify path
- Public analytics dashboard; stability report

### M3 – Scale (T+150, 50%) – pick one
- ≥ 250,000 proofs sent to zkVerify OR ≥ 2,500 unique users on zkVerify path
- SDK v1 for third‑party bots; two partner bots live

## UX (Web2‑First)

- One‑tap entry via Telegram Mini App (no wallet)
- Solve → “Verify privately” → receipt → leaderboard update
- Toggle “Publish to zkVerify” for on‑chain auditability (optional)

## Privacy / Security

- Data minimization: board never sent; only proof + public inputs
- In‑circuit bindings for commitment and nullifier
- Anti‑abuse: rate limits, salted nullifiers, signed receipts
- Compliance: builder KYC, GDPR‑aligned data retention; privacy policy at M1

## Growth

- Telegram‑native: daily streaks, tournaments, influencer‑led challenges
- Education: “ZK in Telegram” series; campus puzzle leagues
- Partners: two third‑party bots adopt SDK by M3

## KPIs / Reporting

- Proof volume/day, DAU/WAU/MAU, conversion to zkVerify, error/success rates, latency P95
- Weekly reports to Thrive with dashboard and raw counters on request

## Budget – Request: $50,000 in VFY

- Engineering (Noir/circuit, client proving, server verify, zkVerify integration): $28,000
- Product/UX (Mini App, receipts, leaderboard): $8,000
- Infra/Ops (monitoring, zkVerify tx costs for tests/demos): $6,000
- Partner SDK + integrations (2 bots): $5,000
- Security review & contingency: $3,000

## Team

- **Daniel Zaburof (Founder, Product & Engineering)** – https://x.com/MrHype_eth  
  Full‑stack builder (Telegram Mini Apps, Web infra, ZK integration); built current prototype; prior Thrive collaborations
- **Contributors**: part‑time Noir dev (ad‑hoc); guidance from zkVerify (Calvin, Rolf) during prototype

## Risks / Mitigation

- Mobile proving performance → progress UI, caching, background proving; server verify path remains private
- Circuit/artifact drift → pinned VK, CI integrity checks
- zkVerify API evolution → compatibility matrix, Volta tests, quick patches
- Abuse/fake traffic → signed receipts, salted nullifiers, rate limits

## Why zkVerify

Low‑cost, high‑throughput verification ideal for Web2‑scale proof volume; clean event/receipt model; strong fit for Telegram onboarding flows.


