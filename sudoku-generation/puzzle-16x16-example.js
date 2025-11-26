// Exact 16x16 Sudoku puzzle from the image
// Puzzle 1 from the worksheet

const puzzle16x16Example = [
  // Row 1: 8, 9, empty, empty, 15, 16, 6, 3, 11, 7, 14, 2, 10, 12, empty, 13
  8, 9, 0, 0, 15, 16, 6, 3, 11, 7, 14, 2, 10, 12, 0, 13,
  
  // Row 2: 2, 16, empty, empty, 10, 13, 9, empty, 12, 5, 1, 6, 3, 14, empty, 4
  2, 16, 0, 0, 10, 13, 9, 0, 12, 5, 1, 6, 3, 14, 0, 4,
  
  // Row 3: empty, empty, 11, 13, empty, empty, 12, 8, 3, 10, 4, 16, 15, empty, 9, 6
  0, 0, 11, 13, 0, 0, 12, 8, 3, 10, 4, 16, 15, 0, 9, 6,
  
  // Row 4: 3, 12, 6, 14, 10, 4, 5, empty, 13, empty, 15, 9, empty, empty, empty, empty
  3, 12, 6, 14, 10, 4, 5, 0, 13, 0, 15, 9, 0, 0, 0, 0,
  
  // Row 5: 1, 14, 12, 9, 5, 6, 4, empty, 8, 13, 2, empty, 11, 10, empty, empty
  1, 14, 12, 9, 5, 6, 4, 0, 8, 13, 2, 0, 11, 10, 0, 0,
  
  // Row 6: 4, 7, empty, empty, empty, 16, empty, 1, 14, empty, empty, empty, 6, empty, empty, 8
  4, 7, 0, 0, 0, 16, 0, 1, 14, 0, 0, 0, 6, 0, 0, 8,
  
  // Row 7: empty, empty, 15, empty, 5, 8, empty, 11, empty, 6, empty, empty, 12, empty, 14, 3
  0, 0, 15, 0, 5, 8, 0, 11, 0, 6, 0, 0, 12, 0, 14, 3,
  
  // Row 8: empty, empty, empty, 13, empty, 14, 3, 9, empty, 1, empty, empty, 5, 2, empty, 7
  0, 0, 0, 13, 0, 14, 3, 9, 0, 1, 0, 0, 5, 2, 0, 7,
  
  // Row 9: empty, empty, 7, 3, 6, 10, empty, empty, 15, 1, 9, empty, 14, 12, 8, 2
  0, 0, 7, 3, 6, 10, 0, 0, 15, 1, 9, 0, 14, 12, 8, 2,
  
  // Row 10: 12, 1, empty, 16, 11, 7, 2, 14, empty, empty, empty, 6, empty, empty, 3, 10
  12, 1, 0, 16, 11, 7, 2, 14, 0, 0, 0, 6, 0, 0, 3, 10,
  
  // Row 11: 5, 2, empty, empty, empty, 4, empty, empty, 3, 9, empty, empty, 12, 11, 7, 16
  5, 2, 0, 0, 0, 4, 0, 0, 3, 9, 0, 0, 12, 11, 7, 16,
  
  // Row 12: 14, 6, empty, empty, empty, empty, empty, 8, 1, empty, empty, empty, 13, 7, 11, 15
  14, 6, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 13, 7, 11, 15,
  
  // Row 13: 15, 13, empty, 7, empty, empty, 10, 4, empty, empty, empty, empty, 1, 16, empty, 14
  15, 13, 0, 7, 0, 0, 10, 4, 0, 0, 0, 0, 1, 16, 0, 14,
  
  // Row 14: empty, empty, 3, empty, 7, 1, 15, 5, 9, 6, 10, empty, 8, 13, empty, empty
  0, 0, 3, 0, 7, 1, 15, 5, 9, 6, 10, 0, 8, 13, 0, 0,
  
  // Row 15: empty, empty, 4, 1, 6, 2, 8, empty, 16, empty, 14, 12, 15, empty, empty, empty
  0, 0, 4, 1, 6, 2, 8, 0, 16, 0, 14, 12, 15, 0, 0, 0,
  
  // Row 16: 9, empty, empty, 2, 8, empty, 11, 14, empty, 5, empty, empty, 13, 1, 4, 15
  9, 0, 0, 2, 8, 0, 11, 14, 0, 5, 0, 0, 13, 1, 4, 15
];

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = puzzle16x16Example;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.puzzle16x16Example = puzzle16x16Example;
}

// ES6 module export
export default puzzle16x16Example; 