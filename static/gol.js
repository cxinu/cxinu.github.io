(function () {
  const canvas = document.getElementById("gol-bg");
  const ctx = canvas.getContext("2d");

  const cellSize = 16; // Grid resolution
  const fps = 8; // Throttled framerate for ambient feel
  const interval = 1000 / fps;

  let cols, rows, grid;
  let lastTime = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / cellSize);
    rows = Math.floor(canvas.height / cellSize);
    initGrid();
  }

  function createGrid() {
    return new Array(cols).fill(null).map(() => new Array(rows).fill(0));
  }

  function initGrid() {
    grid = createGrid();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // 15% chance of a cell starting alive to prevent initial overcrowding
        grid[i][j] = Math.random() > 0.85 ? 1 : 0;
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#121212"; // var(--bg)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1e1e1e"; // var(--surface)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (grid[i][j] === 1) {
          // Subtracting 1 from size creates a subtle grid line effect
          ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  }

  function update() {
    let next = createGrid();

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let state = grid[i][j];
        let neighbors = countNeighbors(i, j);

        if (state === 0 && neighbors === 3) {
          next[i][j] = 1;
        } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
          next[i][j] = 0;
        } else {
          next[i][j] = state;
        }
      }
    }
    grid = next;
  }

  function countNeighbors(x, y) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        // Toroidal mapping allows patterns to wrap around screen edges
        let col = (x + i + cols) % cols;
        let row = (y + j + rows) % rows;
        sum += grid[col][row];
      }
    }
    sum -= grid[x][y];
    return sum;
  }

  function loop(timestamp) {
    if (timestamp - lastTime >= interval) {
      update();
      draw();
      lastTime = timestamp;
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);

  // Initialize and start
  resize();
  requestAnimationFrame(loop);
})();
