const tg = window.Telegram?.WebApp;
const API = `${location.origin.replace(/\/$/, '')}/api`;

// Detect Telegram Mini App and add specific class
if (tg) {
  document.body.classList.add('telegram-webview');
  console.log('Telegram Mini App detected');
}

// Global variables
let currentPuzzle = []; 
let selectedIndex = -1; 
let notesMode = false;
let keyboardEnabled = false;
let highlightedNumber = null;
let startTime = 0, timerId = null; 
let isPaused = false;
let pausedTime = 0;
let pauseStartTime = 0;
let lastValidBoardHash = null;
let lastProof = null; 
let currentPid = "";
let currentGameMode = null; // '16x16', 'logic-lane', 'killer'
let gridSize = 9; // Default 9x9, will be 16 for 16x16
let selectedPuzzleId = null; // Track selected puzzle ID
let currentSolution = null; // Store current puzzle solution

// Long press functionality
let longPressTimer = null;
let longPressActive = false;
let longPressNumber = null;
let multiSelectMode = false;

// Clear button long press functionality
let clearLongPressTimer = null;
let clearLongPressActive = false;

// Settings and hint functionality
let gameSettings = {
  showTimer: true,
  autoCheckErrors: 'always', // 'always', 'onRuleViolation', 'delayed', 'never'
  highlightMatchingNumbers: true,
  highlightRestrictedAreas: true,
  highlightMatchingPencilMarks: true,
  autoRemovePencilMarks: true,
  longPressForMultiSelect: true
};

let userCredits = 5; // Default credits for hints
let hintCost = 1; // Cost per hint

// Drag selection functionality
let isDragging = false;
let dragStartCell = null;
let selectedCells = new Set();

// Notes layout functionality
let notesLayout = 'compact'; // 'compact', 'row', 'column'
let notesLayoutSelectionMode = false; // For selecting cells to change layout

// Force grid to fit board - Dynamic grid sizing for mobile devices
function adjustGridSize() {
  // Get the grid element based on current grid size
  const grid = document.querySelector('.grid');
  if (!grid) return;
  
  // Check if the game interface is active
  const gameInterface = document.getElementById('gameInterface');
  if (!gameInterface || !gameInterface.classList.contains('active')) return;
  
  // Force grid to use maximum available space with conservative padding
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Detect Safari and Telegram Mini App for extra conservative sizing
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isTelegram = document.body.classList.contains('telegram-webview');
  
  // Conservative padding based on platform
  let padding = 32; // Default conservative padding
  let headerHeight = 80;
  let keypadHeight = 120;
  
  if (isSafari) {
    padding = 40; // Extra conservative for Safari
    headerHeight = 100;
    keypadHeight = 140;
  }
  
  if (isTelegram) {
    padding = 48; // Most conservative for Telegram Mini App
    headerHeight = 120;
    keypadHeight = 160;
  }
  
  // Calculate maximum possible size
  const maxWidth = viewportWidth - padding;
  const maxHeight = viewportHeight - headerHeight - keypadHeight - padding;
  
  // Use the smaller dimension to ensure square grid
  const optimalSize = Math.min(maxWidth, maxHeight);
  
  // Force apply the size with !important equivalent
  grid.style.setProperty('width', `${optimalSize}px`, 'important');
  grid.style.setProperty('height', `${optimalSize}px`, 'important');
  grid.style.setProperty('max-width', `${optimalSize}px`, 'important');
  grid.style.setProperty('max-height', `${optimalSize}px`, 'important');
  grid.style.setProperty('min-width', 'unset', 'important');
  grid.style.setProperty('min-height', 'unset', 'important');
  grid.style.setProperty('overflow', 'hidden', 'important');
  
  // Calculate cell size based on grid size
  const cellSize = optimalSize / gridSize;
  
  // Force cell sizes
  const cells = grid.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.style.setProperty('width', `${cellSize}px`, 'important');
    cell.style.setProperty('height', `${cellSize}px`, 'important');
    cell.style.setProperty('max-width', `${cellSize}px`, 'important');
    cell.style.setProperty('max-height', `${cellSize}px`, 'important');
    cell.style.setProperty('min-width', 'unset', 'important');
    cell.style.setProperty('min-height', 'unset', 'important');
  });
  
  // Force font sizes with platform-specific adjustments
  const inputs = grid.querySelectorAll('.cell input');
  inputs.forEach(input => {
    let fontSize = Math.max(cellSize * 0.5, 12); // Larger font for 9x9
    
    // Adjust font size for 16x16 grid
    if (gridSize === 16) {
      fontSize = Math.max(cellSize * 0.3, 8); // Smaller font for 16x16
      if (isSafari) fontSize = Math.max(cellSize * 0.28, 8);
      if (isTelegram) fontSize = Math.max(cellSize * 0.25, 8);
    }
    
    input.style.setProperty('font-size', `${fontSize}px`, 'important');
    input.style.setProperty('padding', '1px', 'important');
  });
  
  // Handle notes differently based on grid size
  if (gridSize === 16) {
    // Force notes sizes for 16x16 with platform-specific adjustments
    const notes = grid.querySelectorAll('.notes-16x16');
    notes.forEach(note => {
      let fontSize = Math.max(cellSize * 0.12, 6); // Minimum 6px font
      if (isSafari) fontSize = Math.max(cellSize * 0.11, 6);
      if (isTelegram) fontSize = Math.max(cellSize * 0.1, 6);
      note.style.setProperty('font-size', `${fontSize}px`, 'important');
      note.style.setProperty('padding', '0px', 'important');
    });
    
    const noteSpans = grid.querySelectorAll('.notes-16x16 span');
    noteSpans.forEach(span => {
      let fontSize = Math.max(cellSize * 0.12, 6);
      if (isSafari) fontSize = Math.max(cellSize * 0.11, 6);
      if (isTelegram) fontSize = Math.max(cellSize * 0.1, 6);
      span.style.setProperty('font-size', `${fontSize}px`, 'important');
      span.style.setProperty('padding', '0px', 'important');
      span.style.setProperty('margin', '0px', 'important');
    });
    
    // Special handling for double-digit numbers
    const doubleDigitSpans = grid.querySelectorAll('.notes-16x16 span[data-number="10"], .notes-16x16 span[data-number="11"], .notes-16x16 span[data-number="12"], .notes-16x16 span[data-number="13"], .notes-16x16 span[data-number="14"], .notes-16x16 span[data-number="15"], .notes-16x16 span[data-number="16"]');
    doubleDigitSpans.forEach(span => {
      let fontSize = Math.max(cellSize * 0.1, 5);
      if (isSafari) fontSize = Math.max(cellSize * 0.09, 5);
      if (isTelegram) fontSize = Math.max(cellSize * 0.08, 5);
      span.style.setProperty('font-size', `${fontSize}px`, 'important');
      span.style.setProperty('letter-spacing', '-0.5px', 'important');
    });
  } else {
    // Handle notes for 9x9 grid
    const notes = grid.querySelectorAll('.notes');
    notes.forEach(note => {
      let fontSize = Math.max(cellSize * 0.2, 7);
      if (isSafari) fontSize = Math.max(cellSize * 0.18, 7);
      if (isTelegram) fontSize = Math.max(cellSize * 0.16, 7);
      note.style.setProperty('font-size', `${fontSize}px`, 'important');
      note.style.setProperty('padding', '0px', 'important');
    });
  }
  
  console.log(`Grid forced to fit: ${optimalSize}x${optimalSize}px, Cell size: ${cellSize}px, Grid size: ${gridSize}x${gridSize}, Platform: ${isSafari ? 'Safari' : isTelegram ? 'Telegram' : 'Other'}`);
}

// Theme management
function initTheme() {
  console.log('🔧 Initializing theme...');
  
  const savedTheme = localStorage.getItem('zkSudokuTheme') || 'light';
  let themeToggle = document.getElementById('themeToggle');
  
  // If button not found immediately, try again after a short delay
  if (!themeToggle) {
    console.log('⏳ Theme toggle button not found, retrying...');
    setTimeout(() => {
      themeToggle = document.getElementById('themeToggle');
      if (themeToggle) {
        console.log('✅ Theme toggle button found on retry');
        setupThemeToggle(themeToggle, savedTheme);
      } else {
        console.error('❌ Theme toggle button not found after retry!');
      }
    }, 100);
    return;
  }
  
  console.log('✅ Theme toggle button found');
  setupThemeToggle(themeToggle, savedTheme);
}

function setupThemeToggle(themeToggle, savedTheme) {
  console.log('📊 Saved theme:', savedTheme);
  
  function setTheme(theme) {
    console.log('🎨 Setting theme to:', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zkSudokuTheme', theme);
    
    // Update toggle button text and icon
    if (theme === 'dark') {
      themeToggle.textContent = '☀️ Light';
    } else {
      themeToggle.textContent = '🌙 Dark';
    }
    
    console.log('✅ Theme set successfully');
  }
  
  // Set initial theme
  setTheme(savedTheme);
  
  // Remove any existing click handlers to prevent duplicates
  const newThemeToggle = themeToggle.cloneNode(true);
  themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
  themeToggle = newThemeToggle;
  
  // Add click handler
  themeToggle.addEventListener('click', (e) => {
    console.log('🖱️ Theme toggle clicked');
    console.log('Event details:', e);
    
    // Prevent any default behavior that might interfere
    e.preventDefault();
    e.stopPropagation();
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    console.log('🔄 Switching from', currentTheme, 'to', newTheme);
    setTheme(newTheme);
  });
  
  // Also add mousedown and touchstart handlers for better compatibility
  themeToggle.addEventListener('mousedown', (e) => {
    console.log('🖱️ Theme toggle mousedown');
    e.preventDefault();
  });
  
  themeToggle.addEventListener('touchstart', (e) => {
    console.log('👆 Theme toggle touchstart');
    e.preventDefault();
  });
  
  console.log('✅ Theme toggle setup complete');
}

// Initialize theme and UI elements when DOM is ready
function initializeUI() {
  console.log('🚀 Initializing UI...');
  
  // Initialize theme
  initTheme();
  
  // Initialize keypad visibility (hidden by default on menu)
  const keypad = document.querySelector('.keypad');
  if (keypad) {
    keypad.style.display = 'none';
    keypad.classList.add('hidden');
    console.log('✅ Keypad initialized and hidden');
    
    // Set up keypad event listeners immediately (even when hidden)
    setupKeypadEventListeners();
  } else {
    console.log('⚠️ Keypad not found');
  }
  
  // Initialize settings visibility
  updateTimerVisibility();
  console.log('✅ UI initialization complete');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  // DOM is already loaded
  initializeUI();
}

// Number highlighting functionality

function highlightNumberInstances(number) {
  console.log('Highlighting number:', number); // Debug log
  
  // If clicking the same number that's already highlighted, clear highlights
  if (highlightedNumber === number) {
    clearNumberHighlights(notesLayoutSelectionMode);
    return;
  }
  
  // Clear previous highlights but keep notes layout mode if active
  clearNumberHighlights(notesLayoutSelectionMode);
  
  if (!number) {
    highlightedNumber = null;
    return;
  }
  
  highlightedNumber = number;
  const cells = document.querySelectorAll('.cell');
  let highlightCount = 0;
  
  cells.forEach((cell, index) => {
    const input = cell.querySelector('input');
    const cellValue = input.value.trim();
    
    // Convert number to appropriate string representation
    let numberString = String(number);
    
    if (cellValue === numberString) {
      // This is the clicked number - highlight it
      cell.classList.add('number-highlight');
      highlightCount++;
      console.log('Highlighted cell at index:', index, 'with value:', cellValue); // Debug log
    }
    // Removed the else if block that was making other numbers gray
    
    // Highlight the number in notes if it exists
    const notes = cell.querySelector('.notes');
    if (notes) {
      const noteSpan = notes.children[number - 1];
      if (noteSpan && noteSpan.style.visibility === 'visible') {
        noteSpan.classList.add('note-highlight');
        console.log('Highlighted note', number, 'in cell at index:', index);
      }
    }
  });
  
  console.log('Total cells highlighted:', highlightCount); // Debug log
}

function clearNumberHighlights(keepNotesLayoutMode = false) {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('number-highlight', 'number-highlight-others');
  });
  
  // Clear note highlights
  document.querySelectorAll('.notes span').forEach(span => {
    span.classList.remove('note-highlight');
  });
  
  highlightedNumber = null;
  
  // Exit notes layout selection mode when clearing highlights (unless explicitly keeping it)
  if (!keepNotesLayoutMode) {
    exitNotesLayoutSelectionMode();
  }
}

function exitNotesLayoutSelectionMode() {
  if (notesLayoutSelectionMode) {
    notesLayoutSelectionMode = false;
    window.notesLayoutSelectionMode = false;
    const toggleNotesLayoutBtn = document.getElementById('toggleNotesLayout');
    if (toggleNotesLayoutBtn) {
      toggleNotesLayoutBtn.classList.remove('active');
    }
    document.body.classList.remove('layout-selection-mode');
    console.log('Exited notes layout selection mode');
  }
}

function highlightRowColumnBox(cellIndex) {
  // Clear previous highlights
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlight-row', 'highlight-col', 'highlight-box');
  });
  
  const row = Math.floor(cellIndex / gridSize);
  const col = cellIndex % gridSize;
  const boxSize = gridSize === 16 ? 4 : 3;
  const boxRow = Math.floor(row / boxSize);
  const boxCol = Math.floor(col / boxSize);
  
  // Highlight row
  for (let c = 0; c < gridSize; c++) {
    const rowCellIndex = row * gridSize + c;
    const rowCell = document.querySelectorAll('.cell')[rowCellIndex];
    if (rowCell && rowCellIndex !== cellIndex) {
      rowCell.classList.add('highlight-row');
    }
  }
  
  // Highlight column
  for (let r = 0; r < gridSize; r++) {
    const colCellIndex = r * gridSize + col;
    const colCell = document.querySelectorAll('.cell')[colCellIndex];
    if (colCell && colCellIndex !== cellIndex) {
      colCell.classList.add('highlight-col');
    }
  }
  
  // Highlight box
  for (let r = boxRow * boxSize; r < boxRow * boxSize + boxSize; r++) {
    for (let c = boxCol * boxSize; c < boxCol * boxSize + boxSize; c++) {
      const boxCellIndex = r * gridSize + c;
      const boxCell = document.querySelectorAll('.cell')[boxCellIndex];
      if (boxCell && boxCellIndex !== cellIndex) {
        boxCell.classList.add('highlight-box');
      }
    }
  }
}

function clearRowColumnBoxHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlight-row', 'highlight-col', 'highlight-box');
  });
}

function createNotesElement(layout = 'compact') {
  const notes = document.createElement('div');
  notes.className = `notes layout-${layout}${gridSize === 16 ? ' notes-16x16' : ''}`;
  
  const maxNumber = gridSize === 16 ? 16 : 9;
  for (let n = 1; n <= maxNumber; n++) {
    const s = document.createElement('span');
    s.textContent = String(n);
    s.style.visibility = 'hidden';
    s.setAttribute('data-number', n); // Add data attribute for debugging
    notes.appendChild(s);
  }
  
  console.log('Created notes element with', notes.children.length, 'spans');
  return notes;
}

function updateNotesLayout() {
  // Update all existing notes elements with new layout
  document.querySelectorAll('.notes').forEach(notes => {
    notes.className = `notes layout-${notesLayout}`;
    // Sort notes for the new layout
    sortNotesByLayout(notes);
  });
}

function changeCellNotesLayout(cell, newLayout) {
  const notes = cell.querySelector('.notes');
  if (notes) {
    console.log('Changing notes layout to:', newLayout);
    notes.className = `notes layout-${newLayout}`;
    
    // Log the order of spans before layout change
    console.log('Spans before layout change:');
    Array.from(notes.children).forEach((span, index) => {
      console.log(`Span ${index}: number ${span.textContent}, visibility: ${span.style.visibility}`);
    });
    
    sortNotesByLayout(notes);
    
    // Log the order of spans after layout change
    console.log('Spans after layout change:');
    Array.from(notes.children).forEach((span, index) => {
      console.log(`Span ${index}: number ${span.textContent}, visibility: ${span.style.visibility}`);
    });
  } else {
    console.log('No notes element found in cell');
  }
}

function cycleCellNotesLayout(cell) {
  const notes = cell.querySelector('.notes');
  if (!notes) {
    console.log('No notes found in cell, creating notes first');
    // Create notes if they don't exist
    const notesElement = createNotesElement('compact');
    cell.appendChild(notesElement);
    return;
  }
  
  // Get current layout from class
  let currentLayout = 'compact';
  if (notes.classList.contains('layout-row')) {
    currentLayout = 'row';
  } else if (notes.classList.contains('layout-column')) {
    currentLayout = 'column';
  }
  
  // Cycle through layouts: compact -> row -> column -> compact
  const layouts = ['compact', 'row', 'column'];
  const currentIndex = layouts.indexOf(currentLayout);
  const nextIndex = (currentIndex + 1) % layouts.length;
  const newLayout = layouts[nextIndex];
  
  changeCellNotesLayout(cell, newLayout);
  console.log('Changed cell layout from', currentLayout, 'to:', newLayout);
}

function addPencilMark(cell, number) {
  console.log('addPencilMark called with number:', number);
  
  // Ensure the cell has notes structure
  let notes = cell.querySelector('.notes');
  if (!notes) {
    console.log('Creating new notes element');
    notes = createNotesElement('compact');
    cell.appendChild(notes);
  }
  
  // Find the correct span for this number
  const noteSpan = notes.querySelector(`span[data-number="${number}"]`);
  console.log('Note span for number', number, ':', noteSpan);
  if (noteSpan) {
    console.log('Note span text content:', noteSpan.textContent);
    console.log('Current visibility:', noteSpan.style.visibility);
    
    if (noteSpan.style.visibility === 'hidden') {
      noteSpan.style.visibility = 'visible';
      console.log('Made note', number, 'visible');
    } else {
      noteSpan.style.visibility = 'hidden';
      console.log('Made note', number, 'hidden');
    }
  } else {
    console.log('Note span for number', number, 'not found');
  }
  
  // Update layout without reordering DOM
  sortNotesByLayout(notes);
  
  console.log('Added pencil mark', number, 'to cell');
}

function sortNotesByLayout(notes) {
  // Don't reorder DOM elements - just update CSS classes for visual sorting
  const spans = Array.from(notes.children);
  const visibleSpans = spans.filter(span => span.style.visibility === 'visible');
  
  // Get the current layout from the notes element's class
  let currentLayout = 'compact';
  if (notes.classList.contains('layout-row')) {
    currentLayout = 'row';
  } else if (notes.classList.contains('layout-column')) {
    currentLayout = 'column';
  }
  
  // Check if this is a 16x16 grid
  const is16x16 = notes.classList.contains('notes-16x16');
  
  if (currentLayout === 'row') {
    if (is16x16) {
      // For 16x16 row layout: 5 columns × 4 rows
      notes.style.gridTemplateColumns = 'repeat(5, 1fr)';
      notes.style.gridTemplateRows = 'repeat(4, 1fr)';
    } else {
      // For 9x9 row layout: 4 columns × 3 rows
      notes.style.gridTemplateColumns = 'repeat(4, 1fr)';
      notes.style.gridTemplateRows = 'repeat(3, 1fr)';
    }
  } else if (currentLayout === 'column') {
    if (is16x16) {
      // For 16x16 column layout: 4 columns × 5 rows
      notes.style.gridTemplateColumns = 'repeat(4, 1fr)';
      notes.style.gridTemplateRows = 'repeat(5, 1fr)';
    } else {
      // For 9x9 column layout: 3 columns × 4 rows
      notes.style.gridTemplateColumns = 'repeat(3, 1fr)';
      notes.style.gridTemplateRows = 'repeat(4, 1fr)';
    }
  } else {
    if (is16x16) {
      // For 16x16 compact layout: 4 columns × 4 rows
      notes.style.gridTemplateColumns = 'repeat(4, 1fr)';
      notes.style.gridTemplateRows = 'repeat(4, 1fr)';
    } else {
      // For 9x9 compact layout: 3 columns × 3 rows
      notes.style.gridTemplateColumns = 'repeat(3, 1fr)';
      notes.style.gridTemplateRows = 'repeat(3, 1fr)';
    }
  }
  
  // Keep spans in their original order to maintain correct number mapping
  // The CSS grid will handle the visual layout
}

function addPencilMarkToSelectedCells(number) {
  // Add pencil mark to all selected cells
  selectedCells.forEach(cell => {
    addPencilMark(cell, number);
  });
  
  // Also add to the currently selected cell if it's not in the selection
  if (selectedIndex >= 0) {
    const currentCell = document.querySelectorAll('.cell')[selectedIndex];
    if (!selectedCells.has(currentCell)) {
      addPencilMark(currentCell, number);
    }
  }
}

function exitMultiSelectMode() {
  multiSelectMode = false;
  longPressActive = false;
  longPressNumber = null;
  
  // Clear drag selection
  clearDragSelection();
  isDragging = false;
  dragStartCell = null;
  selectedCells.clear();
  
  // Remove visual feedback
  document.querySelectorAll('.keypad button').forEach(btn => {
    btn.classList.remove('long-press-active');
  });
  document.body.classList.remove('multi-select-mode');
  
  // Clear number highlighting
  clearNumberHighlights();
  
  // Clear row/column/box highlighting
  clearRowColumnBoxHighlights();
  
  // Exit notes layout selection mode if active
  exitNotesLayoutSelectionMode();
  
  console.log('Exited multi-select mode');
}

function clearDragSelection() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('drag-selected');
  });
  selectedCells.clear();
}
async function loadPuzzle() {
  const res = await fetch(`${API}/puzzle`);
  const data = await res.json();
  currentPid = data.id;
  const pidEl = document.getElementById('pid'); if (pidEl) pidEl.textContent = `Puzzle ${currentPid}`;
  return data.puzzle;
}


function createGrid(puzzle) {
  currentPuzzle = puzzle.slice();
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  
  // Update grid class based on size
  grid.className = gridSize === 16 ? 'grid grid-16x16' : 'grid';
  
  const totalCells = gridSize * gridSize;
  for (let i = 0; i < totalCells; i++) {
    const r = Math.floor(i/gridSize), c = i%gridSize;
    const cell = document.createElement('div');
    cell.className = 'cell' + (puzzle[i] ? ' given' : '') + (gridSize === 16 ? ' cell-16x16' : '');
    const input = document.createElement('input');
    input.maxLength = 1;
    input.inputMode = 'numeric';
    input.value = puzzle[i] ? String(puzzle[i]) : '';
    input.disabled = !!puzzle[i];
    
    // Add a data attribute to help with sizing
    cell.dataset.gridSize = gridSize;
    
    // Add click handler for all cells to handle number highlighting
    cell.addEventListener('click', () => {
      const value = input.value.trim();
      
      // Handle notes layout selection mode
      if (window.notesLayoutSelectionMode) {
        console.log('Notes layout selection mode active, cycling layout for cell');
        cycleCellNotesLayout(cell);
        return;
      }
      
      // Handle multi-select mode for pencil marks
      if (multiSelectMode && longPressActive && longPressNumber) {
        // Toggle selection of this cell
        if (selectedCells.has(cell)) {
          selectedCells.delete(cell);
          cell.classList.remove('drag-selected');
        } else {
          selectedCells.add(cell);
          cell.classList.add('drag-selected');
        }
        return;
      }
      
      if (value) {
        // If cell has a number, highlight all instances of that number
        console.log('Clicked on number:', value); // Debug log
        highlightNumberInstances(parseInt(value));
        
        // Also select the cell for potential editing
        document.querySelectorAll('.cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected'); 
        selectedIndex = i;
        
        // Clear row/column/box highlights when clicking on a number
        clearRowColumnBoxHighlights();
        
        // Exit notes layout selection mode when clicking on a number
        exitNotesLayoutSelectionMode();
        
        // Clear multi-select mode
        if (multiSelectMode) {
          exitMultiSelectMode();
        }
      } else {
        // If cell is empty, clear number highlights and select the cell
        clearNumberHighlights();
        document.querySelectorAll('.cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected'); 
        selectedIndex = i;
        
        // Highlight row, column, and box for empty cell
        highlightRowColumnBox(i);
        
        if (keyboardEnabled) {
          // Re-enable pointer events temporarily for focus
          input.style.pointerEvents = 'auto';
          input.focus();
          setTimeout(() => {
            input.style.pointerEvents = 'none';
          }, 100);
        }
      }
    });
    
    // Add touch handler for mobile
    cell.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      
      // Handle notes layout selection mode
      if (window.notesLayoutSelectionMode) {
        console.log('Notes layout selection mode active (touch), cycling layout for cell');
        cycleCellNotesLayout(cell);
        return;
      }
      
      // Handle multi-select mode for pencil marks
      if (multiSelectMode && longPressActive && longPressNumber) {
        // Toggle selection of this cell
        if (selectedCells.has(cell)) {
          selectedCells.delete(cell);
          cell.classList.remove('drag-selected');
        } else {
          selectedCells.add(cell);
          cell.classList.add('drag-selected');
        }
        return;
      }
      
      if (value) {
        // If cell has a number, highlight all instances of that number
        console.log('Touched number:', value); // Debug log
        highlightNumberInstances(parseInt(value));
        
        // Also select the cell for potential editing
        document.querySelectorAll('.cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected'); 
        selectedIndex = i;
        
        // Clear row/column/box highlights when touching a number
        clearRowColumnBoxHighlights();
        
        // Exit notes layout selection mode when touching a number
        exitNotesLayoutSelectionMode();
        
        // Clear multi-select mode
        if (multiSelectMode) {
          exitMultiSelectMode();
        }
      } else {
        // If cell is empty, clear number highlights and select the cell
        clearNumberHighlights();
        document.querySelectorAll('.cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected'); 
        selectedIndex = i;
        
        // Highlight row, column, and box for empty cell
        highlightRowColumnBox(i);
        
        if (keyboardEnabled) {
          // Re-enable pointer events temporarily for focus
          input.style.pointerEvents = 'auto';
          input.focus();
          setTimeout(() => {
            input.style.pointerEvents = 'none';
          }, 100);
        }
      }
    });
    
    // Add drag selection handlers
    cell.addEventListener('mousedown', (e) => {
      if (multiSelectMode && longPressActive && longPressNumber) {
        isDragging = true;
        dragStartCell = cell;
        selectedCells.clear();
        
        // Add visual feedback for drag start
        cell.classList.add('drag-selected');
        selectedCells.add(cell);
        
        // Prevent text selection during drag
        e.preventDefault();
      }
    });
    
    // Add touch drag selection handlers for mobile
    cell.addEventListener('touchstart', (e) => {
      if (multiSelectMode && longPressActive && longPressNumber) {
        isDragging = true;
        dragStartCell = cell;
        selectedCells.clear();
        
        // Add visual feedback for drag start
        cell.classList.add('drag-selected');
        selectedCells.add(cell);
        
        // Prevent default touch behavior
        e.preventDefault();
      }
    });
    
    cell.addEventListener('mouseenter', (e) => {
      if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
        if (!selectedCells.has(cell)) {
          cell.classList.add('drag-selected');
          selectedCells.add(cell);
        }
      }
    });
    
    cell.addEventListener('touchmove', (e) => {
      if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
        // Find the cell under the touch point
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const touchedCell = element?.closest('.cell');
        
        if (touchedCell && !selectedCells.has(touchedCell)) {
          touchedCell.classList.add('drag-selected');
          selectedCells.add(touchedCell);
        }
        
        e.preventDefault();
      }
    });
    
    cell.addEventListener('mouseup', (e) => {
      if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
        // Apply pencil marks to all selected cells
        selectedCells.forEach(selectedCell => {
          addPencilMark(selectedCell, longPressNumber);
        });
        
        // Clear drag selection
        clearDragSelection();
        isDragging = false;
        dragStartCell = null;
      }
    });
    
    cell.addEventListener('touchend', (e) => {
      if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
        // Apply pencil marks to all selected cells
        selectedCells.forEach(selectedCell => {
          addPencilMark(selectedCell, longPressNumber);
        });
        
        // Clear drag selection
        clearDragSelection();
        isDragging = false;
        dragStartCell = null;
        
        e.preventDefault();
      }
    });
    
    input.addEventListener('input', () => {
      const oldValue = input.value;
      if (gridSize === 16) {
        input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
      } else {
        input.value = input.value.replace(/[^1-9]/g, '').slice(0, 1);
      }
      
      // Save move to history if value changed
      if (window.saveMove && oldValue !== input.value) {
        window.saveMove(i, oldValue, input.value);
      }
      
      const b = getBoardValues();
      
      // Validate conflicts first
      validateConflicts(b);
      
      // Only clear number highlights if there are no conflicts
      const hasConflicts = document.querySelectorAll('.cell.conflict').length > 0;
      if (!hasConflicts) {
        clearNumberHighlights();
      }
      
      setStatus(b.some(v=>!v) ? 'Fill all cells with digits 1–' + gridSize : '');
    });
    if (!puzzle[i]) {
      const notes = createNotesElement('compact');
      cell.appendChild(notes);
    }
    cell.appendChild(input);
    grid.appendChild(cell);
  }
}

