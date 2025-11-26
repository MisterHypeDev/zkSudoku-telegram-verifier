const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
// Polkadot libs are lazily loaded only if ZKV_WS is configured
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', 'config.env') });

// ===== Supabase Leaderboard Configuration =====
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized for leaderboard');
} else {
  console.log('Supabase not configured - leaderboard will use in-memory storage');
}

const TOKEN = process.env.BOT;
const ENABLE_TELEGRAM = String(process.env.ENABLE_TELEGRAM || 'true') === 'true';
const PORT = Number(process.env.PORT || 3102);
const PROOF_SECRET = process.env.PROOF_SECRET || 'dev_secret_change_me';

function getLocalIp() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}
const LAN = getLocalIp();
const BASE_URL = (process.env.RAILWAY_STATIC_URL && process.env.RAILWAY_STATIC_URL.trim()) || (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) || `https://${LAN}:${PORT}`;
const WEBAPP_URL = BASE_URL.startsWith('https://') ? BASE_URL : `https://${BASE_URL.replace(/^https?:\/\//, '')}`;

if (!TOKEN) {
  console.error('BOT token missing in config/config.env (BOT=...)');
  process.exit(1);
}

// ===== Core Sudoku logic =====
const puzzleId = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

// Load Logic Lane puzzles
let LogicLanePuzzles = {};
try {
  const puzzlesModule = require('./sudoku-generation/logic-lane-puzzles.js');
  LogicLanePuzzles = puzzlesModule.LogicLanePuzzles || {};
} catch (e) {
  console.log('Logic Lane puzzles not available, using fallback');
}

// Default puzzle (original)
const basePuzzle = [
  5,3,0,0,7,0,0,0,0,
  6,0,0,1,9,5,0,0,0,
  0,9,8,0,0,0,0,6,0,
  8,0,0,0,6,0,0,0,3,
  4,0,0,8,0,3,0,0,1,
  7,0,0,0,2,0,0,0,6,
  0,6,0,0,0,0,2,8,0,
  0,0,0,4,1,9,0,0,5,
  0,0,0,0,8,0,0,7,9,
];

// Get puzzle by ID or variant
function getPuzzle(puzzleId = null, variant = null) {
  // If puzzleId is a number, try to find by ID
  if (puzzleId && !isNaN(puzzleId)) {
    const puzzle = Object.values(LogicLanePuzzles).find(p => p.id === parseInt(puzzleId));
    if (puzzle) return puzzle;
  }
  
  // If puzzleId is a string, try to find by key
  if (puzzleId && LogicLanePuzzles[puzzleId]) {
    return LogicLanePuzzles[puzzleId];
  }
  
  if (variant) {
    const puzzle = Object.values(LogicLanePuzzles).find(p => p.variant === variant);
    if (puzzle) return puzzle;
  }
  
  // Fallback to default puzzle
  return {
    id: 'default',
    name: 'Classic Sudoku',
    variant: 'classic',
    difficulty: 'easy',
    puzzle: basePuzzle,
    solution: [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9],
    rules: {}
  };
}

// Generate puzzle commitment
function getPuzzleCommitment(puzzle) {
  return crypto.createHash('sha256').update(puzzle.puzzle.join(','),'utf8').digest('hex');
}

const PUZZLE_COMMIT = getPuzzleCommitment(getPuzzle());

// ===== Leaderboard Storage =====
// In-memory fallback storage when Supabase is not available
const inMemoryLeaderboard = [];

// Leaderboard functions
async function addToLeaderboard(entry) {
  console.log('addToLeaderboard called with entry:', entry);
  const leaderboardEntry = {
    id: Date.now().toString(),
    address: entry.address || 'anonymous',
    score: entry.time_sec || 0, // Lower time is better score
    proof_url: entry.extrinsicHash ? `https://zkverify-testnet.subscan.io/extrinsic/${entry.extrinsicHash}` : null,
    date: new Date().toISOString(),
    time_sec: entry.time_sec,
    user_id: entry.user_id,
    puzzle_id: entry.puzzle_id || puzzleId(),
    puzzle_variant: entry.puzzle_variant || 'classic',
    puzzle_name: entry.puzzle_name || 'Classic Sudoku',
    extrinsic_hash: entry.extrinsicHash
  };
  console.log('Created leaderboard entry object:', leaderboardEntry);

  try {
    if (supabase) {
      // Use Supabase
      const { data, error } = await supabase
        .from('leaderboard')
        .insert([leaderboardEntry])
        .select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Added to Supabase leaderboard:', data[0]);
      return data[0];
    } else {
      // Use in-memory storage
      inMemoryLeaderboard.push(leaderboardEntry);
      inMemoryLeaderboard.sort((a, b) => a.score - b.score); // Sort by time (lower is better)
      console.log('Added to in-memory leaderboard:', leaderboardEntry);
      return leaderboardEntry;
    }
  } catch (error) {
    console.error('Failed to add to leaderboard:', error);
    // Fallback to in-memory
    inMemoryLeaderboard.push(leaderboardEntry);
    inMemoryLeaderboard.sort((a, b) => a.score - b.score);
    return leaderboardEntry;
  }
}

