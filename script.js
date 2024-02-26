const canvas = document.getElementById("display");
const ctx = canvas.getContext("2d");
const gpu = new GPU.GPU();
const screenSize = floor(vec(window.innerWidth, window.innerHeight));

const resolutionScale = Math.min(Math.max(prompt("Maze scale?"), 1), 20);
const mazeSize = vec(nearestOdd(Math.round(16 * resolutionScale)), nearestOdd(Math.round(9 * resolutionScale)));
const cellSize = (div(screenSize, mazeSize));
const startLocation = vec(1.25, 1.25);
const endLocation = sub(mazeSize, vec(1.5, 1.5));
const endWidth = Math.min(cellSize.x, cellSize.y) / 2.1;
const charSize = endWidth / 2;
const maxDistance = mag(screenSize);
const moveSpeed = 0.01;
const roundScale = 0.001;
const roundPosition = false;
const fontSize = screenSize.y / 8;

const { maze, lines, casts } = generateLines(mazeSize, cellSize, screenSize);

const gpuLines = lines.map(line => [line.a.x, line.a.y, line.b.x, line.b.y]);
const gpuCasts = casts.map(cast => [cast.x, cast.y]);

let char = mul(cellSize, startLocation);
// let char = mul(screenSize, vec(Math.random(), Math.random()));
let lpos = vec(char.x, char.y);
let velocity = vec(0, 0);
let mouse = vec(char.x, char.y);
let won = false;
let explanationRequired = true;
let winExplanationRequired = true;
let time = performance.now();

const lineIntersectionKernel = gpu.createKernel(function(char) {
  let fx = this.constants.casts[this.thread.x][0];
  let fy = this.constants.casts[this.thread.x][1];

  let minDist = 10000.0;
  let x = 0.0, y = 0.0, z = 0.0;
  let c = 0.0;

  for (let i = 0; i < this.constants.len; i++) {
    let ax = this.constants.lines[i][0];
    let ay = this.constants.lines[i][1];
    let bx = this.constants.lines[i][2];
    let by = this.constants.lines[i][3];

    let p = (by - ay);
    let q = (bx - char[0]);
    let r = (by - char[1]);
    let s = (fx - char[0]);
    let t = (bx - ax);
    let u = (fy - char[1]);
    let det = s * p - t * u;

    if (det == 0.0) continue;

    let lambda = (p * q - t * r) / det;
    let gamma = (-u * q + s * r) / det;

    let intersecting = (0.0 < lambda) && (0.0 < gamma && gamma < 1.0);

    if (!intersecting) continue;

    if (lambda < 1.0) c += 1.0;

    let px = char[0] + lambda * s;
    let py = char[1] + lambda * u;

    let dx = char[0] - px;
    let dy = char[1] - py;

    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > minDist) continue;

    minDist = dist;
    x = px;
    y = py;
    z = 1.0;
  }

  if (c >= 2.0) z = 0.0;

  return [x, y, z];
}, {
  constants: {
    lines: gpuLines, len: lines.length,
    casts: gpuCasts
  },
}).setOutput([casts.length])
  .setTactic('speed');

