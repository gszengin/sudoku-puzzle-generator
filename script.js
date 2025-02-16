document.addEventListener("DOMContentLoaded", function () {
    const generatePuzzleButton = document.getElementById("generatePuzzleButton");
    const saveSVGButton = document.getElementById("saveSVGButton");
    const downloadButton = document.getElementById("downloadButton");
    const generateSolutionButton = document.getElementById("generateSolution");
    const puzzleContainer = document.getElementById("puzzleSVG");
    const gridSizeSelect = document.getElementById("gridSize");
    const difficultySelect = document.getElementById("difficulty");
    
    const instructionTextBox = document.getElementById("instructionText");
     
        let userEditedInstructions = false; // Track if the user manually changed the instruction

        // Detect if the user manually edits the instruction box
        instructionTextBox.addEventListener("input", function () {
            userEditedInstructions = true;
        });

        // Update instructions when grid size changes
        gridSizeSelect.addEventListener("change", function () {
            if (!userEditedInstructions) { // Only update if the user hasn't manually edited it
                switch (gridSizeSelect.value) {
                    case "Smaller":
                        instructionTextBox.value = "Fill in the grid so that every row, column, and 2x2 box contains the numbers 1-4 without repetition.";
                        break;
                    case "Larger":
                        instructionTextBox.value = "Fill in the grid so that every row, column, and 4x4 box contains the numbers 1-16 without repetition.";
                        break;
                    default:
                        instructionTextBox.value = "Fill in the grid so that every row, column, and 3x3 box contains the numbers 1-9 without repetition.";
                }
            }
        });


    let gridSize = 9; // Default grid size
    let originalPuzzle = []; // Stores the original puzzle
    let solvedPuzzle = []; // Stores the solved puzzle

    console.log("Checking jsPDF:", window.jspdf);
    console.log("Checking svg2pdf:", window.svg2pdf);

    function getGridSize() {
        switch (gridSizeSelect.value) {
            case "Smaller": return 6;
            case "Larger": return 16;
            default: return 9;
        }
    }

    function generateSudokuGrid() {
        gridSize = getGridSize();
        let puzzleGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    
        if (!fillSudoku(puzzleGrid, gridSize)) {
            console.error("Sudoku generation failed!");
            return;
        }
    
        removeNumbersForDifficulty(puzzleGrid, gridSize);
        originalPuzzle = puzzleGrid.map(row => [...row]); // Deep copy
    
        solvedPuzzle = JSON.parse(JSON.stringify(originalPuzzle)); 
        fillSudoku(solvedPuzzle, gridSize); // Solve the puzzle completely
    
        drawSudoku(originalPuzzle, gridSize);
    }
    
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function fillSudoku(grid, size) {
        function isValid(num, row, col) {
            for (let i = 0; i < size; i++) {
                if (grid[row][i] === num || grid[i][col] === num) return false;
            }
            let boxSize = Math.floor(Math.sqrt(size));
            let startRow = Math.floor(row / boxSize) * boxSize;
            let startCol = Math.floor(col / boxSize) * boxSize;
            for (let i = 0; i < boxSize; i++) {
                for (let j = 0; j < boxSize; j++) {
                    if (grid[startRow + i][startCol + j] === num) return false;
                }
            }
            return true;
        }
    
        function solve(row, col) {
            if (row === size) return true;
            if (col === size) return solve(row + 1, 0);
            if (grid[row][col] !== 0) return solve(row, col + 1);
    
            let numbers = shuffleArray([...Array(size).keys()].map(x => x + 1)); // Better shuffle
            for (let num of numbers) {
                if (isValid(num, row, col)) {
                    grid[row][col] = num;
                    if (solve(row, col + 1)) return true;
                    grid[row][col] = 0;
                }
            }
            return false;
        }
    
        return solve(0, 0);
    }
    
          

    function removeNumbersForDifficulty(grid, size) {
        let difficultyMap = { "easy": 0.4, "medium": 0.55, "hard": 0.7 };
        let removeCount = Math.floor(size * size * (difficultyMap[difficultySelect.value] || 0.4));
        let removed = new Set();
    
        while (removed.size < removeCount) {
            let row = Math.floor(Math.random() * size);
            let col = Math.floor(Math.random() * size);
            let key = `${row}-${col}`;
    
            if (grid[row][col] !== 0 && !removed.has(key)) {
                let temp = grid[row][col];
                grid[row][col] = 0;
    
                // ✅ Ensure the puzzle still has a **unique** solution
                if (!hasUniqueSolution(JSON.parse(JSON.stringify(grid)), size)) {
                    grid[row][col] = temp; // Revert if the solution is not unique
                } else {
                    removed.add(key);
                }
            }
        }
    }
    
    function hasUniqueSolution(grid, size) {
        let solutions = 0;
    
        function solve(row, col) {
            if (row === size) {
                solutions++;
                return solutions < 2; // Stop if we find more than one solution
            }
            if (col === size) return solve(row + 1, 0);
            if (grid[row][col] !== 0) return solve(row, col + 1);
    
            for (let num = 1; num <= size; num++) {
                if (isValid(grid, num, row, col, size)) { // ✅ Fix: Corrected function call
                    grid[row][col] = num;
                    if (!solve(row, col + 1)) return false;
                    grid[row][col] = 0;
                }
            }
            return true;
        }
    
        solve(0, 0);
        return solutions === 1; // ✅ Ensures the puzzle has a unique solution
    }
    

    function isValid(grid, num, row, col, size) {
        for (let i = 0; i < size; i++) {
            if (grid[row][i] === num || grid[i][col] === num) return false;
        }
        let boxSize = Math.floor(Math.sqrt(size));
        let startRow = Math.floor(row / boxSize) * boxSize;
        let startCol = Math.floor(col / boxSize) * boxSize;
        for (let i = 0; i < boxSize; i++) {
            for (let j = 0; j < boxSize; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        return true;
    } 
    
    
    function drawSudoku(grid, size, showSolution = false) {
        puzzleContainer.innerHTML = "";
        let canvasSize = 500; // SVG canvas size
        let cellSize = canvasSize / size;
        let blockSize = Math.floor(Math.sqrt(size)); // Determines bold line spacing
        let svgNS = "http://www.w3.org/2000/svg";
    
        let svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", canvasSize);
        svg.setAttribute("height", canvasSize);
        svg.setAttribute("viewBox", `0 0 ${canvasSize} ${canvasSize}`);
    
        for (let i = 0; i <= size; i++) {
            let line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", i * cellSize);
            line.setAttribute("y1", 0);
            line.setAttribute("x2", i * cellSize);
            line.setAttribute("y2", canvasSize);
            line.setAttribute("stroke", "#000");
            line.setAttribute("stroke-width", (i % blockSize === 0) ? "3" : "1");
            svg.appendChild(line);
    
            let lineH = document.createElementNS(svgNS, "line");
            lineH.setAttribute("x1", 0);
            lineH.setAttribute("y1", i * cellSize);
            lineH.setAttribute("x2", canvasSize);
            lineH.setAttribute("y2", i * cellSize);
            lineH.setAttribute("stroke", "#000");
            lineH.setAttribute("stroke-width", (i % blockSize === 0) ? "3" : "1");
            svg.appendChild(lineH);
        }
    
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (grid[row][col] !== 0) {
                    let text = document.createElementNS(svgNS, "text");
                    text.setAttribute("x", col * cellSize + cellSize / 2);
                    text.setAttribute("y", row * cellSize + cellSize / 1.5);
                    text.setAttribute("text-anchor", "middle");  // ✅ Centers horizontally
                    text.setAttribute("dominant-baseline", "middle");  // ✅ Helps vertical centering
                    text.setAttribute("font-size", Math.max(28, cellSize / 2.5) + "px");
                    text.setAttribute("font-family", "Arial");
                    
                    // If solution mode, color solution numbers in red
                    if (showSolution && originalPuzzle && originalPuzzle[row][col] === 0) {
                        text.setAttribute("fill", "red"); // Color only missing numbers in red
                        text.setAttribute("font-size", Math.max(28, cellSize / 2.5) + "px");  
                    } else {
                        text.setAttribute("fill", "black"); // Keep original numbers black
                    }
    
                    text.textContent = grid[row][col];
                    svg.appendChild(text);
                }
            }
        }
    
        puzzleContainer.appendChild(svg);
    }


    function showSolution() {
        if (!fillSudoku(puzzleGrid, gridSize)) {
            console.error("Solution generation failed!");
            return;
        }
        drawSudoku(puzzleGrid, gridSize, true);
    }

   
    function toggleSolution() {
        const solutionButton = document.getElementById("generateSolution");
        let isShowing = solutionButton.innerHTML.includes("Hide");
    
        drawSudoku(isShowing ? originalPuzzle : solvedPuzzle, gridSize, !isShowing);
        solutionButton.innerHTML = isShowing 
            ? '<i class="fa-solid fa-eye"></i> Show Solution' 
            : '<i class="fa-solid fa-eye-slash"></i> Hide Solution';
    }
    
   
    function saveAsSVG() {
        let svgElement = document.querySelector("#puzzleSVG svg");
        if (!svgElement) {
            alert("Error: No Sudoku puzzle to save.");
            console.error("SVG element not found.");
            return;
        }
    
        let svgData = new XMLSerializer().serializeToString(svgElement);
        let blob = new Blob(
            ['<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgData], 
            { type: "image/svg+xml" }
        );
        let url = URL.createObjectURL(blob);
    
        let link = document.createElement("a");
        link.href = url;
        link.download = "sudoku_puzzle.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
 


    async function convertSvgToPdf(svgElement, doc, x, y, scaleFactor) {
        return new Promise((resolve) => {
            if (!svgElement) {
                console.error("Error: SVG Element is missing.");
                alert("Error: Unable to generate PDF because the Sudoku puzzle is not displayed.");
                return resolve();
            }
    
            // Clone the SVG element before modifying it
            let clonedSvg = svgElement.cloneNode(true);
            
            // Apply a transformation to move the SVG down (3 inches) and right (1 inch)
            let transformValue = `translate(${90.4}, ${260.2})`; // 1 inch right, 3 inches down
            clonedSvg.setAttribute("transform", transformValue);
    
            // Convert the transformed SVG to PDF
            svg2pdf(clonedSvg, doc, { x, y, scale: scaleFactor });
    
            setTimeout(resolve, 500); // Small delay to allow rendering
        });
    }


    async function downloadPDF() {
        console.log("Download function is running...");
    
        if (!window.jspdf || !window.jspdf.jsPDF || !window.svg2pdf) {
            alert("Error: Required libraries failed to load. Please check your internet connection and try again.");
            console.error("jsPDF or svg2pdf.js is missing.");
            return;
        }
    
        const { jsPDF } = window.jspdf;
        let doc = new jsPDF("portrait");
        let pageWidth = doc.internal.pageSize.getWidth();
        let pageHeight = doc.internal.pageSize.getHeight();
        let marginTop = 20;
        let spacing = 10; // Adjusted spacing for consistency
    
        // ✅ Get User Preferences for Title & Instructions
        let titleFont = document.getElementById("fontStyle").value || "helvetica";
        let titleSize = parseInt(document.getElementById("titleSize").value) || 24;
        let titleColor = document.getElementById("titleColor").value || "#000000";
    
        let instructionFont = document.getElementById("instructionFont").value || "helvetica";
        let instructionSize = parseInt(document.getElementById("instructionSize").value) || 14;
        let instructionColor = document.getElementById("instructionColor").value || "#000000";
    
        function hexToRgb(hex) {
            let bigint = parseInt(hex.substring(1), 16);
            return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        }
    
        let titleRGB = hexToRgb(titleColor);
        let instructionRGB = hexToRgb(instructionColor);
    
        // ✅ User-selected options
        let includeTitle = document.getElementById("includeTitle").checked;
        let includeInstructions = document.getElementById("includeInstructions").checked;
        let includeSolution = document.getElementById("includeSolution").checked;
    
        let fullName = "Full Name: __________________";
        let date = "Date: ________________";
        let title = document.getElementById("title").value;
        let instructions = document.getElementById("instructionText").value;
        let difficulty = document.getElementById("difficulty").value;
        let gridSize = document.getElementById("gridSize").value;
        let formattedTitle = `${title} - ${difficulty.toUpperCase()}`;
    
        let svgElement = document.querySelector("#puzzleSVG svg");
        if (!svgElement) {
            alert("Error: Sudoku puzzle not found for PDF export.");
            console.error("SVG element for puzzle is missing.");
            return;
        }
    
        let svgBBox = svgElement.getBoundingClientRect(); // Get accurate SVG dimensions
        let svgWidth = svgBBox.width;
        let svgHeight = svgBBox.height;
    
        let maxWidth = pageWidth - 50; // Increased width (balanced margins)
        let maxHeight = pageHeight - 130; // More height space
        let scaleFactor = Math.min(maxWidth / svgWidth, maxHeight / svgHeight) * 1.1; // Adjusted scaling
    
        async function addSudokuSection(doc, yOffset) {
            doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(0, 0, 0);
            doc.text(fullName, 10, yOffset);
            doc.text(date, pageWidth - 20, yOffset, { align: "right" });
    
            yOffset += 15 + spacing; // Move down after name & date
    
            if (includeTitle) {
                doc.setFont(titleFont).setFontSize(titleSize).setTextColor(titleRGB[0], titleRGB[1], titleRGB[2]);
                doc.text(formattedTitle, pageWidth / 2, yOffset, { align: "center" });
                yOffset += titleSize * 0.6; // 🔹 Reduce space between title and instructions
            }
    
            if (includeInstructions) {
                doc.setFont(instructionFont).setFontSize(instructionSize).setTextColor(instructionRGB[0], instructionRGB[1], instructionRGB[2]);
                doc.text(instructions, pageWidth / 2, yOffset, { align: "center", maxWidth: 180 });
                yOffset += instructionSize + 15; // 🔹 Increased space below instructions
            }
    
            let puzzleX = (pageWidth - svgWidth * scaleFactor) / 2; // ✅ Perfectly center horizontally
            let puzzleY = yOffset + 130; // ✅ Move puzzle further down
    
            await convertSvgToPdf(svgElement, doc, puzzleX, puzzleY, scaleFactor);
        }
    
        await addSudokuSection(doc, marginTop);
    
        // ✅ Add solution if selected
        if (includeSolution) {
            // ✅ Force showing the solution
            toggleSolution();  // This ensures the solution is visible in the UI
        
            // Wait a short delay to allow rendering
            await new Promise((resolve) => setTimeout(resolve, 500));
        
            let solutionSvgElement = document.querySelector("#puzzleSVG svg");
        
            if (solutionSvgElement) {
                doc.addPage();
                doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(0, 0, 0);
                doc.text(fullName, 10, 10);
                doc.text(date, pageWidth - 20, 10, { align: "right" });
        
                doc.setFontSize(18).text("Solution", pageWidth / 2, 30, { align: "center" });
        
                let solutionX = (pageWidth - svgWidth * scaleFactor) / 2;
                let solutionY = 60;
        
                // ✅ Capture the correctly redrawn solution
                await convertSvgToPdf(solutionSvgElement, doc, solutionX, solutionY, scaleFactor);
            }
        
            // ✅ Restore the original puzzle after saving PDF
            toggleSolution();  // Hide the solution again
        }
        
       
        doc.save("sudoku_puzzle.pdf");
    }
    
    
    if (downloadButton) downloadButton.addEventListener("click", downloadPDF);
    
       
    generateSolutionButton.addEventListener("click", toggleSolution);  
    generatePuzzleButton.addEventListener("click", generateSudokuGrid);
    saveSVGButton.addEventListener("click", saveAsSVG);
    
});