async function submitBoard() {
  const btn = document.getElementById("submit");
  btn.disabled = true; 
  btn.textContent = "Submitting...";
  setStatus("Checking solution...");
  
  const cells = Array.from(document.querySelectorAll('.cell input'));
  const board = cells.map((inp) => {
    const v = (inp.value || '').trim();
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= gridSize ? n : 0;
  });
  
  if (board.some(v => v === 0)) { 
    setStatus('Please fill all cells with digits 1–' + gridSize); 
    btn.disabled = false;
    btn.textContent = "Submit Solution";
    return; 
  }
  
  const okLocal = validateConflicts(board); 
  if (!okLocal) { 
    setStatus('There are conflicts'); 
    btn.disabled = false;
    btn.textContent = "Submit Solution";
    return; 
  }
  
  // Capture completion time immediately when user clicks submit
  const completionTime = getCurrentTime();
  const timeFormatted = formatTime(completionTime);
  const username = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || 'Anonymous';
  
  // Show dynamic congratulations popup immediately
  let puzzleIdDisplay = currentPid;
  if (selectedPuzzleId && gridSize === 16) {
    puzzleIdDisplay = `16x16_${selectedPuzzleId}`;
  }
  
  showDynamicCelebrationPopup({
    time: timeFormatted,
    timeSeconds: completionTime,
    puzzleId: puzzleIdDisplay,
    username: username,
    status: 'submitting'
  });
  
  try {
    // Step 1: Check solution validity
    updateDynamicPopupStatus('validating');
    setStatus("Validating solution...");
    
    // Prepare submission payload with puzzle_id
    const submissionPayload = { board };
    if (selectedPuzzleId && gridSize === 16) {
      submissionPayload.puzzle_id = `16x16_${selectedPuzzleId}`;
    }
    
    const res = await fetch(`${API}/submit`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionPayload)
    });
    
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    
    const data = await res.json();
    if (!data.ok) { 
      updateDynamicPopupStatus('failed', "❌ Invalid: " + (data.error || "Board violates rules"));
      setStatus("❌ Invalid: " + (data.error || "Board violates rules")); 
      tg?.showPopup && tg.showPopup({title:"Invalid", message:"Board violates rules", buttons:[{type:"ok"}]}); 
      btn.disabled = false;
      btn.textContent = "Submit Solution";
      return;
    }
    
    // Step 2: Generate proof
    updateDynamicPopupStatus('generating');
    setStatus("Generating UltraPlonk proof...");
    
    // Generate pid once for this submission
    const submissionPid = selectedPuzzleId && gridSize === 16 ? 
      `16x16_${selectedPuzzleId}_${Date.now()}` : currentPid;
    
    // Prepare check payload with puzzle_id
    const checkPayload = { 
      board: board, 
      pid: submissionPid,
      user_id: tg?.initDataUnsafe?.user?.id || 'anonymous' 
    };
    
    // Set puzzle_id for 16x16 puzzles
    if (selectedPuzzleId && gridSize === 16) {
      checkPayload.puzzle_id = `16x16_${selectedPuzzleId}`;
    }
    
    const checkRes = await fetch(`${API}/check`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(checkPayload) 
    });
    
    if (!checkRes.ok) {
      throw new Error(`Server error: ${checkRes.status}`);
    }
    
    const checkData = await checkRes.json();
    if (!checkData.ok) { 
      setStatus('Server check failed: ' + (checkData.error || '')); 
      btn.disabled = false;
      btn.textContent = "Submit Solution";
      return; 
    }
    
      // Step 3: Submit to zkVerify
  updateDynamicPopupStatus('submitting');
  setStatus("Submitting proof to zkVerify...");
  
  // Create the proper payload format expected by the backend
  const time_sec = completionTime; // Use the same time for both
  const user_id = tg?.initDataUnsafe?.user?.id || 'anonymous';
  
  // Get the nullifier and puzzle commitment from the check response
  const nullifier = checkData.nullifier;
  const puzzle_commitment = checkData.puzzle_commitment;
  
  // Verify solution locally if we have the solution
  if (currentSolution && gridSize === 16) {
    const isCorrect = verifySolutionLocally(board, currentSolution);
    if (!isCorrect) {
      updateDynamicPopupStatus('failed', "❌ Solution is incorrect");
      setStatus("❌ Solution is incorrect"); 
      btn.disabled = false;
      btn.textContent = "Submit Solution";
      return;
    }
  }
    
    const zkRes = await fetch(`${API}/zkverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_inputs: {
          pid: submissionPid,
          time_sec: time_sec,
          nullifier: nullifier,
          puzzle_commitment: puzzle_commitment
        },
        board_csv: board.join(','),
        user_id: user_id,
        server_token: checkData.token,
        puzzle_id: selectedPuzzleId && gridSize === 16 ? `16x16_${selectedPuzzleId}` : '9x9'
      })
    });
    
    if (!zkRes.ok) {
      throw new Error(`zkVerify error: ${zkRes.status}`);
    }
    
    const zkData = await zkRes.json();
    
    // Step 4: Update popup with final result
    updateDynamicPopupStatus('completed', null, zkData);
    
    // Stop timer
    stopTimer();
    
    // Show confetti
    createConfetti();
    
    setStatus("🎉 Congratulations! Solution submitted successfully!");
    
  } catch (error) {
    console.error('Submit error:', error);
    setStatus(`❌ Error: ${error.message || 'Failed to submit'}`);
    tg?.showPopup && tg.showPopup({title:"Error", message:"Failed to submit solution. Please try again.", buttons:[{type:"ok"}]});
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit Solution";
  }
}

// Local solution verification for 16x16 puzzles
function verifySolutionLocally(board, solution) {
  if (!solution || solution.length !== board.length) {
    console.error('Solution verification failed: invalid solution');
    return false;
  }
  
  // Check if board matches solution exactly
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== solution[i]) {
      console.error(`Solution verification failed: mismatch at position ${i}, expected ${solution[i]}, got ${board[i]}`);
      return false;
    }
  }
  
  console.log('Solution verification passed: board matches solution exactly');
  return true;
}

function resetBoard(puzzle) {
  const cells = Array.from(document.querySelectorAll('.cell input'));
  const totalCells = gridSize * gridSize;
  
  for (let i = 0; i < totalCells; i++) {
    if (!puzzle[i]) cells[i].value = '';
  }
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}


function fmt(t){const m=Math.floor(t/60).toString().padStart(2,'0'); const s=(t%60).toString().padStart(2,'0'); return `${m}:${s}`;}

function startTimer(){ 
  startTime = Math.floor(Date.now()/1000); 
  isPaused = false;
  pausedTime = 0;
  clearInterval(timerId); 
  timerId=setInterval(()=>{ 
    if (!isPaused) {
      const t=Math.floor(Date.now()/1000)-startTime-pausedTime; 
      const el=document.getElementById('timer'); 
      if (el) el.textContent=fmt(t); 
    }
  },1000); 
  updatePauseButton();
}

function stopTimer(){ 
  clearInterval(timerId); 
  isPaused = false;
  pausedTime = 0;
  updatePauseButton();
}

function pauseTimer() {
  if (!isPaused) {
    isPaused = true;
    pauseStartTime = Math.floor(Date.now()/1000);
    updatePauseButton();
    showPauseIndicator();
    console.log('Timer paused - Game is still playable!');
  }
}

function resumeTimer() {
  if (isPaused) {
    isPaused = false;
    pausedTime += Math.floor(Date.now()/1000) - pauseStartTime;
    updatePauseButton();
    hidePauseIndicator();
    console.log('Timer resumed');
  }
}

function showPauseIndicator() {
  const indicator = document.getElementById('pauseIndicator');
  if (indicator) {
    indicator.classList.add('show');
    // Auto-hide after 3 seconds
    setTimeout(() => {
      hidePauseIndicator();
    }, 3000);
  }
}

function hidePauseIndicator() {
  const indicator = document.getElementById('pauseIndicator');
  if (indicator) {
    indicator.classList.remove('show');
  }
}

function togglePause() {
  if (isPaused) {
    resumeTimer();
  } else {
    pauseTimer();
  }
  // Provide immediate feedback that the game is still functional
  if (isPaused) {
    setStatus('Timer paused - You can continue solving the puzzle!');
  } else {
    setStatus('Timer resumed - Continue solving!');
  }
}

function updatePauseButton() {
  const pauseBtn = document.getElementById('pauseBtn');
  const metaElement = document.getElementById('meta');
  
  if (pauseBtn) {
    if (isPaused) {
      pauseBtn.textContent = '▶️';
      pauseBtn.classList.add('paused');
      pauseBtn.title = 'Resume Timer';
      if (metaElement) {
        metaElement.classList.add('timer-paused');
      }
    } else {
      pauseBtn.textContent = '⏸️';
      pauseBtn.classList.remove('paused');
      pauseBtn.title = 'Pause Timer';
      if (metaElement) {
        metaElement.classList.remove('timer-paused');
      }
    }
  }
}

function getCurrentTime() {
  if (isPaused) {
    return Math.floor(pauseStartTime) - startTime - pausedTime;
  } else {
    return Math.floor(Date.now()/1000) - startTime - pausedTime;
  }
}

async function sha256Hex(str){ const enc=new TextEncoder().encode(str); const h=await crypto.subtle.digest('SHA-256', enc); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function generateProof(board){ const payload = { pid: currentPid, board, time_sec: getCurrentTime() }; const commitment = await sha256Hex(JSON.stringify(payload)); return { commitment, public_inputs: { pid: currentPid, time_sec: payload.time_sec }, proof: { scheme: "mock", digest: commitment.slice(0,32) } }; }
async function submitToZkVerify(proofObj){ const res = await fetch(`${API}/zkverify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(proofObj) }); return await res.json(); }

// Main menu functionality
function showMainMenu() {
  const mainMenu = document.getElementById('mainMenu');
  const gameInterface = document.getElementById('gameInterface');
  const leaderboardInterface = document.getElementById('leaderboardInterface');
  const puzzleSelectionInterface = document.getElementById('puzzleSelectionInterface');
  const keypad = document.querySelector('.keypad');
  
  // Show main menu with animation
  if (mainMenu) {
    mainMenu.style.display = 'flex';
    setTimeout(() => {
      mainMenu.style.opacity = '1';
    }, 10);
  }
  
  // Hide all other interfaces
  if (gameInterface) {
    gameInterface.classList.remove('active');
    gameInterface.style.opacity = '0';
    setTimeout(() => {
      gameInterface.style.display = 'none';
    }, 300);
  }
  
  if (leaderboardInterface) {
    leaderboardInterface.classList.remove('active');
    leaderboardInterface.style.opacity = '0';
    setTimeout(() => {
      leaderboardInterface.style.display = 'none';
    }, 300);
  }
  
  if (puzzleSelectionInterface) {
    puzzleSelectionInterface.classList.remove('active');
    puzzleSelectionInterface.style.opacity = '0';
    setTimeout(() => {
      puzzleSelectionInterface.style.display = 'none';
    }, 300);
  }
  
  // Hide keypad
  if (keypad) {
    keypad.style.display = 'none';
    keypad.classList.add('hidden');
  }
  
  // Set page title
  document.title = 'ZkSudoku';
  
  stopTimer();
}

function showGameInterface() {
  const mainMenu = document.getElementById('mainMenu');
  const gameInterface = document.getElementById('gameInterface');
  const leaderboardInterface = document.getElementById('leaderboardInterface');
  const puzzleSelectionInterface = document.getElementById('puzzleSelectionInterface');
  const keypad = document.querySelector('.keypad');
  
  // Hide main menu immediately
  if (mainMenu) {
    mainMenu.style.opacity = '0';
    mainMenu.style.display = 'none';
  }
  
  // Show game interface immediately
  if (gameInterface) {
    gameInterface.style.display = 'block';
    gameInterface.style.opacity = '1';
    gameInterface.classList.add('active');
    
    // Apply grid sizing immediately
    setTimeout(() => {
      adjustGridSize();
    }, 50);
  }
  
  // Hide other interfaces
  if (leaderboardInterface) {
    leaderboardInterface.classList.remove('active');
    leaderboardInterface.style.display = 'none';
  }
  
  if (puzzleSelectionInterface) {
    puzzleSelectionInterface.classList.remove('active');
    puzzleSelectionInterface.style.display = 'none';
  }
  
  // Show keypad
  if (keypad) {
    keypad.style.display = 'grid';
    keypad.classList.remove('hidden');
    keypad.style.zIndex = '9999'; // Ensure keypad is on top
    console.log('Keypad shown with z-index 9999');
  } else {
    console.error('Keypad not found when trying to show it!');
  }
  
  // Set page title based on game mode
  document.title = `${currentGameMode === '16x16' ? '16x16 ' : ''}Sudoku - ZkSudoku`;
}

function showLeaderboard() {
  const mainMenu = document.getElementById('mainMenu');
  const gameInterface = document.getElementById('gameInterface');
  const leaderboardInterface = document.getElementById('leaderboardInterface');
  const puzzleSelectionInterface = document.getElementById('puzzleSelectionInterface');
  const keypad = document.querySelector('.keypad');
  
  // Hide main menu immediately
  if (mainMenu) {
    mainMenu.style.opacity = '0';
    mainMenu.style.display = 'none';
  }
  
  // Hide game interface
  if (gameInterface) {
    gameInterface.classList.remove('active');
    gameInterface.style.display = 'none';
  }
  
  // Show leaderboard interface immediately
  if (leaderboardInterface) {
    leaderboardInterface.style.display = 'block';
    leaderboardInterface.style.opacity = '1';
    leaderboardInterface.classList.add('active');
  }
  
  // Hide puzzle selection interface
  if (puzzleSelectionInterface) {
    puzzleSelectionInterface.classList.remove('active');
    puzzleSelectionInterface.style.display = 'none';
  }
  
  // Hide keypad
  if (keypad) {
    keypad.style.display = 'none';
    keypad.classList.add('hidden');
  }
  
  // Set page title
  document.title = 'Leaderboard - ZkSudoku';
  
  loadLeaderboard();
}