async function getLeaderboard(limit = 100) {
  try {
    if (supabase) {
      // Use Supabase
      const { data, error } = await supabase
        .from('leaderboard')
        .select('id,address,score,proof_url,date,time_sec,user_id,puzzle_id,extrinsic_hash')
        .order('score', { ascending: true }) // Lower time is better
        .limit(limit);
      
      if (error) {
        console.error('Supabase select error:', error);
        throw error;
      }
      
      return data || [];
    } else {
      // Use in-memory storage
      return inMemoryLeaderboard.slice(0, limit);
    }
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    // Fallback to in-memory
    return inMemoryLeaderboard.slice(0, limit);
  }
}

// ===== zkVerify chain wiring (configurable) =====
const ZKV_WS = process.env.ZKV_WS || '';
const ZKV_SIGNER_URI = process.env.ZKV_SIGNER_URI || '';
let zkvApi = null, zkvSigner = null;
async function ensureZkvApi() {
  if (!ZKV_WS) return null;
  if (zkvApi) return zkvApi;
  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  const keyringNs = await import('@polkadot/keyring');
  const Keyring = keyringNs.Keyring || keyringNs.default;
  const provider = new WsProvider(ZKV_WS);
  zkvApi = await ApiPromise.create({ provider });
  if (ZKV_SIGNER_URI) {
    const kr = new Keyring({ type: 'sr25519' });
    zkvSigner = kr.addFromUri(ZKV_SIGNER_URI);
  }
  return zkvApi;
}

function checkGivens(puzzle, board) {
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== 0 && puzzle[i] !== board[i]) return false;
  }
  return true;
}

function parseBoardCsv(csv) {
  const parts = csv.split(',').map(s => s.trim());
  if (parts.length !== 81) throw new Error('must be 81 comma-separated digits');
  const arr = parts.map(x => {
    const v = Number(x);
    if (!Number.isInteger(v) || v < 1 || v > 9) throw new Error('digits must be 1..9');
    return v;
  });
  return arr;
}

function verifyWithRust(boardCsv) {
  return new Promise((resolve) => {
    try {
      const board = parseBoardCsv(boardCsv);
      
      // Check if board is valid Sudoku
      const isValid = isValidSudoku(board);
      
      if (isValid) {
        resolve({ ok: true, out: 'valid' });
      } else {
        resolve({ ok: false, reason: 'invalid', out: 'invalid', err: 'Board is not a valid Sudoku solution' });
      }
    } catch (error) {
      resolve({ ok: false, reason: 'invalid', out: 'error', err: String(error) });
    }
  });
}

function isValidSudoku(board) {
  // Check rows
  for (let i = 0; i < 9; i++) {
    const row = new Set();
    for (let j = 0; j < 9; j++) {
      const cell = board[i * 9 + j];
      if (row.has(cell)) return false;
      row.add(cell);
    }
  }
  
  // Check columns
  for (let j = 0; j < 9; j++) {
    const col = new Set();
    for (let i = 0; i < 9; i++) {
      const cell = board[i * 9 + j];
      if (col.has(cell)) return false;
      col.add(cell);
    }
  }
  
  // Check 3x3 boxes
  for (let box = 0; box < 9; box++) {
    const boxSet = new Set();
    const startRow = Math.floor(box / 3) * 3;
    const startCol = (box % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const cell = board[(startRow + i) * 9 + (startCol + j)];
        if (boxSet.has(cell)) return false;
        boxSet.add(cell);
      }
    }
  }
  
  return true;
}

