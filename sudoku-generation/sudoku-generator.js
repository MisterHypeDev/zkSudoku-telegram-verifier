// Sudoku Generator - JavaScript implementation
// Based on https://github.com/syt2/sudoku-generation

class SudokuGenerator {
  constructor(size) {
    this.size = size; // 2, 3, or 4 (for 4x4, 9x9, or 16x16)
    this.gridSize = size * size;
    this.maxNumber = this.gridSize;
    this.grid = [];
    this.solution = [];
  }

  // Initialize empty grid
  initializeGrid() {
    this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
    this.solution = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
  }

  // Check if a number can be placed at position (row, col)
  isValid(row, col, num) {
    // Check row
    for (let x = 0; x < this.gridSize; x++) {
      if (this.grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < this.gridSize; x++) {
      if (this.grid[x][col] === num) return false;
    }

    // Check box
    const boxSize = this.size;
    const startRow = Math.floor(row / boxSize) * boxSize;
    const startCol = Math.floor(col / boxSize) * boxSize;
    
    for (let i = 0; i < boxSize; i++) {
      for (let j = 0; j < boxSize; j++) {
        if (this.grid[startRow + i][startCol + j] === num) return false;
      }
    }

    return true;
  }

  // Generate a complete solved Sudoku
  generateSolution() {
    this.initializeGrid();
    
    // Fill diagonal boxes first (they are independent)
    for (let box = 0; box < this.size; box++) {
      this.fillBox(box * this.size, box * this.size);
    }
    
    // Solve the rest
    this.solveGrid();
    
    // Copy solution
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.solution[i][j] = this.grid[i][j];
      }
    }
  }

  // Fill a 3x3 or 4x4 box with random numbers
  fillBox(startRow, startCol) {
    const numbers = Array.from({length: this.maxNumber}, (_, i) => i + 1);
    this.shuffleArray(numbers);
    
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.grid[startRow + i][startCol + j] = numbers[i * this.size + j];
      }
    }
  }

  // Solve the grid using backtracking
  solveGrid() {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] === 0) {
          const numbers = Array.from({length: this.maxNumber}, (_, i) => i + 1);
          this.shuffleArray(numbers);
          
          for (let num of numbers) {
            if (this.isValid(row, col, num)) {
              this.grid[row][col] = num;
              
              if (this.solveGrid()) {
                return true;
              }
              
              this.grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Remove cells to create the puzzle
  removeCells(removeCount, maxTime = 30) {
    const startTime = Date.now();
    const positions = [];
    
    // Create array of all positions
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        positions.push([i, j]);
      }
    }
    
    this.shuffleArray(positions);
    
    let removed = 0;
    for (let [row, col] of positions) {
      if (removed >= removeCount) break;
      
      // Check time limit
      if (Date.now() - startTime > maxTime * 1000) break;
      
      const temp = this.grid[row][col];
      this.grid[row][col] = 0;
      
      // Check if puzzle still has unique solution
      if (this.hasUniqueSolution()) {
        removed++;
      } else {
        this.grid[row][col] = temp; // Restore if not unique
      }
    }
    
    return removed;
  }

  // Check if the puzzle has a unique solution
  hasUniqueSolution() {
    const tempGrid = this.grid.map(row => [...row]);
    let solutionCount = 0;
    
    this.countSolutions(0, 0, solutionCount);
    
    // Restore grid
    this.grid = tempGrid.map(row => [...row]);
    
    return solutionCount === 1;
  }

  // Count solutions (simplified version)
  countSolutions(row, col, count) {
    if (col >= this.gridSize) {
      row++;
      col = 0;
    }
    
    if (row >= this.gridSize) {
      count++;
      return;
    }
    
    if (this.grid[row][col] !== 0) {
      this.countSolutions(row, col + 1, count);
      return;
    }
    
    for (let num = 1; num <= this.maxNumber; num++) {
      if (this.isValid(row, col, num)) {
        this.grid[row][col] = num;
        this.countSolutions(row, col + 1, count);
        this.grid[row][col] = 0;
        
        if (count > 1) return; // Early exit if more than one solution
      }
    }
  }

  // Generate puzzle
  generate(removeCount, maxTime = 30) {
    this.generateSolution();
    
    // Create puzzle by removing cells
    const actualRemoved = this.removeCells(removeCount, maxTime);
    
    return {
      puzzle: this.gridToArray(),
      solution: this.solutionToArray(),
      removed: actualRemoved,
      remaining: this.gridSize * this.gridSize - actualRemoved
    };
  }

  // Convert 2D grid to 1D array
  gridToArray() {
    const result = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        result.push(this.grid[i][j]);
      }
    }
    return result;
  }

  // Convert 2D solution to 1D array
  solutionToArray() {
    const result = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        result.push(this.solution[i][j]);
      }
    }
    return result;
  }

  // Utility function to shuffle array
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Convert number to hex for 16x16
  numberToHex(num) {
    if (this.size === 4) {
      return num.toString(16).toUpperCase();
    }
    return num.toString();
  }

  // Convert hex to number for 16x16
  hexToNumber(hex) {
    if (this.size === 4) {
      return parseInt(hex, 16);
    }
    return parseInt(hex);
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SudokuGenerator;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.SudokuGenerator = SudokuGenerator;
}

// Export for ES6 modules
export default SudokuGenerator; 