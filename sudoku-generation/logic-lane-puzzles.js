// Logic Lane Puzzle Variants
// Each puzzle includes the puzzle data, solution, and variant rules

const LogicLanePuzzles = {
  // Puzzle 1: Thermo Sudoku with Diagonal
  thermoDiagonal: {
    id: 1,
    name: "Thermo Diagonal",
    variant: "thermo-diagonal",
    difficulty: "easy",
    puzzle: [
      5,3,0,0,7,0,0,0,0,
      6,0,0,1,9,5,0,0,0,
      0,9,8,0,0,0,0,6,0,
      8,0,0,0,6,0,0,0,3,
      4,0,0,8,0,3,0,0,1,
      7,0,0,0,2,0,0,0,6,
      0,6,0,0,0,0,2,8,0,
      0,0,0,4,1,9,0,0,5,
      0,0,0,0,8,0,0,7,9
    ],
    solution: [
      5,3,4,6,7,8,9,1,2,
      6,7,2,1,9,5,3,4,8,
      1,9,8,3,4,2,5,6,7,
      8,5,9,7,6,1,4,2,3,
      4,2,6,8,5,3,7,9,1,
      7,1,3,9,2,4,8,5,6,
      9,6,1,5,3,7,2,8,4,
      2,8,7,4,1,9,6,3,5,
      3,4,5,2,8,6,1,7,9
    ],
    rules: {
      thermo: [
        { cells: [0, 1, 2], direction: "right" },
        { cells: [3, 12, 21], direction: "down" },
        { cells: [6, 15, 24], direction: "down" }
      ],
      diagonal: true
    }
  },

  // Puzzle 2: Palindrome Sudoku
  palindrome: {
    id: 2,
    name: "Palindrome",
    variant: "palindrome",
    difficulty: "easy",
    puzzle: [
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0
    ],
    solution: [
      1,2,3,4,5,6,7,8,9,
      4,5,6,7,8,9,1,2,3,
      7,8,9,1,2,3,4,5,6,
      2,3,1,5,6,4,8,9,7,
      5,6,4,8,9,7,2,3,1,
      8,9,7,2,3,1,5,6,4,
      3,1,2,6,4,5,9,7,8,
      6,4,5,9,7,8,3,1,2,
      9,7,8,3,1,2,6,4,5
    ],
    rules: {
      palindrome: [
        { cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], direction: "horizontal" },
        { cells: [0, 9, 18, 27, 36, 45, 54, 63, 72], direction: "vertical" }
      ]
    }
  },

  // Puzzle 3: Thermo Sudoku
  thermo: {
    id: 3,
    name: "Thermo",
    variant: "thermo",
    difficulty: "easy",
    puzzle: [
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0
    ],
    solution: [
      1,2,3,4,5,6,7,8,9,
      4,5,6,7,8,9,1,2,3,
      7,8,9,1,2,3,4,5,6,
      2,3,1,5,6,4,8,9,7,
      5,6,4,8,9,7,2,3,1,
      8,9,7,2,3,1,5,6,4,
      3,1,2,6,4,5,9,7,8,
      6,4,5,9,7,8,3,1,2,
      9,7,8,3,1,2,6,4,5
    ],
    rules: {
      thermo: [
        { cells: [0, 1, 2], direction: "right" },
        { cells: [3, 12, 21], direction: "down" },
        { cells: [6, 15, 24], direction: "down" },
        { cells: [8, 17, 26], direction: "down" }
      ]
    }
  },

  // Puzzle 4: Diagonal Sudoku
  diagonal: {
    id: 4,
    name: "Diagonal",
    variant: "diagonal",
    difficulty: "easy",
    puzzle: [
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0
    ],
    solution: [
      1,2,3,4,5,6,7,8,9,
      4,5,6,7,8,9,1,2,3,
      7,8,9,1,2,3,4,5,6,
      2,3,1,5,6,4,8,9,7,
      5,6,4,8,9,7,2,3,1,
      8,9,7,2,3,1,5,6,4,
      3,1,2,6,4,5,9,7,8,
      6,4,5,9,7,8,3,1,2,
      9,7,8,3,1,2,6,4,5
    ],
    rules: {
      diagonal: true
    }
  },

  // Puzzle 5: Thermo Palindrome
  thermoPalindrome: {
    id: 5,
    name: "Thermo Palindrome",
    variant: "thermo-palindrome",
    difficulty: "medium",
    puzzle: [
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0
    ],
    solution: [
      1,2,3,4,5,6,7,8,9,
      4,5,6,7,8,9,1,2,3,
      7,8,9,1,2,3,4,5,6,
      2,3,1,5,6,4,8,9,7,
      5,6,4,8,9,7,2,3,1,
      8,9,7,2,3,1,5,6,4,
      3,1,2,6,4,5,9,7,8,
      6,4,5,9,7,8,3,1,2,
      9,7,8,3,1,2,6,4,5
    ],
    rules: {
      thermo: [
        { cells: [0, 1, 2], direction: "right" },
        { cells: [3, 12, 21], direction: "down" }
      ],
      palindrome: [
        { cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], direction: "horizontal" }
      ]
    }
  },

  // Puzzle 6: Classic Thermo
  classicThermo: {
    id: 6,
    name: "Classic Thermo",
    variant: "thermo",
    difficulty: "easy",
    puzzle: [
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0
    ],
    solution: [
      1,2,3,4,5,6,7,8,9,
      4,5,6,7,8,9,1,2,3,
      7,8,9,1,2,3,4,5,6,
      2,3,1,5,6,4,8,9,7,
      5,6,4,8,9,7,2,3,1,
      8,9,7,2,3,1,5,6,4,
      3,1,2,6,4,5,9,7,8,
      6,4,5,9,7,8,3,1,2,
      9,7,8,3,1,2,6,4,5
    ],
    rules: {
      thermo: [
        { cells: [0, 1, 2], direction: "right" },
        { cells: [3, 12, 21], direction: "down" },
        { cells: [6, 15, 24], direction: "down" },
        { cells: [8, 17, 26], direction: "down" },
        { cells: [18, 19, 20], direction: "right" },
        { cells: [54, 55, 56], direction: "right" }
      ]
    }
  }
};

// Helper function to get puzzle by ID
function getPuzzleById(id) {
  return Object.values(LogicLanePuzzles).find(puzzle => puzzle.id === id);
}

// Helper function to get all puzzles
function getAllPuzzles() {
  return Object.values(LogicLanePuzzles);
}

// Helper function to get puzzles by variant
function getPuzzlesByVariant(variant) {
  return Object.values(LogicLanePuzzles).filter(puzzle => puzzle.variant === variant);
}

// Helper function to get puzzles by difficulty
function getPuzzlesByDifficulty(difficulty) {
  return Object.values(LogicLanePuzzles).filter(puzzle => puzzle.difficulty === difficulty);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LogicLanePuzzles,
    getPuzzleById,
    getAllPuzzles,
    getPuzzlesByVariant,
    getPuzzlesByDifficulty
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.LogicLanePuzzles = LogicLanePuzzles;
  window.getPuzzleById = getPuzzleById;
  window.getAllPuzzles = getAllPuzzles;
  window.getPuzzlesByVariant = getPuzzlesByVariant;
  window.getPuzzlesByDifficulty = getPuzzlesByDifficulty;
} 