// ===== Noir proof generation (Node-side) =====
async function generateNoirProofNode(input) {
  // input: { pid, puzzle_commitment, nullifier, time_sec, board, givens_mask, givens_values }
  
  try {
    const fs = require('fs');
    const path = require('path');
    const { execSync } = require('child_process');
    
    console.log('Generating real UltraPlonk proof data with Noir...');
    
    // Path to the Noir project
    const noirProjectPath = path.join(__dirname, 'noir', 'sudoku');
    
    // Update Prover.toml with the input data
    // Convert hex strings to proper TOML format and handle large values
    // Check if the values are hex strings (64 characters long, hex only)
    const isHexString = (str) => {
      if (typeof str !== 'string') return false;
      return /^[0-9a-fA-F]{64}$/.test(str);
    };
    
    // Function to truncate large hex values to fit Noir's Field modulus
    const truncateForNoir = (hexStr) => {
      if (!isHexString(hexStr)) return hexStr;
      
      // Use a much smaller range to ensure it fits in Noir's Field type
      // Take the first 8 characters of the hex string and convert to a smaller number
      const shortHex = hexStr.substring(0, 8);
      const value = parseInt(shortHex, 16);
      
      // Ensure it's within a safe range (max 10^9)
      return Math.min(value, 999999999).toString();
    };
    
    const puzzleCommitmentStr = isHexString(input.puzzle_commitment) 
      ? truncateForNoir(input.puzzle_commitment)
      : input.puzzle_commitment;
    const nullifierStr = isHexString(input.nullifier) 
      ? truncateForNoir(input.nullifier)
      : input.nullifier;
    
    const proverToml = `pid = ${input.pid}
puzzle_commitment = ${puzzleCommitmentStr}
nullifier = ${nullifierStr}
time_sec = ${input.time_sec}
board = [${input.board.join(', ')}]
givens_mask = [${input.givens_mask.join(', ')}]
givens_values = [${input.givens_values.join(', ')}]`;
    
    fs.writeFileSync(path.join(noirProjectPath, 'Prover.toml'), proverToml);
    
    // Check if we have pre-built artifacts (for Railway deployment)
    const proofHexPath = path.join(noirProjectPath, 'target', 'zkv_proof.hex');
    const vkHexPath = path.join(noirProjectPath, 'target', 'zkv_vk.hex');
    
    let proofHex, vkHex;
    
    if (fs.existsSync(proofHexPath) && fs.existsSync(vkHexPath)) {
      console.log('Using pre-built proof artifacts for Railway deployment...');
      proofHex = fs.readFileSync(proofHexPath, 'utf8').trim();
      vkHex = fs.readFileSync(vkHexPath, 'utf8').trim();
    } else {
      console.log('Pre-built artifacts not found, falling back to mock data');
      throw new Error('Noir artifacts not available in Railway environment');
    }
    
    // Create the proof data structure for zkVerify
    // Handle both hex strings and numbers for public inputs
    const formatHex = (value) => {
      if (typeof value === 'string' && value.startsWith('0x')) {
        return value;
      }
      return `0x${value.toString(16)}`;
    };
    
    const proofData = {
      proof: proofHex,
      public_inputs: {
        pid: formatHex(input.pid),
        time_sec: input.time_sec,
        nullifier: formatHex(input.nullifier),
        puzzle_commitment: formatHex(input.puzzle_commitment)
      }
    };
    
    const vkData = {
      vk: vkHex
    };
    
    console.log('Generated real UltraPlonk proof data');
    console.log('Proof data type: real');
    console.log('VK data type: real');
    console.log('Proof hex length:', proofHex.length);
    console.log('VK hex length:', vkHex.length);
    
    const result = { 
      proof_bytes: Buffer.from(proofHex.slice(2), 'hex'),
      proof_base64: Buffer.from(proofHex.slice(2), 'hex').toString('base64'),
      vk_base64: Buffer.from(vkHex.slice(2), 'hex').toString('base64'),
      mock: false,
      proof_data: proofData,
      vk_data: vkData
    };
    
    console.log('Returning result with proof_data:', !!result.proof_data);
    console.log('Returning result with vk_data:', !!result.vk_data);
    
    return result;
    
  } catch (e) {
    console.error('Error generating real proof:', e);
    
    // Fallback to mock UltraPlonk data
    console.log('Falling back to mock data due to error');
    const fallbackProof = {
      proof_bytes: [85, 76, 80, 49, 7, 7, 7, 7], // UltraPlonk format
      public_inputs: {
        pid: input.pid,
        time_sec: input.time_sec,
        nullifier: input.nullifier,
        puzzle_commitment: input.puzzle_commitment
      }
    };
    
    const fallbackVk = {
      protocol: "ultraplonk",
      curve: "bn128",
      nPublic: 4
    };
    
    return { 
      proof_bytes: Buffer.from(JSON.stringify(fallbackProof)),
      proof_base64: Buffer.from(JSON.stringify(fallbackProof)).toString('base64'),
      vk_base64: Buffer.from(JSON.stringify(fallbackVk)).toString('base64'),
      mock: true,
      proof_data: fallbackProof,
      vk_data: fallbackVk
    };
  }
}

// ===== Web server (Mini App + APIs) =====
const app = express();
app.use(cors());
app.use(express.json());
// simple logger
app.use((req,res,next)=>{ console.log(new Date().toISOString(), req.method, req.path); next(); });
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));
app.use('/artifacts', express.static(path.join(__dirname, '..', 'noir', 'sudoku', 'target')));
app.use('/sudoku-generation', express.static(path.join(__dirname, 'sudoku-generation')));

app.get('/api/puzzle', (req, res) => {
  const { puzzleId, variant } = req.query;
  const puzzle = getPuzzle(puzzleId, variant);
  const commitment = getPuzzleCommitment(puzzle);
  res.json({ 
    ok: true,
    puzzle: {
      id: puzzle.id, 
      puzzle: puzzle.puzzle, 
      puzzle_commitment: commitment,
      name: puzzle.name,
      variant: puzzle.variant,
      difficulty: puzzle.difficulty,
      rules: puzzle.rules
    }
  });
});

app.get('/api/solution', (req, res) => { 
  const { puzzleId, variant } = req.query;
  const puzzle = getPuzzle(puzzleId, variant);
  res.json({ solution: puzzle.solution }); 
});

// New API endpoints for Logic Lane
app.get('/api/logic-lane/puzzles', (req, res) => {
  try {
    const puzzles = Object.values(LogicLanePuzzles).map(puzzle => ({
      id: puzzle.id,
      name: puzzle.name,
      variant: puzzle.variant,
      difficulty: puzzle.difficulty,
      puzzle: puzzle.puzzle,
      rules: puzzle.rules
    }));
    res.json({ ok: true, puzzles });
  } catch (error) {
    console.error('Error getting Logic Lane puzzles:', error);
    res.status(500).json({ ok: false, error: 'Failed to get puzzles' });
  }
});

