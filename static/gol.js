(function () {
  const canvas = document.getElementById("gol-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const cellSize = 16; // Grid resolution
  const fps = 8; // Throttled framerate for ambient feel
  const interval = 1000 / fps;

  let cols, rows, grid;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    reducedMotion = e.matches;
  });

  let lastTime = 0;

  const rules = [
      { name: "Day & Night", born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] }, // Symmetrical patterns
    // { name: "Conway's Life", born: [3], survive: [2, 3] },
    // { name: "HighLife", born: [3, 6], survive: [2, 3] }, // Replicators
  ];
  let currentRuleIndex = 0;

  const perm = new Uint8Array(512);
  (function () {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a, b, t) {
    return a + t * (b - a);
  }

  function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function noise(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const a = perm[xi] + yi;
    const b = perm[xi + 1] + yi;

    return lerp(
      lerp(grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf), u),
      lerp(grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1), u),
      v,
    );
  }

  const noiseScale = 0.04;
  const noiseThreshold = 0.15;

  function resize() {
    const parent = canvas.parentElement;
    const parentRect = parent.getBoundingClientRect();
    canvas.width = parentRect.width;
    canvas.height = parentRect.height;
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
        grid[i][j] = noise(i * noiseScale, j * noiseScale) > noiseThreshold ? 1 : 0;
      }
    }
  }

  // Helper for positive modulo
  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();

    ctx.fillStyle = "#252525";
    const nodeSize = 4;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (grid[i][j] === 1) {
          let drawX = i * cellSize + cellSize / 2;
          let drawY = j * cellSize + cellSize / 2;

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
                let ny = nj * cellSize + cellSize / 2;

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
    if (reducedMotion) {
      draw();
      requestAnimationFrame(loop);
      return;
    }
    if (timestamp - lastTime >= interval) {
      update();
      draw();
      lastTime = timestamp;
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);

  window.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    let col = mod(Math.floor(x / cellSize), cols);
    let row = mod(Math.floor(y / cellSize), rows);

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