function showPuzzleSelectionInterface() {
  const mainMenu = document.getElementById('mainMenu');
  const gameInterface = document.getElementById('gameInterface');
  const leaderboardInterface = document.getElementById('leaderboardInterface');
  const puzzleSelectionInterface = document.getElementById('puzzleSelectionInterface');
  const keypad = document.querySelector('.keypad');
  
  // Hide main menu immediately
  if (mainMenu) {
    mainMenu.style.opacity = '0';
    mainMenu.style.display = 'none';
  }
  
  // Hide game interface
  if (gameInterface) {
    gameInterface.classList.remove('active');
    gameInterface.style.display = 'none';
  }
  
  // Hide leaderboard interface
  if (leaderboardInterface) {
    leaderboardInterface.classList.remove('active');
    leaderboardInterface.style.display = 'none';
  }
  
  // Show puzzle selection interface immediately
  if (puzzleSelectionInterface) {
    puzzleSelectionInterface.style.display = 'block';
    puzzleSelectionInterface.style.opacity = '1';
    puzzleSelectionInterface.classList.add('active');
  }
  
  // Hide keypad
  if (keypad) {
    keypad.style.display = 'none';
    keypad.classList.add('hidden');
  }
  
  // Set page title
  document.title = 'Choose Puzzle - ZkSudoku';
  
  populatePuzzleGrid();
}

function populatePuzzleGrid() {
  const puzzleGrid = document.getElementById('puzzleGrid');
  if (!puzzleGrid) return;
  
  puzzleGrid.innerHTML = '';
  
  // Load puzzle collection
  import('../sudoku-generation/puzzle-16x16-example.js').then(module => {
    const collection = module.puzzle16x16Collection;
    const puzzles = collection.getAllPuzzles();
    
    puzzles.forEach(puzzle => {
      const puzzleCard = createPuzzleCard(puzzle);
      puzzleGrid.appendChild(puzzleCard);
    });
  }).catch(error => {
    console.error('Error loading puzzle collection:', error);
    // Fallback to default puzzle
    const fallbackCard = createPuzzleCard({
      id: 1,
      name: "Default Puzzle",
      puzzle: Array(256).fill(0),
      solution: Array(256).fill(0),
      difficulty: "Medium"
    });
    puzzleGrid.appendChild(fallbackCard);
  });
}

function createPuzzleCard(puzzleData) {
  const card = document.createElement('div');
  card.className = 'puzzle-card';
  card.dataset.puzzleId = puzzleData.id;
  
  // Create puzzle preview (4x4 grid showing first 4x4 cells)
  const preview = createPuzzlePreview(puzzleData.puzzle);
  
  card.innerHTML = `
    <div class="puzzle-number">${puzzleData.id}</div>
    <div class="puzzle-name">${puzzleData.name}</div>
    <div class="puzzle-difficulty ${puzzleData.difficulty.toLowerCase()}">${puzzleData.difficulty}</div>
    ${preview}
    <div class="puzzle-description">Click to start this puzzle</div>
  `;
  
  card.addEventListener('click', () => {
    selectedPuzzleId = puzzleData.id;
    startGame('16x16', puzzleData);
  });
  
  return card;
}

function createPuzzlePreview(puzzle) {
  const preview = document.createElement('div');
  preview.className = 'puzzle-preview';
  
  // Show first 4x4 cells as a preview
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'puzzle-preview-cell';
    
    const value = puzzle[i];
    if (value > 0) {
      cell.textContent = value;
      cell.classList.add('given');
    } else {
      cell.classList.add('empty');
    }
    
    preview.appendChild(cell);
  }
  
  return preview.outerHTML;
}

async function loadLeaderboard(puzzle_id = null) {
  const statusElement = document.getElementById('leaderboardStatus');
  const entriesContainer = document.getElementById('leaderboardEntries');
  
  try {
    statusElement.textContent = 'Loading leaderboard...';
    
    // Use provided puzzle_id or determine from current game state
    if (!puzzle_id) {
      puzzle_id = '9x9';
      if (currentGameMode === '16x16' && selectedPuzzleId) {
        puzzle_id = `16x16_${selectedPuzzleId}`;
      }
    }
    
    // Update the puzzle filter dropdown to match current selection
    const puzzleFilter = document.getElementById('puzzleFilter');
    if (puzzleFilter) {
      puzzleFilter.value = puzzle_id;
    }
    
    const response = await fetch(`${API}/leaderboard?limit=100&puzzle_id=${puzzle_id}`);
    const data = await response.json();
    
    if (data.ok && data.leaderboard) {
      displayLeaderboard(data.leaderboard, puzzle_id);
      statusElement.textContent = `Loaded ${data.count} entries for ${puzzle_id}`;
    } else {
      throw new Error(data.error || 'Failed to load leaderboard');
    }
  } catch (error) {
    console.error('Leaderboard load error:', error);
    statusElement.textContent = 'Failed to load leaderboard';
    entriesContainer.innerHTML = '<div class="leaderboard-entry"><div class="player-col">Error loading leaderboard</div></div>';
  }
}

function displayLeaderboard(entries, puzzle_id = '9x9') {
  const container = document.getElementById('leaderboardEntries');
  const puzzleInfo = document.getElementById('leaderboardPuzzleInfo');
  
  // Update puzzle info
  let puzzleName = '9x9 Sudoku';
  if (puzzle_id === '16x16_1') {
    puzzleName = '16x16 Sudoku - Puzzle 1';
  } else if (puzzle_id === '16x16_2') {
    puzzleName = '16x16 Sudoku - Puzzle 2';
  }
  puzzleInfo.textContent = `Fastest completion times for ${puzzleName} with zkVerify proofs`;
  
  if (!entries || entries.length === 0) {
    container.innerHTML = `<div class="leaderboard-entry"><div class="player-col">No entries yet for ${puzzleName}</div></div>`;
    return;
  }
  
  container.innerHTML = entries.map((entry, index) => {
    const rank = index + 1;
    const timeFormatted = formatTime(entry.score || entry.time_sec || 0);
    const dateFormatted = new Date(entry.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const playerDisplay = entry.address || entry.user_id || 'Anonymous';
    const shortPlayer = playerDisplay.length > 20 
      ? playerDisplay.substring(0, 17) + '...' 
      : playerDisplay;
    
    const proofButton = entry.proof_url || entry.extrinsic_hash 
      ? `<button class="proof-button" onclick="viewProof('${entry.proof_url || `https://zkverify-testnet.subscan.io/extrinsic/${entry.extrinsic_hash}`}')">View Proof</button>`
      : 'No proof';
    
    return `
      <div class="leaderboard-entry">
        <div class="rank-col">#${rank}</div>
        <div class="player-col" title="${playerDisplay}">${shortPlayer}</div>
        <div class="score-col">${timeFormatted}</div>
        <div class="date-col">${dateFormatted}</div>
        <div class="proof-col">${proofButton}</div>
      </div>
    `;
  }).join('');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function viewProof(url) {
  window.open(url, '_blank');
}

async function loadMyBestTime() {
  const statusElement = document.getElementById('leaderboardStatus');
  
  try {
    // Get current user ID from Telegram or use a default
    const userId = tg?.initDataUnsafe?.user?.id || 'anonymous';
    
    const response = await fetch(`${API}/leaderboard/user/${userId}`);
    const data = await response.json();
    
    if (data.ok && data.bestTime) {
      const timeFormatted = formatTime(data.bestTime.score || data.bestTime.time_sec || 0);
      statusElement.textContent = `Your best time: ${timeFormatted}`;
    } else {
      statusElement.textContent = 'No best time recorded yet';
    }
  } catch (error) {
    console.error('Best time load error:', error);
    statusElement.textContent = 'Failed to load your best time';
  }
}

function updateGameTitle() {
  const titles = {
    '16x16': '16x16 Sudoku',
    'logic-lane': 'Logic Lane',
    'killer': 'Killer Sudoku'
  };
  document.getElementById('gameTitle').textContent = titles[currentGameMode] || 'Sudoku';
}

// Add event listeners to a keypad button
function addKeypadEventListeners(btn) {
  // Long press handlers for number buttons (1-9 or 1-16)
  const num = parseInt(btn.dataset.k);
  if ((num >= 1 && num <= 9) || (gridSize === 16 && num >= 10 && num <= 16)) {
    btn.addEventListener('mousedown', (e) => {
      // Reset long press state for new mouse press
      longPressActive = false;
      longPressTimer = setTimeout(() => {
        longPressActive = true;
        longPressNumber = parseInt(btn.dataset.k);
        multiSelectMode = true;
        
        // Visual feedback
        btn.classList.add('long-press-active');
        document.body.classList.add('multi-select-mode');
        
        // Highlight the number on the board
        highlightNumberInstances(longPressNumber);
        
        console.log('Long press activated for number:', longPressNumber);
      }, 500); // 500ms for long press
    });
    
    btn.addEventListener('mouseup', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      // Apply the key immediately for short clicks
      if (!longPressActive) {
        // Apply key immediately without delay for better responsiveness
        applyKey(btn.dataset.k);
      } else {
        // If long press was active, exit multi-select mode
        exitMultiSelectMode();
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      // Reset long press state
      longPressActive = false;
      if (multiSelectMode) {
        exitMultiSelectMode();
      }
    });
    
    // Touch events for mobile
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Reset long press state for new touch
      longPressActive = false;
      longPressTimer = setTimeout(() => {
        longPressActive = true;
        longPressNumber = parseInt(btn.dataset.k);
        multiSelectMode = true;
        
        // Visual feedback
        btn.classList.add('long-press-active');
        document.body.classList.add('multi-select-mode');
        
        // Highlight the number on the board
        highlightNumberInstances(longPressNumber);
        
        console.log('Long press activated for number:', longPressNumber);
      }, 500);
    });
    
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      // Apply the key immediately for short touches
      if (!longPressActive) {
        // Apply key immediately without delay for better responsiveness
        applyKey(btn.dataset.k);
      } else {
        // If long press was active, exit multi-select mode
        exitMultiSelectMode();
      }
    });
    
    // Handle touch cancel
    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      // Reset long press state
      longPressActive = false;
      if (multiSelectMode) {
        exitMultiSelectMode();
      }
    });
  }
}

// Keypad functionality for different grid sizes
function updateKeypadForGridSize() {
  const keypad = document.querySelector('.keypad');
  if (!keypad) return;
  
  // Remove existing 10-16 buttons if they exist
  keypad.querySelectorAll('[data-k="10"], [data-k="11"], [data-k="12"], [data-k="13"], [data-k="14"], [data-k="15"], [data-k="16"]').forEach(btn => btn.remove());
  
  if (gridSize === 16) {
    console.log('Updating keypad for 16x16 puzzle');
    
    // Find the button with data-k="9" to insert after
    const button9 = keypad.querySelector('button[data-k="9"]');
    if (button9) {
      console.log('Found button 9, adding buttons 10-16');
      
      // Insert buttons 10-16 after button 9
      for (let i = 10; i <= 16; i++) {
        const button = document.createElement('button');
        button.className = 'primary';
        button.setAttribute('data-k', String(i));
        button.textContent = String(i);
        
        // Insert after button 9
        button9.parentNode.insertBefore(button, button9.nextSibling);
        console.log('Added button', i);
        
        // Add event listeners to the new button
        addKeypadEventListeners(button);
      }
    } else {
      console.log('Button 9 not found, cannot add buttons 10-16');
    }
    
    // Update keypad CSS for 16x16
    keypad.classList.add('keypad-16x16');
    console.log('Added keypad-16x16 class');
  } else {
    // Remove 16x16 keypad class for 9x9 puzzles
    keypad.classList.remove('keypad-16x16');
    console.log('Removed keypad-16x16 class');
  }
}

async function startGame(mode, selectedPuzzle = null) {
  currentGameMode = mode;
  gridSize = mode === '16x16' ? 16 : 9;
  
  updateGameTitle();
  showGameInterface();
  
  // Load appropriate puzzle based on mode
  let puzzle;
  try {
    if (mode === '16x16') {
      puzzle = await load16x16Puzzle(selectedPuzzle);
      // Store the solution if we have a selected puzzle
      if (selectedPuzzle && selectedPuzzle.solution) {
        currentSolution = selectedPuzzle.solution;
      } else {
        // Load solution from collection
        const puzzleModule = await import('../sudoku-generation/puzzle-16x16-example.js');
        const collection = puzzleModule.puzzle16x16Collection;
        if (selectedPuzzleId) {
          const puzzleData = collection.getPuzzle(selectedPuzzleId);
          currentSolution = puzzleData ? puzzleData.solution : null;
        } else {
          const randomPuzzle = collection.getRandomPuzzle();
          currentSolution = randomPuzzle.solution;
        }
      }
    } else if (mode === 'logic-lane') {
      puzzle = await loadLogicLanePuzzle();
    } else if (mode === 'killer') {
      puzzle = await loadKillerPuzzle();
    } else {
      puzzle = await loadPuzzle(); // Default 9x9
    }
  } catch (error) {
    console.error('Error loading puzzle:', error);
    // Fallback to default puzzle
    puzzle = await loadPuzzle();
  }
  
  createGrid(puzzle);
  updateKeypadForGridSize();
  initializeGame();
  
  // Adjust grid size for mobile devices for all grid sizes
  // Wait for DOM to be ready
  setTimeout(() => {
    adjustGridSize();
  }, 100);
  
  // Also adjust on window resize
  window.removeEventListener('resize', adjustGridSize); // Remove any existing listener first
  window.addEventListener('resize', adjustGridSize);
}

// Puzzle loading functions for different modes
async function load16x16Puzzle(selectedPuzzle = null) {
  try {
    if (selectedPuzzle) {
      // Use the selected puzzle
      console.log('Loading selected 16x16 puzzle:', selectedPuzzle.id);
      return selectedPuzzle.puzzle;
    }
    
    // Load puzzle collection and get a random puzzle
    const puzzleModule = await import('../sudoku-generation/puzzle-16x16-example.js');
    const collection = puzzleModule.puzzle16x16Collection;
    const randomPuzzle = collection.getRandomPuzzle();
    console.log('Loaded random 16x16 puzzle:', randomPuzzle.id);
    return randomPuzzle.puzzle;
  } catch (error) {
    console.error('Error loading 16x16 puzzle:', error);
    // Fallback to simple puzzle
    const puzzle = Array(256).fill(0);
    puzzle[0] = 1;
    puzzle[15] = 16;
    puzzle[240] = 16;
    puzzle[255] = 1;
    return puzzle;
  }
}