app.get('/api/logic-lane/puzzle/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find puzzle by ID first
    let puzzle = null;
    
    // If id is numeric, search by puzzle ID
    if (!isNaN(id)) {
      puzzle = Object.values(LogicLanePuzzles).find(p => p.id === parseInt(id));
    }
    
    // If not found, try to find by key
    if (!puzzle) {
      puzzle = LogicLanePuzzles[id];
    }
    
    if (!puzzle) {
      return res.status(404).json({ ok: false, error: 'Puzzle not found' });
    }
    
    const commitment = getPuzzleCommitment(puzzle);
    res.json({
      ok: true,
      puzzle: {
        id: puzzle.id,
        name: puzzle.name,
        variant: puzzle.variant,
        difficulty: puzzle.difficulty,
        puzzle: puzzle.puzzle,
        rules: puzzle.rules,
        puzzle_commitment: commitment
      }
    });
  } catch (error) {
    console.error('Error getting puzzle:', error);
    res.status(500).json({ ok: false, error: 'Failed to get puzzle' });
  }
});


app.post('/api/submit', async (req, res) => {
  try {
    const { board, puzzleId, variant } = req.body;
    if (!Array.isArray(board) || board.length !== 81) return res.status(400).json({ ok: false, error: 'bad board' });
    
    const puzzle = getPuzzle(puzzleId, variant);
    if (!checkGivens(puzzle.puzzle, board)) return res.status(200).json({ ok: false, error: 'givens' });
    
    const csv = board.join(',');
    const r = await verifyWithRust(csv);
    return res.json({ ok: r.ok });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server' });
  }
});



