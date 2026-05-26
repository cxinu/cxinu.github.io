(function () {
  const canvas = document.getElementById("gol-bg");
  const ctx = canvas.getContext("2d");

  const cellSize = 16; // Grid resolution
  const fps = 8; // Throttled framerate for ambient feel
  const interval = 1000 / fps;

  let cols, rows, grid;
  let lastTime = 0;
  let scrollY = 0;
  const parallaxSpeed = 0.3; // Speed of parallax effect

  const rules = [
    { name: "Conway's Life", born: [3], survive: [2, 3] },
    { name: "HighLife", born: [3, 6], survive: [2, 3] }, // Replicators
    { name: "Day & Night", born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] }, // Symmetrical patterns
    { name: "Maze", born: [3], survive: [1, 2, 3, 4, 5] }, // Sprawling labyrinth
  ];
  let currentRuleIndex = 2;

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
        grid[i][j] = Math.random() > 0.85 ? 1 : 0;
      }
    }
  }

  // Helper for positive modulo
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function draw() {
    // Fade out previous frames to create ghost trails
    // rgba(18, 18, 18) matches your --bg color #121212
    ctx.fillStyle = "rgba(18, 18, 18, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetY = scrollY * parallaxSpeed;
    const gridHeightPx = rows * cellSize;

    ctx.strokeStyle = "#2a2a2a"; // Subtle line color
    ctx.lineWidth = 1;
    ctx.beginPath();

    ctx.fillStyle = "#1e1e1e"; // var(--surface) for nodes
    const nodeSize = 3;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (grid[i][j] === 1) {
          let drawX = i * cellSize + cellSize / 2;
          let drawY = mod(j * cellSize - offsetY, gridHeightPx) + cellSize / 2;

          ctx.fillRect(
            drawX - nodeSize / 2,
            drawY - nodeSize / 2,
            nodeSize,
            nodeSize,
          );

          // Connect to forward neighbors to avoid drawing lines twice
          const neighborsToCheck = [
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
          ];

          for (let check of neighborsToCheck) {
            let ni = i + check[0];
            let nj = j + check[1];

            // Only draw visual connections for non-wrapping neighbors to keep it clean
            if (ni >= 0 && ni < cols && nj >= 0 && nj < rows) {
              if (grid[ni][nj] === 1) {
                let nx = ni * cellSize + cellSize / 2;
                let ny =
                  mod(nj * cellSize - offsetY, gridHeightPx) + cellSize / 2;

                // Prevent drawing vertical lines that wrap across the whole screen
                if (Math.abs(drawY - ny) <= cellSize * 2) {
                  ctx.moveTo(drawX, drawY);
                  ctx.lineTo(nx, ny);
                }
              }
            }
          }
        }
      }
    }
    ctx.stroke();
  }

  function update() {
    let next = createGrid();
    let rule = rules[currentRuleIndex];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let state = grid[i][j];
        let neighbors = countNeighbors(i, j);

        if (state === 0 && rule.born.includes(neighbors)) {
          next[i][j] = 1;
        } else if (state === 1 && !rule.survive.includes(neighbors)) {
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
        let col = mod(x + i, cols);
        let row = mod(y + j, rows);
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

  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
    draw(); // Redraw immediately on scroll for smooth parallax
  });

  window.addEventListener("click", (e) => {
    // Map screen coordinates back to grid coordinates considering parallax
    const offsetY = scrollY * parallaxSpeed;
    const gridHeightPx = rows * cellSize;

    // We want to find j such that mod(j * cellSize - offsetY, gridHeightPx) roughly equals e.clientY
    // So j * cellSize = e.clientY + offsetY
    let col = mod(Math.floor(e.clientX / cellSize), cols);
    let row = mod(Math.floor((e.clientY + offsetY) / cellSize), rows);

    // Create a random explosion of cells around the click
    const radius = 4;
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        if (i * i + j * j <= radius * radius) {
          if (Math.random() > 0.3) {
            let c = mod(col + i, cols);
            let r = mod(row + j, rows);
            grid[c][r] = 1;
          }
        }
      }
    }
    draw(); // Redraw immediately
  });

  window.addEventListener("dblclick", () => {
    currentRuleIndex = (currentRuleIndex + 1) % rules.length;
    // Add random noise to kickstart the new physics rule
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (Math.random() > 0.95) grid[i][j] = 1;
      }
    }
    draw();
  });

  // Initialize and start
  resize();
  requestAnimationFrame(loop);
})();