async function loadLogicLanePuzzle() {
  try {
    // Use the SudokuGenerator for Logic Lane puzzles (9x9 with special rules)
    console.log('Loading Logic Lane puzzle generator...');
    const module = await import('../sudoku-generation/sudoku-generator.js');
    console.log('Module loaded:', module);
    
    const SudokuGenerator = module.default || module.SudokuGenerator || module;
    console.log('SudokuGenerator class:', SudokuGenerator);
    
    const generator = new SudokuGenerator(3); // 3x3 = 9x9
    console.log('Generator created:', generator);
    
    const result = generator.generate(50, 5); // Remove 50 cells, max 5 seconds
    console.log(`Generated Logic Lane puzzle: removed ${result.removed} cells, remaining ${result.remaining}`);
    return result.puzzle;
  } catch (error) {
    console.error('Error generating Logic Lane puzzle:', error);
    // Fallback to regular puzzle
    return await loadPuzzle();
  }
}

async function loadKillerPuzzle() {
  try {
    // Use the SudokuGenerator for Killer puzzles (9x9 with cage rules)
    console.log('Loading Killer puzzle generator...');
    const module = await import('../sudoku-generation/sudoku-generator.js');
    console.log('Module loaded:', module);
    
    const SudokuGenerator = module.default || module.SudokuGenerator || module;
    console.log('SudokuGenerator class:', SudokuGenerator);
    
    const generator = new SudokuGenerator(3); // 3x3 = 9x9
    console.log('Generator created:', generator);
    
    const result = generator.generate(40, 5); // Remove 40 cells, max 5 seconds
    console.log(`Generated Killer puzzle: removed ${result.removed} cells, remaining ${result.remaining}`);
    return result.puzzle;
  } catch (error) {
    console.error('Error generating Killer puzzle:', error);
    // Fallback to regular puzzle
    return await loadPuzzle();
  }
}

(async () => {
  // Test keypad on page load
  console.log('Page loaded, testing keypad...');
  const keypad = document.querySelector('.keypad');
  console.log('Keypad found on page load:', keypad);
  if (keypad) {
    console.log('Keypad display style:', keypad.style.display);
    console.log('Keypad hidden class:', keypad.classList.contains('hidden'));
    console.log('Keypad computed style:', window.getComputedStyle(keypad).display);
    
    const buttons = document.querySelectorAll('.keypad button[data-k]');
    console.log('Keypad buttons found on page load:', buttons.length);
    
    // Test if we can add event listeners immediately
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('Immediate test: Button ' + btn.dataset.k + ' clicked!');
      });
    });
  } else {
    console.error('Keypad not found on page load!');
  }
  
  // Show main menu by default
  showMainMenu();
  
  // Add event listeners for menu options
  document.querySelectorAll('.menu-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = option.dataset.mode;
      if (mode === '16x16') {
        showPuzzleSelectionInterface();
      } else if (mode) {
        startGame(mode);
      } else if (option.id === 'leaderboardButton') {
        showLeaderboard();
      }
    });
  });
  
  // Add back button functionality
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showMainMenu();
    });
  }
  
  // Add leaderboard back button functionality
  const leaderboardBackButton = document.getElementById('leaderboardBackButton');
  if (leaderboardBackButton) {
    leaderboardBackButton.addEventListener('click', () => {
      showMainMenu();
    });
  }
  
  // Add puzzle selection back button functionality
  const puzzleSelectionBackButton = document.getElementById('puzzleSelectionBackButton');
  if (puzzleSelectionBackButton) {
    puzzleSelectionBackButton.addEventListener('click', () => {
      showMainMenu();
    });
  }
  
  // Add leaderboard control buttons
  const refreshLeaderboardBtn = document.getElementById('refreshLeaderboard');
  if (refreshLeaderboardBtn) {
    refreshLeaderboardBtn.addEventListener('click', () => {
      loadLeaderboard();
    });
  }
  
  const myBestTimeBtn = document.getElementById('myBestTime');
  if (myBestTimeBtn) {
    myBestTimeBtn.addEventListener('click', () => {
      loadMyBestTime();
    });
  }
  
  // Add puzzle filter event listener
  const puzzleFilter = document.getElementById('puzzleFilter');
  if (puzzleFilter) {
    puzzleFilter.addEventListener('change', (e) => {
      const selectedPuzzleId = e.target.value;
      loadLeaderboard(selectedPuzzleId);
    });
  }
  
  // Initialize settings visibility
  updateTimerVisibility();
  
  // Set up all event listeners after the grid is created
  const submitBtn = document.getElementById('submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitBoard);
  }
  
  // Keypad event listeners will be set up when the keypad is shown
  
  // Toggle buttons
  const toggleNotesBtn = document.getElementById('toggleNotes');
  toggleNotesBtn.addEventListener('click', () => { 
    notesMode = !notesMode; 
    toggleNotesBtn.classList.toggle('active', notesMode);
    console.log('Notes mode:', notesMode ? 'ON' : 'OFF');
  });
  
  // Settings and hint buttons
  const settingsBtn = document.getElementById('settingsBtn');
  settingsBtn.addEventListener('click', () => {
    showSettingsModal();
  });
  
  const hintBtn = document.getElementById('hintBtn');
  hintBtn.addEventListener('click', () => {
    showHintModal();
  });
  
  // Pause button functionality
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      togglePause();
    });
  }
  
  const kbBtn = document.getElementById('toggleKeyboard');
  kbBtn.addEventListener('click', () => { 
    keyboardEnabled = !keyboardEnabled; 
    kbBtn.classList.toggle('active', keyboardEnabled);
    console.log('Keyboard mode:', keyboardEnabled ? 'ON' : 'OFF');
  });
  
  // Notes layout toggle
  const toggleNotesLayoutBtn = document.getElementById('toggleNotesLayout');
  toggleNotesLayoutBtn.addEventListener('click', () => {
    console.log('Notes layout button clicked, current mode:', notesLayoutSelectionMode);
    
    // Toggle selection mode
    notesLayoutSelectionMode = !notesLayoutSelectionMode;
    window.notesLayoutSelectionMode = notesLayoutSelectionMode;
    
    if (notesLayoutSelectionMode) {
      // Enter selection mode
      toggleNotesLayoutBtn.classList.add('active');
      document.body.classList.add('layout-selection-mode');
      console.log('Entered notes layout selection mode, notesLayoutSelectionMode =', notesLayoutSelectionMode);
      console.log('Button classes after adding active:', toggleNotesLayoutBtn.className);
    } else {
      // Exit selection mode
      toggleNotesLayoutBtn.classList.remove('active');
      document.body.classList.remove('layout-selection-mode');
      console.log('Exited notes layout selection mode, notesLayoutSelectionMode =', notesLayoutSelectionMode);
      console.log('Button classes after removing active:', toggleNotesLayoutBtn.className);
    }
  });
  
  // Undo/Redo functionality
  let moveHistory = [];
  let currentMoveIndex = -1;
  
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  // Make saveMove global
  window.saveMove = function(cellIndex, oldValue, newValue) {
    // Remove any moves after current position
    moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
    
    // Add new move
    moveHistory.push({ cellIndex, oldValue, newValue });
    currentMoveIndex++;
    
    // Update button states
    updateUndoRedoButtons();
  };
  
  function updateUndoRedoButtons() {
    undoBtn.disabled = currentMoveIndex < 0;
    redoBtn.disabled = currentMoveIndex >= moveHistory.length - 1;
  }
  
  undoBtn.addEventListener('click', () => {
    if (currentMoveIndex >= 0) {
      const move = moveHistory[currentMoveIndex];
      const cells = Array.from(document.querySelectorAll('.cell'));
      const cell = cells[move.cellIndex];
      const input = cell.querySelector('input');
      
      // Check if this is a note change or a value change
      if (move.oldValue === 'hidden' || move.oldValue === 'visible') {
        // This is a note change
        const noteSpans = cell.querySelectorAll('.notes span');
        if (noteSpans.length > 0) {
          // Find which note this was (we need to determine this from the move)
          // For now, we'll just restore the visibility
          noteSpans.forEach(span => {
            if (span.style.visibility === move.newValue) {
              span.style.visibility = move.oldValue;
            }
          });
        }
      } else {
        // This is a value change
        input.value = move.oldValue;
        
        // Clear notes when applying a value (for redo)
        if (move.newValue && move.newValue !== '') {
          const notes = cell.querySelector('.notes');
          if (notes) {
            notes.querySelectorAll('span').forEach(span => {
              span.style.visibility = 'hidden';
            });
            sortNotesByLayout(notes);
          }
        }
      }
      
      // Update board state
      const b = getBoardValues();
      validateConflicts(b);
      setStatus(b.some(v=>!v)?'Fill all cells with digits 1–' + gridSize : '');
      
      // Exit notes layout selection mode
      exitNotesLayoutSelectionMode();
      
      currentMoveIndex--;
      updateUndoRedoButtons();
    }
  });
  
  redoBtn.addEventListener('click', () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      currentMoveIndex++;
      const move = moveHistory[currentMoveIndex];
      const cells = Array.from(document.querySelectorAll('.cell'));
      const cell = cells[move.cellIndex];
      const input = cell.querySelector('input');
      
      // Check if this is a note change or a value change
      if (move.newValue === 'hidden' || move.newValue === 'visible') {
        // This is a note change
        const noteSpans = cell.querySelectorAll('.notes span');
        if (noteSpans.length > 0) {
          // Find which note this was and apply the change
          noteSpans.forEach(span => {
            if (span.style.visibility === move.oldValue) {
              span.style.visibility = move.newValue;
            }
          });
        }
      } else {
        // This is a value change
        input.value = move.newValue;
        
        // Clear notes when applying a value (for redo)
        if (move.newValue && move.newValue !== '') {
          const notes = cell.querySelector('.notes');
          if (notes) {
            notes.querySelectorAll('span').forEach(span => {
              span.style.visibility = 'hidden';
            });
            sortNotesByLayout(notes);
          }
        }
      }
      
      // Update board state
      const b = getBoardValues();
      validateConflicts(b);
      setStatus(b.some(v=>!v)?'Fill all cells with digits 1–' + gridSize:'');
      
      // Exit notes layout selection mode
      exitNotesLayoutSelectionMode();
      
      updateUndoRedoButtons();
    }
  });
  
  // Initialize undo/redo buttons
  updateUndoRedoButtons();
  
  // Add direct event listener for Clear button with long press functionality
  const clearBtn = document.querySelector('button[data-k="C"]');
  if (clearBtn) {
    // Mouse events for desktop
    clearBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Reset long press state
      clearLongPressActive = false;
      clearLongPressTimer = setTimeout(() => {
        clearLongPressActive = true;
        clearBtn.classList.add('long-press-active');
        showClearOptionsModal();
        console.log('Clear button long press activated');
      }, 500); // 500ms for long press
    });
    
    clearBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (clearLongPressTimer) {
        clearTimeout(clearLongPressTimer);
        clearLongPressTimer = null;
      }
      
      // Apply clear immediately for short clicks
      if (!clearLongPressActive && selectedIndex >= 0) {
        applyKey('C');
      }
      
      clearLongPressActive = false;
      clearBtn.classList.remove('long-press-active');
    });
    
    clearBtn.addEventListener('mouseleave', (e) => {
      if (clearLongPressTimer) {
        clearTimeout(clearLongPressTimer);
        clearLongPressTimer = null;
      }
      clearLongPressActive = false;
      clearBtn.classList.remove('long-press-active');
    });
    
    // Touch events for mobile
    clearBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Reset long press state
      clearLongPressActive = false;
      clearLongPressTimer = setTimeout(() => {
        clearLongPressActive = true;
        clearBtn.classList.add('long-press-active');
        showClearOptionsModal();
        console.log('Clear button long press activated (touch)');
      }, 500);
    });
    
    clearBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (clearLongPressTimer) {
        clearTimeout(clearLongPressTimer);
        clearLongPressTimer = null;
      }
      
      // Apply clear immediately for short touches
      if (!clearLongPressActive && selectedIndex >= 0) {
        applyKey('C');
      }
      
      clearLongPressActive = false;
      clearBtn.classList.remove('long-press-active');
    });
    
    clearBtn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (clearLongPressTimer) {
        clearTimeout(clearLongPressTimer);
        clearLongPressTimer = null;
      }
      clearLongPressActive = false;
      clearBtn.classList.remove('long-press-active');
    });
  }
  
  // Other buttons
  // Removed old proof generation and submission event listeners
  // Now handled automatically in submitBoard function
  
  document.getElementById('reset').addEventListener('click', () => { 
    resetBoard(puzzle); 
    startTimer(); 
    lastProof=null; 
    
    // Clear move history
    moveHistory = [];
    currentMoveIndex = -1;
    updateUndoRedoButtons();
    
    // Exit notes layout selection mode
    exitNotesLayoutSelectionMode();
    
    // Reset status
    setStatus('Fill all cells with digits 1–' + gridSize);
  });
  
  document.getElementById('solve').addEventListener('click', async ()=>{
    const cells = Array.from(document.querySelectorAll('.cell input'));
    const cellElements = Array.from(document.querySelectorAll('.cell'));
    
    let solution;
    
    if (gridSize === 16 && currentSolution) {
      // Use the current solution for 16x16 puzzles
      solution = currentSolution;
      console.log('Using current solution for 16x16 puzzle');
    } else {
      // Fallback to API for other puzzle types
      try {
        const res = await fetch('/api/solution'); 
        const data = await res.json();
        solution = data.solution;
      } catch (error) {
        console.error('Error fetching solution:', error);
        setStatus('Error loading solution');
        return;
      }
    }
    
    const totalCells = gridSize * gridSize;
    
    for (let i = 0; i < totalCells; i++){ 
      if (solution && solution[i] !== undefined) {
        cells[i].value = String(solution[i]); 
        
        // Clear notes from each cell when filling with solution
        const cell = cellElements[i];
        const notes = cell.querySelector('.notes');
        if (notes) {
          notes.querySelectorAll('span').forEach(span => {
            span.style.visibility = 'hidden';
          });
          sortNotesByLayout(notes);
        }
      }
    }
    
    const b = getBoardValues(); 
    validateConflicts(b); 
    setStatus('Filled solution for testing'); 
    clearNumberHighlights();
    clearRowColumnBoxHighlights();
    exitNotesLayoutSelectionMode();
    document.getElementById('status').scrollIntoView({behavior:'smooth'});
    
    // Clear move history
    moveHistory = [];
    currentMoveIndex = -1;
    updateUndoRedoButtons();
  });
  
  const padBtn = document.getElementById("togglePad");
  padBtn?.addEventListener("click", ()=>{ 
    const k = document.querySelector(".keypad"); 
    if (!k) return; 
    
    if (k.classList.contains("hidden")) {
      k.classList.remove("hidden");
      k.style.display = "grid";
      padBtn.textContent = "Hide Keypad";
    } else {
      k.classList.add("hidden");
      k.style.display = "none";
      padBtn.textContent = "Show Keypad";
    }
  });
  
  tg?.expand && tg.expand();
  startTimer();
  
  // Add global event listeners for multi-select mode
  document.addEventListener('click', (e) => {
    // Exit multi-select mode if clicking outside cells and keypad
    if (multiSelectMode && !e.target.closest('.cell') && !e.target.closest('.keypad')) {
      exitMultiSelectMode();
    }
  });
  
  // Global mouse event handlers for drag selection
  document.addEventListener('mouseup', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  document.addEventListener('mouseleave', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  // Global touch handlers for mobile
  document.addEventListener('touchmove', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      e.preventDefault();
    }
  });
  
  document.addEventListener('touchend', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  document.addEventListener('keydown', (e) => {
    // Exit multi-select mode on Escape key
    if (e.key === 'Escape' && multiSelectMode) {
      exitMultiSelectMode();
    }
    
    // Exit notes layout selection mode on Escape key
    if (e.key === 'Escape' && notesLayoutSelectionMode) {
      exitNotesLayoutSelectionMode();
    }
    
    // Close clear options modal on Escape key
    if (e.key === 'Escape' && document.getElementById('clearOptionsModal')) {
      hideClearOptionsModal();
    }
    
    // Close settings modal on Escape key
    if (e.key === 'Escape' && document.getElementById('settingsModal')) {
      hideSettingsModal();
    }
    
    // Close hint modal on Escape key
    if (e.key === 'Escape' && document.getElementById('hintModal')) {
      hideHintModal();
    }
    
    // Handle number keys when keyboard mode is enabled
    if (keyboardEnabled && selectedIndex >= 0) {
      const maxKey = gridSize === 16 ? '16' : '9';
      if (e.key >= '1' && e.key <= maxKey) {
        e.preventDefault();
        applyKey(e.key);
      }
    }
    
    // Handle backspace/delete for clear
    if (keyboardEnabled && selectedIndex >= 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      applyKey('C');
    }
  });
  
  // Exit multi-select mode when clicking on non-number keypad buttons
  document.querySelectorAll('.keypad button').forEach(btn => {
    if (!btn.dataset.k || btn.dataset.k === 'C') {
      btn.addEventListener('click', () => {
        if (multiSelectMode) {
          exitMultiSelectMode();
        }
        // Exit notes layout selection mode (but not for layout toggle button)
        if (btn.id !== 'toggleNotesLayout') {
          exitNotesLayoutSelectionMode();
        }
      });
    }
  });
})();