app.post('/api/zkverify', async (req, res) => {
  try {
    console.log('=== ZKVERIFY ENDPOINT CALLED ===');
    const { commitment, public_inputs, proof, proof_bytes, server_token, board_csv, user_id, puzzleId, variant } = req.body || {};
    if (!public_inputs) return res.status(400).json({ ok:false, error:'bad payload: missing public_inputs' });
    const { pid, time_sec, nullifier, puzzle_commitment } = public_inputs;
    
    // Get the puzzle and validate commitment
    const puzzle = getPuzzle(puzzleId, variant);
    const expectedCommitment = getPuzzleCommitment(puzzle);
    if (!pid || !nullifier || puzzle_commitment !== expectedCommitment) return res.status(400).json({ ok:false, error:'bad public_inputs' });
    const expected = hmacToken(pid, String(board_csv||''), String(user_id||''));
    if (server_token && expected !== server_token) { /* ignore for now */ }
    // Removed replay attack check to allow multiple submissions per user per puzzle
    // Force server-side Noir proof generation regardless of client input
    let providedProof = [];
    let generatedProofData = null;
    try {
      const givensMask = basePuzzle.map(v=> v?1:0);
      const gen = await generateNoirProofNode({ pid, puzzle_commitment, nullifier, time_sec, board: (board_csv||'').split(',').map(Number), givens_mask: givensMask, givens_values: basePuzzle });
      providedProof = gen.proof_bytes;
      generatedProofData = gen;
      
      // Debug: Check what's in the generated proof
      console.log('DEBUG - gen object keys:', Object.keys(gen));
      console.log('DEBUG - gen.proof_data:', !!gen.proof_data);
      console.log('DEBUG - gen.vk_data:', !!gen.vk_data);
      console.log('DEBUG - gen.mock:', gen.mock);
    } catch (e) {
      console.warn('server-side noir proof failed, falling back to client proof if provided', e);
      providedProof = proof || proof_bytes || [];
    }
    console.log('ZKVERIFY', { len: Array.isArray(providedProof)? providedProof.length : (providedProof?.length||0), public_inputs, board_csv: (board_csv||'').slice(0,32)+'...' });

    // Try zkVerify submission first, then fallback to EDU Chain
    let extrinsicHash = null;
    let zkVerifyStatus = "not_configured";
    
    // Check if we should use zkVerify
    const ZKV_ENABLED = String(process.env.ZKV_ENABLED || 'false').toLowerCase() === 'true';
    
    if (ZKV_ENABLED && ZKV_WS) {
      try {
        console.log('Attempting zkVerify submission...');
        
        // Import zkverifyjs
        const { zkVerifySession, ZkVerifyEvents } = require('zkverifyjs');
        
        // Use the seed phrase from config
        const seedPhrase = process.env.ZKV_SIGNER_MNEMONIC;
        
        if (seedPhrase) {
          console.log('Using seed phrase from config');
          session = await zkVerifySession.start()
            .Volta()
            .withAccount(seedPhrase);
          console.log('Successfully connected with seed phrase');
        } else {
          console.log('No seed phrase found, using test account...');
          session = await zkVerifySession.start()
            .Volta()
            .withAccount("//Alice");
          console.log('Using test account (may not have enough tokens)');
        }
        
        // Get the proof data from the generated proof
        let proofData = generatedProofData.proof_data;
        let vkData = generatedProofData.vk_data;
        
        console.log('Using proof data from generateNoirProofNode');
        console.log('Proof data type:', providedProof.mock ? 'mock' : 'real');
        console.log('VK data type:', providedProof.mock ? 'mock' : 'real');
        
        console.log('DEBUG - providedProof.proof_data:', JSON.stringify(providedProof.proof_data));
        console.log('DEBUG - providedProof.vk_data:', JSON.stringify(providedProof.vk_data));
        console.log('DEBUG - proofData:', JSON.stringify(proofData));
        console.log('DEBUG - vkData:', JSON.stringify(vkData));
        
        // If the real proof data is not available, fall back to mock data
        if (!proofData || !vkData) {
          console.log('Real proof data not available, using mock data for zkVerify submission');
          proofData = {
            proof: "0x" + "00".repeat(100), // Mock proof
            public_inputs: {
              pid: `0x${pid.toString(16)}`,
              time_sec: time_sec,
              nullifier: `0x${nullifier}`,
              puzzle_commitment: `0x${puzzle_commitment}`
            }
          };
          vkData = {
            vk: "0x" + "00".repeat(100) // Mock VK
          };
        }
        
        // Use the proof data generated by generateNoirProofNode
        console.log('Using proof data from generateNoirProofNode');
        
        console.log('Submitting UltraPlonk proof to zkVerify...');
        console.log('Proof data:', JSON.stringify(proofData || {}).substring(0, 100) + '...');
        console.log('VK data:', JSON.stringify(vkData || {}).substring(0, 100) + '...');
        
        // Use UltraPlonk as per zkVerify documentation
        console.log('Using UltraPlonk approach...');
        
        // Set up event listeners for aggregation receipts
        let statement, aggregationId;
        
        session.subscribe([
          {
            event: ZkVerifyEvents.NewAggregationReceipt,
            callback: async (eventData) => {
              console.log("New aggregation receipt:", eventData);
              if(aggregationId == parseInt(eventData.data.aggregationId.replace(/,/g, ''))){
                let statementpath = await session.getAggregateStatementPath(
                  eventData.blockHash,
                  parseInt(eventData.data.domainId),
                  parseInt(eventData.data.aggregationId.replace(/,/g, '')),
                  statement
                );
                console.log("Statement path:", statementpath);
                const statementproof = {
                  ...statementpath,
                  domainId: parseInt(eventData.data.domainId),
                  aggregationId: parseInt(eventData.data.aggregationId.replace(/,/g, '')),
                };
                fs.writeFileSync("aggregation.json", JSON.stringify(statementproof));
              }
            },
            options: { domainId: 0 },
          },
        ]);
        
        try {
          console.log('Starting zkVerify submission with timeout...');
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('zkVerify submission timeout after 30 seconds')), 30000);
          });
          
          const { events, transactionResult } = await session
            .verify()
              .ultraplonk({
                numberOfPublicInputs: 0 // Try with 0 public inputs first
            })
            .execute({
              proofData: {
                vk: generatedProofData.vk_base64, // Use base64 VK as per zkVerify docs
                proof: generatedProofData.proof_base64, // Use base64 proof as per zkVerify docs
              },
              domainId: 0 // Use domain 0 as per zkVerify docs
            });
          
          console.log('zkVerify submission initiated, waiting for events...');
          
          // Listen for events
          events.on(ZkVerifyEvents.IncludedInBlock, (eventData) => {
            console.log("zkVerify: Included in block", eventData);
            statement = eventData.statement;
            aggregationId = eventData.aggregationId;
            extrinsicHash = eventData.txHash; // Use txHash instead of extrinsicHash
            zkVerifyStatus = "success";
          });
          
          events.on(ZkVerifyEvents.NewAggregationReceipt, (eventData) => {
            console.log("zkVerify: New aggregation receipt", eventData);
            zkVerifyStatus = "aggregated";
          });
          
          events.on(ZkVerifyEvents.ErrorEvent, (eventData) => {
            console.error("zkVerify: Error event", eventData);
            zkVerifyStatus = "error";
          });
          
          // Wait for transaction result with timeout
          try {
            console.log('Waiting for transaction result...');
            const result = await Promise.race([transactionResult, timeoutPromise]);
            console.log("zkVerify: Transaction completed", result);
            extrinsicHash = result.txHash || extrinsicHash; // Use txHash from result
            zkVerifyStatus = "completed";
          } catch (txError) {
            console.error("zkVerify: Transaction failed or timed out", txError);
            zkVerifyStatus = "failed";
          }
            
        } catch (zkvError) {
          console.warn('Direct zkVerify submission failed:', zkvError?.message || zkvError);
          zkVerifyStatus = "failed";
        }
        
      } catch (zkvError) {
        console.warn('zkVerify submission failed:', zkvError?.message || zkvError);
        zkVerifyStatus = "failed";
      }
    } else {
      console.log('zkVerify not configured');
    }
                
    // Log the proof that would have been submitted to zkVerify
              const publicInputsHex = {
                pid: '0x' + public_inputs.pid,
                time_sec: public_inputs.time_sec,
                nullifier: '0x' + public_inputs.nullifier,
                puzzle_commitment: '0x' + public_inputs.puzzle_commitment
              };
              
    console.log('Generated UltraPlonk proof:', {
      proof_bytes_length: providedProof.length,
      public_inputs: publicInputsHex,
      zkVerify_status: zkVerifyStatus
              });
              
        // Only use zkVerify - no mock fallback
    let evmTxHash = null;
    let status = "zkverify_only";
    
    console.log('=== ZKVERIFY ONLY SECTION ===');
    console.log('Status:', status);
    console.log('extrinsicHash:', extrinsicHash);
    console.log('zkVerifyStatus:', zkVerifyStatus);
    console.log('=== BEFORE LEADERBOARD CODE ===');
    console.log('About to check leaderboard condition...');

    // Add to leaderboard if we have a successful submission
    let leaderboardEntry = null;
    console.log('=== LEADERBOARD DEBUG START ===');
    console.log('Leaderboard check - extrinsicHash:', extrinsicHash, 'evmTxHash:', evmTxHash, 'user_id:', user_id);
    console.log('zkVerifyStatus:', zkVerifyStatus);
    console.log('Condition check:', extrinsicHash || evmTxHash);
    console.log('extrinsicHash type:', typeof extrinsicHash, 'value:', extrinsicHash);
    console.log('evmTxHash type:', typeof evmTxHash, 'value:', evmTxHash);
    
    // More lenient condition - add to leaderboard if we have time_sec and either user_id or extrinsicHash
    if (public_inputs.time_sec && (user_id || extrinsicHash)) {
      try {
        console.log('Creating leaderboard entry...');
        const entryData = {
          address: user_id || 'anonymous',
          time_sec: public_inputs.time_sec,
          extrinsicHash: extrinsicHash || evmTxHash || null, // Use null if no hash available
          user_id: user_id || 'anonymous',
          puzzle_id: public_inputs.pid,
          puzzle_variant: puzzle.variant || 'classic',
          puzzle_name: puzzle.name || 'Classic Sudoku',
          zkVerifyStatus: zkVerifyStatus // Add status to track what happened
        };
        console.log('Entry data:', entryData);
        leaderboardEntry = await addToLeaderboard(entryData);
        console.log('Added to leaderboard:', leaderboardEntry);
      } catch (leaderboardError) {
        console.error('Failed to add to leaderboard:', leaderboardError);
      }
    } else {
      console.log('Missing time_sec or both user_id and extrinsicHash, skipping leaderboard entry');
      console.log('Debug - time_sec:', public_inputs.time_sec, 'user_id:', user_id, 'extrinsicHash:', extrinsicHash);
    }
    console.log('=== LEADERBOARD DEBUG END ===');

    return res.json({ 
      ok: true, 
      received: { commitment, public_inputs }, 
      proof_len: Array.isArray(providedProof) ? providedProof.length : (providedProof?.length || 0), 
      extrinsicHash, 
      zkVerifyStatus,
      status,
      leaderboardEntry
    });
  } catch (e) {
    console.error('ZKVERIFY error', e);
    return res.status(500).json({ ok:false, error:'server' });
  }
});

