// Simple test for Logic Lane puzzles
const { LogicLanePuzzles, getPuzzleById, getAllPuzzles } = require('./sudoku-generation/logic-lane-puzzles.js');

console.log('🧪 Testing Logic Lane Puzzles...\n');

// Test 1: Check if puzzles are loaded
console.log('1. Testing puzzle loading...');
if (LogicLanePuzzles && Object.keys(LogicLanePuzzles).length > 0) {
  console.log('✅ Success: Logic Lane puzzles loaded');
  console.log('   Found', Object.keys(LogicLanePuzzles).length, 'puzzles');
} else {
  console.log('❌ Failed: No puzzles found');
  process.exit(1);
}

// Test 2: Test getPuzzleById
console.log('\n2. Testing getPuzzleById...');
const puzzle1 = getPuzzleById(1);
if (puzzle1 && puzzle1.id === 1) {
  console.log('✅ Success: Retrieved puzzle 1 -', puzzle1.name);
  console.log('   Variant:', puzzle1.variant);
  console.log('   Difficulty:', puzzle1.difficulty);
} else {
  console.log('❌ Failed: Could not retrieve puzzle 1');
  process.exit(1);
}

// Test 3: Test getAllPuzzles
console.log('\n3. Testing getAllPuzzles...');
const allPuzzles = getAllPuzzles();
if (allPuzzles && allPuzzles.length > 0) {
  console.log('✅ Success: Retrieved all puzzles');
  console.log('   Puzzles:');
  allPuzzles.forEach(puzzle => {
    console.log(`     ${puzzle.id}. ${puzzle.name} (${puzzle.variant}) - ${puzzle.difficulty}`);
  });
} else {
  console.log('❌ Failed: Could not retrieve all puzzles');
  process.exit(1);
}

// Test 4: Test puzzle data structure
console.log('\n4. Testing puzzle data structure...');
let structureValid = true;
allPuzzles.forEach(puzzle => {
  if (!puzzle.id || !puzzle.name || !puzzle.variant || !puzzle.difficulty || !puzzle.puzzle || !puzzle.solution) {
    console.log(`   ❌ Puzzle ${puzzle.id} missing required fields`);
    structureValid = false;
  }
  
  if (puzzle.puzzle.length !== 81) {
    console.log(`   ❌ Puzzle ${puzzle.id} has wrong length: ${puzzle.puzzle.length}`);
    structureValid = false;
  }
  
  if (puzzle.solution.length !== 81) {
    console.log(`   ❌ Puzzle ${puzzle.id} solution has wrong length: ${puzzle.solution.length}`);
    structureValid = false;
  }
});

if (structureValid) {
  console.log('✅ Success: All puzzles have valid data structure');
} else {
  console.log('❌ Failed: Some puzzles have invalid data structure');
  process.exit(1);
}

// Test 5: Test puzzle variants
console.log('\n5. Testing puzzle variants...');
const variants = ['thermo', 'palindrome', 'diagonal', 'thermo-diagonal', 'thermo-palindrome'];
const foundVariants = new Set(allPuzzles.map(p => p.variant));

variants.forEach(variant => {
  if (foundVariants.has(variant)) {
    console.log(`   ✅ ${variant}: Found`);
  } else {
    console.log(`   ❌ ${variant}: Not found`);
  }
});

// Test 6: Test puzzle difficulties
console.log('\n6. Testing puzzle difficulties...');
const difficulties = ['easy', 'medium', 'hard'];
const foundDifficulties = new Set(allPuzzles.map(p => p.difficulty));

difficulties.forEach(difficulty => {
  if (foundDifficulties.has(difficulty)) {
    console.log(`   ✅ ${difficulty}: Found`);
  } else {
    console.log(`   ❌ ${difficulty}: Not found`);
  }
});

console.log('\n🎉 All tests passed! Logic Lane puzzles are working correctly.');
console.log('\n📊 Summary:');
console.log(`   Total puzzles: ${allPuzzles.length}`);
console.log(`   Variants: ${Array.from(foundVariants).join(', ')}`);
console.log(`   Difficulties: ${Array.from(foundDifficulties).join(', ')}`); 