function getBoardValues() {
  const cells = Array.from(document.querySelectorAll('.cell input'));
  return cells.map((inp) => {
    const v = (inp.value || '').trim();
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= gridSize ? n : 0;
  });
}

function validateConflicts(board) {
  // Clear conflicts
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('conflict'));
  const mark = (r,c) => document.querySelectorAll('.cell')[r*gridSize+c].classList.add('conflict');
  let ok = true;
  
  // rows
  for (let r=0; r<gridSize; r++){
    const seen = new Map();
    for (let c=0; c<gridSize; c++){
      const v = board[r*gridSize+c];
      if (!v) continue;
      if (seen.has(v)) { mark(r,c); mark(r,seen.get(v)); ok=false; }
      else seen.set(v,c);
    }
  }
  
  // cols
  for (let c=0; c<gridSize; c++){
    const seen = new Map();
    for (let r=0; r<gridSize; r++){
      const v = board[r*gridSize+c];
      if (!v) continue;
      if (seen.has(v)) { mark(r,c); mark(seen.get(v),c); ok=false; }
      else seen.set(v,r);
    }
  }
  
  // boxes (3x3 for 9x9, 4x4 for 16x16)
  const boxSize = gridSize === 16 ? 4 : 3;
  for (let br=0; br<boxSize; br++) for (let bc=0; bc<boxSize; bc++){
    const seen = new Map();
    for (let r=0; r<boxSize; r++) for (let c=0; c<boxSize; c++){
      const rr = br*boxSize+r, cc = bc*boxSize+c; const v = board[rr*gridSize+cc];
      if (!v) continue;
      const key = v;
      if (seen.has(key)) { const [r2,c2]=seen.get(key); mark(rr,cc); mark(r2,c2); ok=false; }
      else seen.set(key,[rr,cc]);
    }
  }
  return ok;
}

// Prevent double execution
let isApplyingKey = false;
let lastAppliedKey = null;
let lastAppliedTime = 0;

function applyKey(k){
  // Prevent double execution
  if (isApplyingKey) {
    console.log('applyKey already running, skipping:', k);
    return;
  }
  
  // Additional debounce protection
  const now = performance.now();
  if (lastAppliedKey === k && now - lastAppliedTime < 150) {
    console.log('applyKey debounced, skipping:', k);
    return;
  }
  
  isApplyingKey = true;
  lastAppliedKey = k;
  lastAppliedTime = now;
  console.log('applyKey called with:', k); // Debug log
  
  // Always highlight the number when clicking on keypad buttons (1-9 or 1-16)
  const num = parseInt(k);
  if ((num >= 1 && num <= 9) || (gridSize === 16 && num >= 10 && num <= 16)) {
    highlightNumberInstances(num);
  }
  
  // If no cell is selected, just highlight the number and return
  if (selectedIndex < 0) {
    console.log('No cell selected, just highlighting number'); // Debug log
    isApplyingKey = false;
    return;
  }
  
  const cells = Array.from(document.querySelectorAll('.cell'));
  const cell = cells[selectedIndex];
  const input = cell.querySelector('input');
  
  if (k === 'C') { 
    const oldValue = input.value;
    input.value=''; 
    if (cell.querySelector('.notes')) {
      cell.querySelectorAll('.notes span').forEach(e=>e.style.visibility='hidden');
      // Sort notes after clearing
      sortNotesByLayout(cell.querySelector('.notes'));
    }
    
    // Save move to history
    if (window.saveMove) {
      window.saveMove(selectedIndex, oldValue, '');
    }
    
    const b=getBoardValues(); 
    validateConflicts(b); 
    setStatus(b.some(v=>!v)?`Fill all cells with digits 1–${gridSize}`:''); 
    clearNumberHighlights();
    isApplyingKey = false;
    return; 
  }
  
  if (notesMode) {
    console.log('Notes mode active, processing key:', k);
    
    // Check if we have selected cells for multi-select
    if (selectedCells.size > 0) {
      // Add note to all selected cells
      addPencilMarkToSelectedCells(parseInt(k));
      console.log('Added note', k, 'to', selectedCells.size, 'selected cells');
    } else {
      // Ensure notes element exists
      let notes = cell.querySelector('.notes');
      if (!notes) {
        console.log('Creating new notes element for cell');
        notes = createNotesElement('compact');
        cell.appendChild(notes);
      }
      
      // Add note to single cell using the dedicated function
      addPencilMark(cell, parseInt(k));
      
      // Save move to history for notes (we'll track the visibility change)
      if (window.saveMove) {
        const noteSpan = cell.querySelector(`.notes span[data-number="${k}"]`);
        if (noteSpan) {
          const visibility = noteSpan.style.visibility;
          window.saveMove(selectedIndex, visibility === 'visible' ? 'hidden' : 'visible', visibility);
        }
      }
      
      console.log('Added/removed note', k, 'to cell', selectedIndex);
    }
    
    // Reset flag immediately for notes to allow quick subsequent additions
    if (window.requestIdleCallback) {
      requestIdleCallback(() => {
        isApplyingKey = false;
      });
    } else {
      requestAnimationFrame(() => {
        isApplyingKey = false;
      });
    }
  } else {
    const oldValue = input.value;
    input.value = String(k);
    
    // Clear all notes from this cell when applying a number
    const notes = cell.querySelector('.notes');
    if (notes) {
      notes.querySelectorAll('span').forEach(span => {
        span.style.visibility = 'hidden';
      });
      // Sort notes after clearing
      sortNotesByLayout(notes);
    }
    
    // Save move to history
    if (window.saveMove) {
      window.saveMove(selectedIndex, oldValue, String(k));
    }
    
    const b = getBoardValues(); 
    
    // Validate conflicts first and ensure they take priority
    validateConflicts(b); 
    
    // Then highlight the number (conflicts will still show due to CSS specificity)
    highlightNumberInstances(parseInt(k));
    
    setStatus(b.some(v=>!v)?`Fill all cells with digits 1–${gridSize}`:'');
    
    console.log('Applied key', k, 'to cell', selectedIndex, 'and cleared notes'); // Debug log
  }
  
  // Reset the flag to allow next execution (only for non-notes mode)
  if (!notesMode) {
    requestAnimationFrame(() => {
      isApplyingKey = false;
    });
  }
}

async function noirProof(board, givens_mask, givens_values, pid, puzzle_commitment, nullifier, time_sec){
  try {
    const mod = await import("https://esm.sh/@noir-lang/noir_js@latest");
    const { Noir, BarretenbergBackend } = mod;
    const circResp = await fetch("/artifacts/sudoku.json");
    if (!circResp.ok) throw new Error("no artifacts");
    const program = await circResp.json();
    const backend = await BarretenbergBackend.new(program);
    const noir = new Noir(program, backend);
    const toField=(v)=> (typeof v==='bigint'? v: BigInt(v)); const hexToField=(h)=> BigInt('0x'+String(h||0).replace(/^0x/,'')); const arr=(a)=> a.map(n=> toField(n)); const input={ pid: toField(pid), puzzle_commitment: hexToField(puzzle_commitment), nullifier: hexToField(nullifier), time_sec: toField(time_sec), board: arr(board), givens_mask: arr(givens_mask), givens_values: arr(givens_values) };
    const proof = await noir.generateProof(input);
    return { proof_bytes: proof.proof, public_inputs: { pid, puzzle_commitment, nullifier, time_sec } };
  } catch (e) {
    console.warn("noir_js fallback:", e);
    return { proof_bytes: new Uint8Array([85,76,80,49,7,7,7,7]), public_inputs: { pid, puzzle_commitment, nullifier, time_sec } };
  }
}

// Clear options modal functionality
function createClearOptionsModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('clearOptionsModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'clearOptionsModal';
  modal.className = 'clear-modal-overlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'clear-modal-content';
  
  const title = document.createElement('h3');
  title.textContent = 'Clear';
  title.className = 'clear-modal-title';
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'clear-options-container';
  
  const options = [
    { id: 'pencilMarks', label: 'Pencil Marks', checked: false },
    { id: 'highlights', label: 'Highlights', checked: false },
    { id: 'xSymbols', label: 'X Symbols', checked: false },
    { id: 'digits', label: 'Digits', checked: false },
    { id: 'all', label: 'All', checked: false }
  ];
  
  options.forEach(option => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'clear-option';
    
    const label = document.createElement('span');
    label.textContent = option.label;
    label.className = 'clear-option-label';
    
    const toggle = document.createElement('div');
    toggle.className = 'clear-toggle';
    toggle.innerHTML = '<div class="toggle-slider"></div>';
    
    if (option.checked) {
      toggle.classList.add('active');
    }
    
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      option.checked = toggle.classList.contains('active');
    });
    
    optionDiv.appendChild(label);
    optionDiv.appendChild(toggle);
    optionsContainer.appendChild(optionDiv);
  });
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'clear-modal-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'clear-modal-btn cancel';
  cancelBtn.addEventListener('click', () => {
    hideClearOptionsModal();
  });
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.className = 'clear-modal-btn ok';
  okBtn.addEventListener('click', () => {
    executeClearOptions();
    hideClearOptionsModal();
  });
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(okBtn);
  
  modalContent.appendChild(title);
  modalContent.appendChild(optionsContainer);
  modalContent.appendChild(buttonContainer);
  modal.appendChild(modalContent);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideClearOptionsModal();
    }
  });
  
  document.body.appendChild(modal);
  
  // Add CSS styles
  addClearModalStyles();
}