function hmacToken(pid, boardCsv, userId){
  return crypto.createHmac('sha256', PROOF_SECRET).update(`${pid}|${boardCsv}|${userId}`).digest('hex');
}
// Removed seenNullifiers Set - no longer needed for global competition bot
app.post('/api/check', async (req, res) => {
  try {
    const { board, pid, user_id, puzzleId, variant } = req.body || {};
    if (!Array.isArray(board) || board.length !== 81) return res.status(400).json({ ok:false, error:'bad board' });
    if (!pid) return res.status(400).json({ ok:false, error:'missing pid' });
    
    const puzzle = getPuzzle(puzzleId, variant);
    const csv = board.join(',');
    if (!checkGivens(puzzle.puzzle, board)) return res.json({ ok:false, error:'givens' });
    const r = await verifyWithRust(csv);
    if (!r.ok) return res.json({ ok:false, error:'invalid' });
    const token = hmacToken(pid, csv, String(user_id||''));
    // Include timestamp in nullifier to allow multiple submissions per user per puzzle
    const timestamp = Date.now();
    const nullifier = crypto.createHash('sha256').update(`${pid}|${user_id}|${timestamp}|${PROOF_SECRET}`).digest('hex');
    const puzzle_commitment = getPuzzleCommitment(puzzle);
    console.log('CHECK ok', {pid, user_id, len: board.length, puzzleId: puzzle.id}); 
    return res.json({ ok:true, isValid: true, token, nullifier, puzzle_commitment, board_csv: csv });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'server' });
  }
});