function init() {
  canvas.width = screenSize.x;
  canvas.height = screenSize.y;
  document.addEventListener("mousemove", (e) => {
    mouse = vec(e.x, e.y);
    explanationRequired = false;
    setTimeout(() => winExplanationRequired = false, 5000);
  });

  document.addEventListener("mousedown", (e) => {
    if (won) {
      window.location = window.location;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (won) {
      window.location = window.location;
    }
  });
  document.title = `Shadowing at (${mazeSize.x}, ${mazeSize.y}) (${resolutionScale})`;
  requestAnimationFrame(loop);
}

function loop() {
  char = vec(Math.round(char.x * 100) / 100, Math.round(char.y * 100) / 100);
  handleMovement();

  let newTime = performance.now();
  let deltaTime = newTime - time;
  time = newTime;

  // ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
  // ctx.fillRect(0, 0, screenSize.x, screenSize.y);
  ctx.clearRect(0, 0, screenSize.x, screenSize.y);
  ctx.lineWidth = 1;

  ctx.textAlign = "center";
  let text = "";

  if (explanationRequired) text = "Move your mouse to drag the character";
  else if (winExplanationRequired) text = "Get to the yellow circle to win";
  ctx.font = `${fontSize / 4}px monospace`;
  ctx.fillStyle = "white";
  ctx.fillText(text, screenSize.x / 2, fontSize / 4);

  let dt = String(Math.round(deltaTime)) + String(deltaTime % 1).substring(1, 3);
  ctx.textAlign = "left";
  ctx.fillStyle = "green";
  ctx.font = `${fontSize / 6}px monospace`;
  ctx.fillText(`FrameTime: ${dt}ms\nFPS: ${Math.round(1000 / deltaTime)}`, 0, fontSize / 6);

  let gpuChar = [char.x, char.y];
  // let gpuChar = [Math.round(char.x), Math.round(char.y)];
  // let gpuChar = [Math.round(char.x * 10) / 10, Math.round(char.y * 10) / 10];
  // let gpuChar = [Math.round(char.x * 100) / 100, Math.round(char.y * 100) / 100];
  // let gpuChar = [char.x + Math.random() / 100, char.y + Math.random() / 100];
  let scene = lineIntersectionKernel(gpuChar);

  // console.log(scene);

  // scene = scene.map(v => Array.from(v));

  scene = scene.filter((v) => v[2] == 1);

  scene = scene.sort((a, b) => {
    return angle(b) - angle(a);
  });

  ctx.strokeWidth = .1;
  ctx.fillStyle = `rgba(200, 200, 210, .5)`;
  drawScene(scene);
  // drawLines(lines);
  // drawCasts(casts);
  // drawMaze(maze);
  ctx.fillStyle = `rgba(200, 200, 200, .75)`;
  ctx.beginPath();
  ctx.arc(char.x, char.y, charSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(100, 100, 100, .75)`;

  if (dist(char, mul(endLocation, cellSize)) < endWidth) {
    won = true;
    ctx.clearRect(0, 0, screenSize.x, screenSize.y);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    ctx.font = `${fontSize}px monospace`;
    ctx.fillText("You won!", screenSize.x / 2, screenSize.y / 2);

    ctx.font = `${fontSize / 4}px monospace`;
    ctx.fillText("Press anything to play again", screenSize.x / 2, screenSize.y / 2 + fontSize / 2);
  }

  if (!won) requestAnimationFrame(loop);
}

function drawScene(scene) {
  // // ctx.strokeStyle = grd;
  // // ctx.strokeStyle = "gray";
  // ctx.lineWidth = 1;

  let clr = [200, 185, 145];
  let grd = ctx.createRadialGradient(char.x, char.y, 0, char.x, char.y, endWidth * 50);
  grd.addColorStop(0, `rgba(${clr[0]}, ${clr[1]}, ${clr[2]}, 1.0)`);
  grd.addColorStop(1, `rgba(${clr[0]}, ${clr[1]}, ${clr[2]}, 0.0)`);
  ctx.fillStyle = grd;

  let shadows = new Path2D();
  let lX = scene[0][0];
  let lY = scene[0][1];
  shadows.moveTo(scene[0][0], scene[0][1]);
  for (let i = 0; i < scene.length; i++) {
    let nX = scene[i][0];
    let nY = scene[i][1];
    shadows.lineTo(nX, nY);
    lX = nX;
    lY = nY;
  }
  ctx.fill(shadows);

  // ctx.moveTo(scene[0][0], scene[0][1]);
  // for (let i = 0; i < scene.length; i++) {
  //   let nX = scene[i][0];
  //   let nY = scene[i][1];
  //   ctx.lineTo(nX, nY);
  //   lX = nX;
  //   lY = nY;
  // }
  // ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(endLocation.x * cellSize.x, endLocation.y * cellSize.y, endWidth, 0, Math.PI * 2);
  ctx.fill();

  // for (let i = 0; i < scene.length; i++) {
  //   // ctx.strokeStyle = scene[i][2] ? "red" : "gray";
  //   // ctx.fillStyle = scene[i][2] ? "red" : "gray";
  //   // ctx.beginPath();
  //   // ctx.moveTo(char.x, char.y);
  //   // ctx.lineTo(scene[i][0], scene[i][1]);
  //   // ctx.stroke();

  //   ctx.fillStyle = "gray";

  //   ctx.beginPath();
  //   ctx.arc(scene[i][0], scene[i][1], 2, 0, Math.PI * 2);
  //   ctx.fill();
  // }
}

function drawLines(lines) {
  ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
  ctx.lineWidth = 2;
  for (i = 0; i < lines.length; i++) {
    ctx.beginPath();
    ctx.moveTo(lines[i].a.x, lines[i].a.y);
    ctx.lineTo(lines[i].b.x, lines[i].b.y);
    ctx.stroke();
  }
}

function drawMaze(maze) {
  ctx.fillStyle = "blue";

  for (let x = 0; x < maze[0].length; x++) {
    for (let y = 0; y < maze.length; y++) {
      if (maze[y][x] == 1) {
        ctx.fillRect(x * cellSize.x, y * cellSize.y, 2, 2);
      }
    }
  }
}

function drawCasts(casts) {
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.lineWidth = 0.5;

  for (let i = 0; i < casts.length; i++) {
    let cast = casts[i];

    if (dist(char, cast) > 800) continue;
    ctx.fillRect(cast.x, cast.y, 1, 1);
    // ctx.beginPath();
    // ctx.moveTo(char.x, char.y);
    // ctx.lineTo(casts[i].x, casts[i].y);
    // ctx.stroke();
  }
}

function angle(e) {
  var dy = e[1] - char.y;
  var dx = e[0] - char.x;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

function handleMovement() {
  let acc = scale(sub(mouse, char), moveSpeed);
  let vel = add(scale(sub(char, lpos), 0.9), acc);

  lpos = vec(char.x, char.y);

  let fullCollides = false;
  let horzCollides = false;
  let vertCollides = false;
  let fullLine = line(char, add(char, vec(vel.x + charSize * Math.sign(vel.x), vel.y + charSize * Math.sign(vel.y))));
  let horzLine = line(char, add(char, vec(vel.x + charSize * Math.sign(vel.x), 0)));
  let vertLine = line(char, add(char, vec(0, vel.y + charSize * Math.sign(vel.y))));

  for (let i = 0; i < lines.length; i++) {
    let currLine = lines[i];
    if (cintersects(fullLine, currLine)) fullCollides = true;
    if (cintersects(horzLine, currLine)) horzCollides = true;
    if (cintersects(vertLine, currLine)) vertCollides = true;
  }

  if (!fullCollides) {
    char = add(char, vel);
    return;
  }

  if (horzCollides == vertCollides) return;

  if (!horzCollides) {
    char.x += vel.x;
    return;
  }

  if (!vertCollides) {
    char.y += vel.y;
    return;
  }
}

function cintersects(line1, line2) {
  var a = line1.a.x, b = line1.a.y, c = line1.b.x, d = line1.b.y;
  var p = line2.a.x, q = line2.a.y, r = line2.b.x, s = line2.b.y;
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};

function nearestOdd(x) {
  let n = Math.floor(x);
  if (n % 2 == 0) n--;
  return n;
}

function add(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; }
function sub(v1, v2) { return { x: v1.x - v2.x, y: v1.y - v2.y }; }
function div(v1, v2) { return { x: v1.x / v2.x, y: v1.y / v2.y }; }
function mul(v1, v2) { return { x: v1.x * v2.x, y: v1.y * v2.y }; }
function scale(v, s) { return { x: v.x * s, y: v.y * s }; }
function mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
function norm(v) { return scale(v, 1 / mag(v)); }
function vec(x, y) { return { x, y }; }
function line(v, w) { return { a: v, b: w }; }
function round(v) { return { x: Math.round(v.x), y: Math.round(v.y) }; }
function floor(v) { return { x: Math.floor(v.x), y: Math.floor(v.y) }; }
function ceil(v) { return { x: Math.ceil(v.x), y: Math.ceil(v.y) }; }
function dist(v, w) { return mag(sub(v, w)); }

init();