function addClearModalStyles() {
  if (document.getElementById('clearModalStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'clearModalStyles';
  style.textContent = `
    .clear-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    
    .clear-modal-content {
      background: var(--cell);
      border-radius: 16px;
      padding: 24px;
      max-width: 320px;
      width: 90%;
      box-shadow: 0 8px 32px var(--shadow);
      border: 1px solid var(--border);
    }
    
    .clear-modal-title {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      text-align: center;
    }
    
    .clear-options-container {
      margin-bottom: 24px;
    }
    
    .clear-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    
    .clear-option:last-child {
      border-bottom: none;
    }
    
    .clear-option-label {
      font-size: 16px;
      color: var(--text);
      font-weight: 500;
    }
    
    .clear-toggle {
      width: 44px;
      height: 24px;
      background: var(--button-secondary);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .clear-toggle.active {
      background: var(--accent);
    }
    
    .toggle-slider {
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .clear-toggle.active .toggle-slider {
      transform: translateX(20px);
    }
    
    .clear-modal-buttons {
      display: flex;
      gap: 12px;
    }
    
    .clear-modal-btn {
      flex: 1;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    
    .clear-modal-btn.cancel {
      background: var(--button-secondary);
      color: var(--text);
    }
    
    .clear-modal-btn.ok {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    
    .clear-modal-btn:hover {
      transform: translateY(-1px);
    }
    
    .clear-modal-btn.cancel:hover {
      background: var(--border);
    }
    
    .clear-modal-btn.ok:hover {
      filter: brightness(0.9);
    }
    
    /* Clear button long press visual feedback */
    .keypad button[data-k="C"].long-press-active {
      background: var(--accent) !important;
      color: white !important;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }
    
    .keypad button[data-k="C"].long-press-active svg {
      stroke: white;
    }
  `;
  
  document.head.appendChild(style);
}

function showClearOptionsModal() {
  createClearOptionsModal();
  const modal = document.getElementById('clearOptionsModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideClearOptionsModal() {
  const modal = document.getElementById('clearOptionsModal');
  if (modal) {
    modal.remove();
  }
}

function executeClearOptions() {
  const modal = document.getElementById('clearOptionsModal');
  if (!modal) return;
  
  // Get all toggle elements and check their state
  const toggles = modal.querySelectorAll('.clear-toggle');
  const options = {
    pencilMarks: toggles[0]?.classList.contains('active') || false,
    highlights: toggles[1]?.classList.contains('active') || false,
    xSymbols: toggles[2]?.classList.contains('active') || false,
    digits: toggles[3]?.classList.contains('active') || false,
    all: toggles[4]?.classList.contains('active') || false
  };
  
  if (options.all) {
    // Clear everything
    clearAllContent();
  } else {
    // Clear specific content types
    if (options.pencilMarks) clearPencilMarks();
    if (options.highlights) clearHighlights();
    if (options.xSymbols) clearXSymbols();
    if (options.digits) clearDigits();
  }
}

function clearAllContent() {
  clearPencilMarks();
  clearHighlights();
  clearXSymbols();
  clearDigits();
}

function clearPencilMarks() {
  document.querySelectorAll('.notes span').forEach(span => {
    span.style.visibility = 'hidden';
  });
  
  // Update notes layout after clearing
  document.querySelectorAll('.notes').forEach(notes => {
    sortNotesByLayout(notes);
  });
}

function clearHighlights() {
  clearNumberHighlights();
  clearRowColumnBoxHighlights();
}

function clearXSymbols() {
  // For now, X symbols are not implemented, but this function is ready for future use
  console.log('Clearing X symbols (not implemented yet)');
}

function clearDigits() {
  const cells = Array.from(document.querySelectorAll('.cell'));
  cells.forEach((cell, index) => {
    const input = cell.querySelector('input');
    if (input && !cell.classList.contains('given')) {
      const oldValue = input.value;
      input.value = '';
      
      // Save move to history
      if (window.saveMove) {
        window.saveMove(index, oldValue, '');
      }
    }
  });
  
  // Update board state
  const b = getBoardValues();
  validateConflicts(b);
  setStatus(b.some(v=>!v)?'Fill all cells with digits 1–' + gridSize:'');
}

// Settings modal functionality
function createSettingsModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('settingsModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'settingsModal';
  modal.className = 'settings-modal-overlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'settings-modal-content';
  
  const header = document.createElement('div');
  header.className = 'settings-header';
  
  const backBtn = document.createElement('button');
  backBtn.className = 'settings-back-btn';
  backBtn.innerHTML = '←';
  backBtn.addEventListener('click', () => {
    hideSettingsModal();
  });
  
  const title = document.createElement('h3');
  title.className = 'settings-title';
  title.textContent = 'Game Settings';
  
  header.appendChild(backBtn);
  header.appendChild(title);
  
  const content = document.createElement('div');
  
  // Show Timer
  const showTimerSection = createToggleOption('Show Timer', gameSettings.showTimer, (value) => {
    gameSettings.showTimer = value;
    updateTimerVisibility();
  });
  
  // Auto Check for Errors
  const autoCheckSection = createRadioOption('Auto Check for Errors', [
    { value: 'always', label: 'Always' },
    { value: 'onRuleViolation', label: 'On Rule Violation' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'never', label: 'Never' }
  ], gameSettings.autoCheckErrors, (value) => {
    gameSettings.autoCheckErrors = value;
  });
  
  // Highlight Matching Numbers
  const highlightNumbersSection = createToggleOption('Highlight Matching Numbers', gameSettings.highlightMatchingNumbers, (value) => {
    gameSettings.highlightMatchingNumbers = value;
  });
  
  // Highlight Restricted Areas
  const highlightAreasSection = createToggleOption('Highlight Restricted Areas', gameSettings.highlightRestrictedAreas, (value) => {
    gameSettings.highlightRestrictedAreas = value;
  });
  
  // Highlight Matching Pencil Marks
  const highlightPencilMarksSection = createToggleOption('Highlight Matching Pencil Marks', gameSettings.highlightMatchingPencilMarks, (value) => {
    gameSettings.highlightMatchingPencilMarks = value;
  });
  
  // Auto Remove Pencil Marks
  const autoRemovePencilMarksSection = createToggleOption('Auto Remove Pencil Marks', gameSettings.autoRemovePencilMarks, (value) => {
    gameSettings.autoRemovePencilMarks = value;
  });
  
  // Long Press for Multi Select
  const longPressSection = createToggleOption('Long Press for Multi Select', gameSettings.longPressForMultiSelect, (value) => {
    gameSettings.longPressForMultiSelect = value;
  });
  
  content.appendChild(showTimerSection);
  content.appendChild(autoCheckSection);
  content.appendChild(highlightNumbersSection);
  content.appendChild(highlightAreasSection);
  content.appendChild(highlightPencilMarksSection);
  content.appendChild(autoRemovePencilMarksSection);
  content.appendChild(longPressSection);
  
  modalContent.appendChild(header);
  modalContent.appendChild(content);
  modal.appendChild(modalContent);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideSettingsModal();
    }
  });
  
  document.body.appendChild(modal);
}

function createToggleOption(label, value, onChange) {
  const section = document.createElement('div');
  section.className = 'settings-section';
  
  const option = document.createElement('div');
  option.className = 'settings-option';
  
  const labelElement = document.createElement('span');
  labelElement.className = 'settings-option-label';
  labelElement.textContent = label;
  
  const toggle = document.createElement('div');
  toggle.className = `settings-toggle ${value ? 'active' : ''}`;
  toggle.innerHTML = '<div class="settings-toggle-slider"></div>';
  
  toggle.addEventListener('click', () => {
    const newValue = !toggle.classList.contains('active');
    toggle.classList.toggle('active', newValue);
    onChange(newValue);
  });
  
  option.appendChild(labelElement);
  option.appendChild(toggle);
  section.appendChild(option);
  
  return section;
}

function createRadioOption(label, options, currentValue, onChange) {
  const section = document.createElement('div');
  section.className = 'settings-section';
  
  const option = document.createElement('div');
  option.className = 'settings-option';
  
  const labelElement = document.createElement('span');
  labelElement.className = 'settings-option-label';
  labelElement.textContent = label;
  
  const radioGroup = document.createElement('div');
  radioGroup.className = 'settings-radio-group';
  
  options.forEach(optionData => {
    const radioOption = document.createElement('div');
    radioOption.className = 'settings-radio-option';
    
    const radio = document.createElement('div');
    radio.className = `settings-radio ${optionData.value === currentValue ? 'active' : ''}`;
    
    const radioLabel = document.createElement('span');
    radioLabel.className = 'settings-radio-label';
    radioLabel.textContent = optionData.label;
    
    radioOption.addEventListener('click', () => {
      // Remove active class from all radios
      radioGroup.querySelectorAll('.settings-radio').forEach(r => r.classList.remove('active'));
      // Add active class to clicked radio
      radio.classList.add('active');
      onChange(optionData.value);
    });
    
    radioOption.appendChild(radio);
    radioOption.appendChild(radioLabel);
    radioGroup.appendChild(radioOption);
  });
  
  option.appendChild(labelElement);
  option.appendChild(radioGroup);
  section.appendChild(option);
  
  return section;
}

function showSettingsModal() {
  createSettingsModal();
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.remove();
  }
}

function updateTimerVisibility() {
  const timerElement = document.getElementById('timer');
  const metaElement = document.getElementById('meta');
  const pauseBtn = document.getElementById('pauseBtn');
  
  if (timerElement && metaElement) {
    if (gameSettings.showTimer) {
      metaElement.style.display = 'flex';
      if (pauseBtn) {
        pauseBtn.style.display = 'inline-block';
      }
    } else {
      metaElement.style.display = 'none';
      if (pauseBtn) {
        pauseBtn.style.display = 'none';
      }
    }
  }
}

// Confetti animation
function createConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'];
  
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      document.body.appendChild(confetti);
      
      // Remove confetti after animation
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 5000);
    }, i * 50);
  }
}

// Celebration modal
function showCelebrationModal(data) {
  const modal = document.createElement('div');
  modal.className = 'celebration-modal-overlay';
  
  const content = document.createElement('div');
  content.className = 'celebration-modal-content';
  
  const icon = document.createElement('div');
  icon.className = 'celebration-icon';
  icon.textContent = '🎉';
  
  const title = document.createElement('h2');
  title.className = 'celebration-title';
  title.textContent = 'Congratulations!';
  
  const subtitle = document.createElement('p');
  subtitle.className = 'celebration-subtitle';
  subtitle.textContent = `You solved the puzzle, ${data.username}!`;
  
  const stats = document.createElement('div');
  stats.className = 'celebration-stats';
  
  const timeStat = document.createElement('div');
  timeStat.className = 'celebration-stat';
  timeStat.innerHTML = `
    <span class="celebration-stat-label">Completion Time:</span>
    <span class="celebration-stat-value">${data.time}</span>
  `;
  
  const puzzleStat = document.createElement('div');
  puzzleStat.className = 'celebration-stat';
  puzzleStat.innerHTML = `
    <span class="celebration-stat-label">Puzzle ID:</span>
    <span class="celebration-stat-value">#${data.puzzleId}</span>
  `;
  
  const proofStatus = document.createElement('div');
  proofStatus.className = 'celebration-stat';
  
  // Check the actual zkVerify status from the response
  let proofText = '❌ Failed';
  let proofLink = '';
  
  if (data.zkVerifyData.zkVerifyStatus === 'completed' || data.zkVerifyData.zkVerifyStatus === 'success') {
    // Check if we have a proof_url to link to
    if (data.zkVerifyData.proof_url) {
      // Create a separate span for the proof link
      const proofLinkSpan = document.createElement('span');
      proofLinkSpan.className = 'celebration-stat-value';
      
      // Create the actual link element
      const linkElement = document.createElement('a');
      linkElement.href = data.zkVerifyData.proof_url;
      linkElement.target = '_blank';
      linkElement.className = 'proof-link';
      linkElement.textContent = '✅ Submitted';
      
      // Add the link to the span
      proofLinkSpan.appendChild(linkElement);
      
      // Add the label span
      const labelSpan = document.createElement('span');
      labelSpan.className = 'celebration-stat-label';
      labelSpan.textContent = 'zkVerify Proof:';
      
      // Add both spans to the proof status div
      proofStatus.appendChild(labelSpan);
      proofStatus.appendChild(proofLinkSpan);
      
      // Store the link for potential use later
      proofLink = data.zkVerifyData.proof_url;
      
      // Skip the innerHTML setting below since we've built the DOM directly
      return;
    } else {
      proofText = '✅ Submitted';
    }
  } else if (data.zkVerifyData.zkVerifyStatus === 'failed' || data.zkVerifyData.zkVerifyStatus === 'error') {
    proofText = '❌ Failed';
  } else if (data.zkVerifyData.zkVerifyStatus === 'not_configured') {
    proofText = '⚠️ Not Configured';
  } else {
    proofText = '⏳ Processing...';
  }
  
  // Only set innerHTML if we didn't create the link element above
  proofStatus.innerHTML = `
    <span class="celebration-stat-label">zkVerify Proof:</span>
    <span class="celebration-stat-value">${proofText}</span>
  `;
  
  stats.appendChild(timeStat);
  stats.appendChild(puzzleStat);
  stats.appendChild(proofStatus);
  
  const buttons = document.createElement('div');
  buttons.className = 'celebration-buttons';
  
  const leaderboardBtn = document.createElement('button');
  leaderboardBtn.className = 'celebration-btn primary';
  leaderboardBtn.textContent = 'View Leaderboard';
  leaderboardBtn.addEventListener('click', () => {
    hideCelebrationModal();
    showLeaderboard();
  });
  
  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'celebration-btn secondary';
  newGameBtn.textContent = 'New Game';
  newGameBtn.addEventListener('click', () => {
    hideCelebrationModal();
    showMainMenu();
  });
  
  buttons.appendChild(leaderboardBtn);
  buttons.appendChild(newGameBtn);
  
  content.appendChild(icon);
  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(stats);
  content.appendChild(buttons);
  modal.appendChild(content);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideCelebrationModal();
    }
  });
  
  document.body.appendChild(modal);
  
  // Show Telegram popup if available
  if (tg?.showPopup) {
    let message = `🎉 Congratulations! You solved the puzzle in ${data.time}!`;
    
    if (data.zkVerifyData.zkVerifyStatus === 'completed' || data.zkVerifyData.zkVerifyStatus === 'success') {
      message += '\n\nYour proof has been submitted to zkVerify and recorded on the leaderboard.';
    } else if (data.zkVerifyData.zkVerifyStatus === 'failed' || data.zkVerifyData.zkVerifyStatus === 'error') {
      message += '\n\nYour solution has been recorded, but zkVerify proof submission failed.';
    } else {
      message += '\n\nYour solution has been recorded on the leaderboard.';
    }
    
    tg.showPopup({
      title: 'Puzzle Solved!',
      message: message,
      buttons: [{ type: 'ok' }]
    });
  }
}

function hideCelebrationModal() {
  const modal = document.querySelector('.celebration-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Hint functionality
function createHintModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('hintModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'hintModal';
  modal.className = 'hint-modal-overlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'hint-modal-content';
  
  const hintIcon = document.createElement('div');
  hintIcon.className = 'hint-icon';
  hintIcon.innerHTML = '💡';
  
  const title = document.createElement('h3');
  title.className = 'hint-title';
  title.textContent = 'Get a Hint';
  
  const message = document.createElement('p');
  message.className = 'hint-message';
  message.textContent = 'Would you like to reveal one correct answer? This will help you progress in the puzzle.';
  
  const credits = document.createElement('p');
  credits.className = 'hint-credits';
  credits.textContent = `Cost: ${hintCost} credit | Your credits: ${userCredits}`;
  
  const buttons = document.createElement('div');
  buttons.className = 'hint-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'hint-btn cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    hideHintModal();
  });
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'hint-btn confirm';
  confirmBtn.textContent = 'Get Hint';
  confirmBtn.disabled = userCredits < hintCost;
  confirmBtn.addEventListener('click', () => {
    if (userCredits >= hintCost) {
      provideHint();
      hideHintModal();
    }
  });
  
  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);
  
  modalContent.appendChild(hintIcon);
  modalContent.appendChild(title);
  modalContent.appendChild(message);
  modalContent.appendChild(credits);
  modalContent.appendChild(buttons);
  modal.appendChild(modalContent);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideHintModal();
    }
  });
  
  document.body.appendChild(modal);
}