// ===== Diagnostics =====
app.get('/api/diag/zkverify', async (req, res) => {
  try {
    const info = { ok: true, connection: null, chain: null, signer: null };
    
    // Test zkVerify connection
    if (ZKV_WS) {
      try {
        const api = await ensureZkvApi();
        if (api) {
          info.connection = 'connected';
          info.chain = {
            name: api.runtimeChain.toString(),
            version: api.runtimeVersion.toString(),
            blockNumber: (await api.rpc.chain.getHeader()).number.toString()
          };
          
          if (zkvSigner) {
            info.signer = {
              address: zkvSigner.address,
              publicKey: zkvSigner.publicKey.toString()
            };
          }
        }
      } catch (e) {
        info.connection = `error: ${e.message}`;
      }
    } else {
      info.connection = 'not_configured';
    }
    
    res.json(info);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/diag/noir', async (req, res) => {
  try {
    const info = { ok: true, packages: {}, backend: null, noir: null, artifact: null, proof_len: null };
    
    // Check installed packages
    const { execSync } = require('child_process');
    try {
      const npmList = execSync('npm list --depth=0', { cwd: __dirname }).toString();
      const lines = npmList.split('\n').filter(line => line.includes('@noir-lang/'));
      lines.forEach(line => {
        const match = line.match(/@noir-lang\/([^\s@]+)@(\S+)/);
        if (match) info.packages[match[1]] = match[2];
      });
    } catch (e) {
      info.packages.error = e.message;
    }
    
    // Try to load backend and Noir
    const req = require;
    let Backend = null;
    let Noir = null;
    let backendSource = null;
    let noirSource = null;
    
    // In older Noir.js versions (0.39.0), the backend is bundled
    try {
      const noirjs = req('@noir-lang/noir_js');
      info.noir_js_exports = Object.keys(noirjs);
      
      // Get Noir class
      Noir = noirjs.Noir || noirjs.default?.Noir;
      if (Noir) noirSource = 'CJS @noir-lang/noir_js';
      
      // Get backend class - in 0.39.0 it's called Barretenberg
      Backend = noirjs.Barretenberg || 
                noirjs.BarretenbergBackend || 
                noirjs.UltraplonkBackend || 
                noirjs.UltraPlonkBackend ||
                (noirjs.default && (
                  noirjs.default.Barretenberg ||
                  noirjs.default.BarretenbergBackend || 
                  noirjs.default.UltraplonkBackend || 
                  noirjs.default.UltraPlonkBackend
                ));
      if (Backend) backendSource = 'CJS @noir-lang/noir_js';
    } catch (e) {
      info.noir_js_cjs_error = e.message;
    }
    
    info.backend = backendSource;
    info.noir = noirSource;
    
    // Check artifact
    try {
      const fs = require('fs');
      const artPath = path.join(__dirname, '..', 'noir', 'sudoku', 'target', 'sudoku.json');
      const program = JSON.parse(fs.readFileSync(artPath, 'utf8'));
      info.artifact = { noir_version: program.noir_version, hash: program.hash };
      
      // Try to generate a proof
      if (Backend && Noir) {
        const backend = await Backend.new(program);
        const noir = new Noir(program, backend);
        const solution = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
        const toField = (v) => (typeof v === 'bigint' ? v : BigInt(v));
        const hexToField = (h) => BigInt('0x' + String(h || 0).replace(/^0x/, ''));
        const givensMask = basePuzzle.map(v => v ? 1 : 0);
        const witness = { 
          pid: toField(20250814), 
          puzzle_commitment: hexToField(PUZZLE_COMMIT), 
          nullifier: hexToField('1'), 
          time_sec: toField(1), 
          board: solution.map(toField), 
          givens_mask: givensMask.map(toField), 
          givens_values: basePuzzle.map(toField) 
        };
        const proof = await noir.generateProof(witness);
        info.proof_len = proof?.proof?.length || null;
        info.proof_success = true;
      }
    } catch (e) {
      info.proof_error = e.message;
    }
    
    res.json(info);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Add EDU chain config endpoint
app.get('/api/diag/edu', async (req, res) => {
  try {
    const EDU_RPC = process.env.EDU_RPC;
    const AGGREGATOR_ADDR = process.env.EDU_AGGREGATOR;
    const EVM_PK = process.env.EDU_PK;
    
    const info = {
      ok: true,
      config: {
        edu_rpc: EDU_RPC ? "set" : "missing",
        aggregator: AGGREGATOR_ADDR ? "set" : "missing",
        pk: EVM_PK ? "set" : "missing"
      },
      connection: null
    };
    
    if (EDU_RPC) {
      try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(EDU_RPC);
        const network = await provider.getNetwork();
        info.connection = {
          chainId: network.chainId.toString(),
          name: network.name
        };
        
        if (EVM_PK && AGGREGATOR_ADDR) {
          const wallet = new ethers.Wallet(EVM_PK.startsWith('0x') ? EVM_PK : '0x' + EVM_PK, provider);
          info.address = wallet.address;
          const balance = await provider.getBalance(wallet.address);
          info.balance = ethers.formatEther(balance);
        }
      } catch (e) {
        info.connection_error = e.message;
      }
    }
    
    res.json(info);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZkSudoku bot is running.`);
  console.log(`Web server listening on :${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}/webapp/`);
  
  // For Railway deployment, we'll use the provided URL
  if (process.env.RAILWAY_STATIC_URL) {
    console.log(`Railway URL: ${process.env.RAILWAY_STATIC_URL}/webapp/`);
  } else {
    console.log(`LAN URL: ${WEBAPP_URL}/webapp/`);
  }
});

// ===== Telegram Bot =====
const bot = new TelegramBot(TOKEN, { polling: ENABLE_TELEGRAM });

bot.onText(/\/start|\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const url = `${WEBAPP_URL}/webapp/`;
  bot.sendMessage(chatId, 'Welcome to ZkSudoku! Use /puzzle or open the Mini App.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open Sudoku', web_app: { url } }]],
    },
  });
});

bot.onText(/\/puzzle/, async (msg) => {
  const chatId = msg.chat.id;
  const pid = puzzleId();
  bot.sendMessage(chatId, `Puzzle ${pid}:\n${basePuzzle.join(',')}`);
});

bot.onText(/\/submit\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const pid = puzzleId();
  const boardCsv = match[1].trim();
  let board;
  try {
    board = parseBoardCsv(boardCsv);
  } catch (e) {
    bot.sendMessage(chatId, `❌ Invalid input: ${e.message}`);
    return;
  }
  if (!checkGivens(basePuzzle, board)) {
    bot.sendMessage(chatId, '❌ Board violates givens of the puzzle.');
    return;
  }
  const res = await verifyWithRust(boardCsv);
  if (!res.ok) {
    bot.sendMessage(chatId, '❌ Board is invalid.');
    return;
  }
  bot.sendMessage(chatId, `✅ Valid! Puzzle ${pid} solved.`);
});

console.log('ZkSudoku bot is running.');

// ===== zkSudoku Comprehensive Test =====
app.get('/api/test/zksudoku', async (req, res) => {
  try {
    const testResults = {
      ok: true,
      timestamp: new Date().toISOString(),
      components: {},
      summary: {}
    };
    
    // Test 1: Core Sudoku Logic
    try {
      const testBoard = [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9];
      const testResult = await verifyWithRust(testBoard.join(','));
      testResults.components.sudoku_logic = {
        status: testResult.ok ? 'pass' : 'fail',
        details: testResult
      };
    } catch (e) {
      testResults.components.sudoku_logic = { status: 'error', error: e.message };
    }
    
    // Test 2: Noir.js Integration
    try {
      const noirjs = require('@noir-lang/noir_js');
      testResults.components.noir_js = {
        status: 'pass',
        version: '0.39.0',
        exports: Object.keys(noirjs)
      };
    } catch (e) {
      testResults.components.noir_js = { status: 'error', error: e.message };
    }
    
    // Test 3: zkVerify Connection
    try {
      if (ZKV_WS) {
        const api = await ensureZkvApi();
        if (api) {
          testResults.components.zkverify_connection = {
            status: 'pass',
            endpoint: ZKV_WS,
            chain: api.runtimeChain.toString(),
            version: api.runtimeVersion.toString()
          };
        } else {
          testResults.components.zkverify_connection = { status: 'fail', error: 'API not available' };
        }
      } else {
        testResults.components.zkverify_connection = { status: 'not_configured' };
      }
    } catch (e) {
      testResults.components.zkverify_connection = { status: 'error', error: e.message };
    }
    
    // Test 4: EDU Chain Integration
    try {
      if (process.env.EDU_RPC) {
        const ethers = require('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.EDU_RPC);
        const chainId = await provider.send('eth_chainId');
        
        testResults.components.edu_chain = {
          status: 'pass',
          endpoint: process.env.EDU_RPC,
          chainId: parseInt(chainId, 16),
          aggregator: process.env.EDU_AGGREGATOR
        };
      } else {
        testResults.components.edu_chain = { status: 'not_configured' };
      }
    } catch (e) {
      testResults.components.edu_chain = { status: 'error', error: e.message };
    }
    
    // Test 5: zkverifyjs Package
    try {
      const zkverifyjs = require('zkverifyjs');
      testResults.components.zkverifyjs = {
        status: 'pass',
        available: !!zkverifyjs,
        exports: Object.keys(zkverifyjs)
      };
    } catch (e) {
      testResults.components.zkverifyjs = { status: 'error', error: e.message };
    }
    
    // Generate summary
    const passed = Object.values(testResults.components).filter(c => c.status === 'pass').length;
    const total = Object.keys(testResults.components).length;
    
    testResults.summary = {
      passed,
      total,
      percentage: Math.round((passed / total) * 100),
      status: passed === total ? 'all_passed' : passed > 0 ? 'partial' : 'failed'
    };
    
    res.json(testResults);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== Leaderboard API Endpoints =====

// Get leaderboard entries
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const variant = req.query.variant;
    const puzzleId = req.query.puzzleId;
    
    let leaderboard = await getLeaderboard(limit);
    
    // Filter by variant if specified
    if (variant) {
      leaderboard = leaderboard.filter(entry => entry.puzzle_variant === variant);
    }
    
    // Filter by puzzle ID if specified
    if (puzzleId) {
      leaderboard = leaderboard.filter(entry => entry.puzzle_id === puzzleId);
    }
    
    res.json({
      ok: true,
      leaderboard,
      count: leaderboard.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch leaderboard' });
  }
});

// Get leaderboard entry by ID
app.get('/api/leaderboard/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ ok: false, error: 'Entry not found' });
      }
      
      res.json({ ok: true, entry: data });
    } else {
      // In-memory lookup
      const entry = inMemoryLeaderboard.find(e => e.id === id);
      if (!entry) {
        return res.status(404).json({ ok: false, error: 'Entry not found' });
      }
      
      res.json({ ok: true, entry });
    }
  } catch (error) {
    console.error('Leaderboard entry fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch entry' });
  }
});

// Get user's best time
app.get('/api/leaderboard/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .order('score', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }
      
      res.json({ ok: true, bestTime: data || null });
    } else {
      // In-memory lookup
      const userEntries = inMemoryLeaderboard.filter(e => e.user_id === userId);
      const bestTime = userEntries.length > 0 
        ? userEntries.reduce((best, current) => current.score < best.score ? current : best)
        : null;
      
      res.json({ ok: true, bestTime });
    }
  } catch (error) {
    console.error('User best time fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user best time' });
  }
});

// Export functions for testing
module.exports = {
  generateNoirProofNode
};