function showHintModal() {
  createHintModal();
  const modal = document.getElementById('hintModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideHintModal() {
  const modal = document.getElementById('hintModal');
  if (modal) {
    modal.remove();
  }
}

function provideHint() {
  if (userCredits < hintCost) {
    return;
  }
  
  // Find an empty cell and fill it with the correct solution
  const cells = Array.from(document.querySelectorAll('.cell'));
  const emptyCells = [];
  
  cells.forEach((cell, index) => {
    const input = cell.querySelector('input');
    if (input && !cell.classList.contains('given') && !input.value.trim()) {
      emptyCells.push({ cell, index });
    }
  });
  
  if (emptyCells.length === 0) {
    setStatus('No empty cells to fill with hint');
    return;
  }
  
  // Get the solution from the server
  fetch('/api/solution')
    .then(response => response.json())
    .then(data => {
      // Pick a random empty cell
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const correctValue = data.solution[randomCell.index];
      
      // Fill the cell with the correct value
      const input = randomCell.cell.querySelector('input');
      const oldValue = input.value;
      input.value = String(correctValue);
      
      // Clear notes from this cell when applying a hint
      const notes = randomCell.cell.querySelector('.notes');
      if (notes) {
        notes.querySelectorAll('span').forEach(span => {
          span.style.visibility = 'hidden';
        });
        sortNotesByLayout(notes);
      }
      
      // Save move to history
      if (window.saveMove) {
        window.saveMove(randomCell.index, oldValue, String(correctValue));
      }
      
      // Update board state
      const b = getBoardValues();
      validateConflicts(b);
      setStatus(b.some(v=>!v)?'Fill all cells with digits 1–' + gridSize:'');
      
      // Deduct credits
      userCredits -= hintCost;
      
      // Show success message
      setStatus(`💡 Hint used! Correct answer revealed. Credits remaining: ${userCredits}`);
      
      // Highlight the cell that was filled
      randomCell.cell.classList.add('hint-highlight');
      setTimeout(() => {
        randomCell.cell.classList.remove('hint-highlight');
      }, 3000);
    })
    .catch(error => {
      console.error('Error getting hint:', error);
      setStatus('❌ Error getting hint. Please try again.');
    });
}

// Add keypad event listeners after the grid is created
// Keypad event listeners will be set up in the main initialization

// Set up keypad event listeners
function setupKeypadEventListeners() {
  console.log('Setting up keypad event listeners...');
  
  // Check if keypad exists
  const keypad = document.querySelector('.keypad');
  if (!keypad) {
    console.error('Keypad not found!');
    return;
  }
  
  console.log('Keypad found:', keypad);
  
  // Check keypad visibility and positioning
  if (keypad) {
    const keypadStyle = window.getComputedStyle(keypad);
    console.log('Keypad display:', keypadStyle.display, 'z-index:', keypadStyle.zIndex);
  }
  
  // Check for keypad buttons
  const buttons = document.querySelectorAll('.keypad button[data-k]');
  console.log('Found keypad buttons:', buttons.length);
  
  // Remove existing event listeners to prevent duplicates
  // Note: We'll skip cloning for now to avoid removing event listeners
  console.log('Setting up event listeners for', buttons.length, 'buttons');
  
  // Keypad event listeners
  document.querySelectorAll('.keypad button[data-k]').forEach(btn => {
    // Add a simple click handler for all buttons
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Keypad button clicked:', btn.dataset.k, btn.textContent);
      // Apply the key when clicked
      applyKey(btn.dataset.k);
    });
    
    // Tool buttons will use click events only for simplicity
    
    // Long press handlers for number buttons (1-9 or 1-16)
    const num = parseInt(btn.dataset.k);
    if ((num >= 1 && num <= 9) || (gridSize === 16 && num >= 10 && num <= 16)) {
      // Mouse events for desktop
      btn.addEventListener('mousedown', (e) => {
        console.log('Keypad button mousedown:', btn.dataset.k);
        // Reset long press state for new mouse press
        longPressActive = false;
        longPressTimer = setTimeout(() => {
          longPressActive = true;
          longPressNumber = parseInt(btn.dataset.k);
          multiSelectMode = true;
          
          // Visual feedback
          btn.classList.add('long-press-active');
          document.body.classList.add('multi-select-mode');
          
          // Highlight the number on the board
          highlightNumberInstances(longPressNumber);
          
          console.log('Long press activated for number:', longPressNumber);
        }, 500); // 500ms for long press
      });
      
      // Note: We'll rely on the click event for immediate response
      // Mouseup is only used for long press detection
      btn.addEventListener('mouseup', (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Only handle long press exit, not immediate key application
        if (longPressActive) {
          exitMultiSelectMode();
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Reset long press state
        longPressActive = false;
        if (multiSelectMode) {
          exitMultiSelectMode();
        }
      });
      
      // Touch events for mobile
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Keypad button touchstart:', btn.dataset.k);
        // Reset long press state for new touch
        longPressActive = false;
        longPressTimer = setTimeout(() => {
          longPressActive = true;
          longPressNumber = parseInt(btn.dataset.k);
          multiSelectMode = true;
          
          // Visual feedback
          btn.classList.add('long-press-active');
          document.body.classList.add('multi-select-mode');
          
          // Highlight the number on the board
          highlightNumberInstances(longPressNumber);
          
          console.log('Long press activated for number:', longPressNumber);
        }, 500);
      });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Keypad button touchend:', btn.dataset.k);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Apply the key immediately for short touches
        if (!longPressActive) {
          // Apply key immediately without delay for better responsiveness
          applyKey(btn.dataset.k);
        } else {
          // If long press was active, exit multi-select mode
          exitMultiSelectMode();
        }
      });
      
      // Handle touch cancel
      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Reset long press state
        longPressActive = false;
        if (multiSelectMode) {
          exitMultiSelectMode();
        }
      });
    }
  });
  
  // Click handler for non-number buttons (Clear, Undo, Redo, etc.)
  document.querySelectorAll('.keypad button[data-k]').forEach(btn => {
    if (btn.dataset.k === 'C' || btn.dataset.k === 'U' || btn.dataset.k === 'R') {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Keypad tool button click:', btn.dataset.k);
        applyKey(btn.dataset.k);
      });
    }
  });
  
  // Add simple touch handlers for tool buttons (mobile support)
  document.querySelectorAll('.keypad button[data-k]').forEach(btn => {
    const num = parseInt(btn.dataset.k);
    // Only add touch handlers for tool buttons (not number buttons, as they already have them)
    if (!((num >= 1 && num <= 9) || (gridSize === 16 && num >= 10 && num <= 16))) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Keypad tool button touchstart:', btn.dataset.k);
      });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Keypad tool button touchend:', btn.dataset.k);
        // Apply the key when touched
        applyKey(btn.dataset.k);
      });
    }
  });
  
  console.log('Keypad event listeners set up successfully');
  
  // Ensure buttons are clickable
  buttons.forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
  });
}

// Add global event listeners for multi-select mode
function setupGlobalEventListeners() {
  document.addEventListener('click', (e) => {
    // Exit multi-select mode if clicking outside cells and keypad
    if (multiSelectMode && !e.target.closest('.cell') && !e.target.closest('.keypad')) {
      exitMultiSelectMode();
    }
  });
  
  // Global mouse event handlers for drag selection
  document.addEventListener('mouseup', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  document.addEventListener('mouseleave', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  // Global touch handlers for mobile
  document.addEventListener('touchmove', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      e.preventDefault();
    }
  });
  
  document.addEventListener('touchend', (e) => {
    if (isDragging && multiSelectMode && longPressActive && longPressNumber) {
      // Apply pencil marks to all selected cells
      selectedCells.forEach(selectedCell => {
        addPencilMark(selectedCell, longPressNumber);
      });
      
      // Clear drag selection
      clearDragSelection();
      isDragging = false;
      dragStartCell = null;
    }
  });
  
  document.addEventListener('keydown', (e) => {
    // Exit multi-select mode on Escape key
    if (e.key === 'Escape' && multiSelectMode) {
      exitMultiSelectMode();
    }
    
    // Exit notes layout selection mode on Escape key
    if (e.key === 'Escape' && notesLayoutSelectionMode) {
      exitNotesLayoutSelectionMode();
    }
    
    // Handle number keys when keyboard mode is enabled
    if (keyboardEnabled && selectedIndex >= 0) {
      const maxKey = gridSize === 16 ? '16' : '9';
      if (e.key >= '1' && e.key <= maxKey) {
        e.preventDefault();
        applyKey(e.key);
      }
    }
    
    // Handle backspace/delete for clear
    if (keyboardEnabled && selectedIndex >= 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      applyKey('C');
    }
  });
}

// Call setup functions after the grid is created
function initializeGame() {
  setupGlobalEventListeners();
  
  // Start timer
  startTimer();
  
  // Expand Telegram WebApp if available
  tg?.expand && tg.expand();
}

// Dynamic celebration popup system
let dynamicPopup = null;

function showDynamicCelebrationPopup(data) {
  // Remove any existing popup
  if (dynamicPopup) {
    document.body.removeChild(dynamicPopup);
  }
  
  dynamicPopup = document.createElement('div');
  dynamicPopup.className = 'celebration-modal-overlay';
  
  const content = document.createElement('div');
  content.className = 'celebration-modal-content';
  
  const icon = document.createElement('div');
  icon.className = 'celebration-icon';
  icon.textContent = '🎉';
  
  const title = document.createElement('h2');
  title.className = 'celebration-title';
  title.textContent = 'Congratulations!';
  
  const subtitle = document.createElement('p');
  subtitle.className = 'celebration-subtitle';
  subtitle.textContent = `You solved the puzzle, ${data.username}!`;
  
  const stats = document.createElement('div');
  stats.className = 'celebration-stats';
  
  const timeStat = document.createElement('div');
  timeStat.className = 'celebration-stat';
  timeStat.innerHTML = `
    <span class="celebration-stat-label">Completion Time:</span>
    <span class="celebration-stat-value">${data.time}</span>
  `;
  
  const puzzleStat = document.createElement('div');
  puzzleStat.className = 'celebration-stat';
  puzzleStat.innerHTML = `
    <span class="celebration-stat-label">Puzzle ID:</span>
    <span class="celebration-stat-value">#${data.puzzleId}</span>
  `;
  
  const proofStatus = document.createElement('div');
  proofStatus.className = 'celebration-stat';
  proofStatus.id = 'dynamic-proof-status';
  
  // Show loading animation initially
  proofStatus.innerHTML = `
    <span class="celebration-stat-label">zkVerify Proof:</span>
    <span class="celebration-stat-value">
      <div class="loading-spinner"></div>
      <span>Submitting...</span>
    </span>
  `;
  
  stats.appendChild(timeStat);
  stats.appendChild(puzzleStat);
  stats.appendChild(proofStatus);
  
  const buttons = document.createElement('div');
  buttons.className = 'celebration-buttons';
  buttons.id = 'dynamic-popup-buttons';
  
  // Initially hide buttons until submission completes
  buttons.style.display = 'none';
  
  const leaderboardBtn = document.createElement('button');
  leaderboardBtn.className = 'celebration-btn primary';
  leaderboardBtn.textContent = 'View Leaderboard';
  leaderboardBtn.addEventListener('click', () => {
    hideDynamicCelebrationPopup();
    showLeaderboard();
  });
  
  const newGameBtn = document.createElement('button');
  newGameBtn.className = 'celebration-btn secondary';
  newGameBtn.textContent = 'New Game';
  newGameBtn.addEventListener('click', () => {
    hideDynamicCelebrationPopup();
    showMainMenu();
  });
  
  buttons.appendChild(leaderboardBtn);
  buttons.appendChild(newGameBtn);
  
  content.appendChild(icon);
  content.appendChild(title);
  content.appendChild(subtitle);
  content.appendChild(stats);
  content.appendChild(buttons);
  dynamicPopup.appendChild(content);
  
  // Close modal when clicking outside
  dynamicPopup.addEventListener('click', (e) => {
    if (e.target === dynamicPopup) {
      hideDynamicCelebrationPopup();
    }
  });
  
  document.body.appendChild(dynamicPopup);
}

function updateDynamicPopupStatus(status, errorMessage = null, zkVerifyData = null) {
  if (!dynamicPopup) return;
  
  const proofStatus = document.getElementById('dynamic-proof-status');
  const buttons = document.getElementById('dynamic-popup-buttons');
  
  if (!proofStatus) return;
  
  let statusText = '';
  let statusIcon = '';
  
  switch (status) {
    case 'validating':
      statusText = 'Validating solution...';
      statusIcon = '<div class="loading-spinner"></div>';
      break;
    case 'generating':
      statusText = 'Generating proof...';
      statusIcon = '<div class="loading-spinner"></div>';
      break;
    case 'submitting':
      statusText = 'Submitting to zkVerify...';
      statusIcon = '<div class="loading-spinner"></div>';
      break;
    case 'completed':
      if (zkVerifyData && (zkVerifyData.zkVerifyStatus === 'completed' || zkVerifyData.zkVerifyStatus === 'success')) {
        statusText = '✅ Submitted';
        statusIcon = '';
      } else if (zkVerifyData && (zkVerifyData.zkVerifyStatus === 'failed' || zkVerifyData.zkVerifyStatus === 'error')) {
        statusText = '❌ Failed';
        statusIcon = '';
      } else {
        statusText = '✅ Submitted';
        statusIcon = '';
      }
      // Show buttons when completed
      if (buttons) buttons.style.display = 'flex';
      break;
    case 'failed':
      statusText = errorMessage || '❌ Failed';
      statusIcon = '';
      // Show buttons on failure
      if (buttons) buttons.style.display = 'flex';
      break;
    default:
      statusText = '⏳ Processing...';
      statusIcon = '<div class="loading-spinner"></div>';
  }
  
  proofStatus.innerHTML = `
    <span class="celebration-stat-label">zkVerify Proof:</span>
    <span class="celebration-stat-value">
      ${statusIcon}
      <span>${statusText}</span>
    </span>
  `;
}

function hideDynamicCelebrationPopup() {
  if (dynamicPopup) {
    document.body.removeChild(dynamicPopup);
    dynamicPopup = null;
  }
}

