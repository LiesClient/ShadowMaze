function equalLine(l1, l2) {
  return equalPoint(l1.a, l2.a) && equalPoint(l1.b, l2.b);
}

function equalPoint(v, w) {
  return (v.x == w.x) && (v.y == w.y);
}

function generateLines(mazeSize, cell, screenSize) {
  let w = mazeSize.x, h = mazeSize.y, width = cell.x, height = cell.y;
  let maze = generateMaze(h, w);

  // generate lines
  let genLines = [];
  let casts = [];
  let epsilon = 0.1;
  let bugOffset = 0.01;
  let roundFactor = 1000;
  
  for (let i = 0; i < maze.length; i++) {
    for (let j = 0; j < maze[i].length; j++) {
      // (j, i)
      if (maze[i][j] == 0) continue;

      let up = 0,
          down = 1,
          left = 2,
          right = 3;

      let nbs = [
        maze?.[i - 1]?.[j + 0] == 1, // up
        maze?.[i + 1]?.[j + 0] == 1, // down
        maze?.[i + 0]?.[j - 1] == 1, // left
        maze?.[i + 0]?.[j + 1] == 1, // right
      ];

      // vertical full length
      if (nbs[0] && nbs[1]) genLines.push({ a: { x: width * (j + 0.5), y: height * i - bugOffset }, b: { x: width * (j + 0.5), y: height * (i + 1) + bugOffset } });
      // horizontal full length
      if (nbs[2] && nbs[3]) genLines.push({ a: { x: width * j - bugOffset, y: height * (i + 0.5) }, b: { x: width * (j + 1) + bugOffset, y: height * (i + 0.5) } });
      // vertical (up) half length
      if (nbs[0] && !nbs[1]) genLines.push({ a: { x: width * (j + 0.5), y: height * i - bugOffset }, b: { x: width * (j + 0.5), y: height * (i + 0.5) } });
      // vertical (down) half length
      if (nbs[1] && !nbs[0]) genLines.push({ a: { x: width * (j + 0.5), y: height * (i + 1) + bugOffset }, b: { x: width * (j + 0.5), y: height * (i + 0.5) } });
      // horizontal (left) half length
      if (nbs[2] && !nbs[3]) genLines.push({ a: { x: width * j - bugOffset, y: height * (i + 0.5) }, b: { x: width * (j + 0.5), y: height * (i + 0.5) } });
      // horizontal (right) half length
      if (nbs[3] && !nbs[2]) genLines.push({ a: { x: width * (j + 1) + bugOffset, y: height * (i + 0.5) }, b: { x: width * (j + 0.5), y: height * (i + 0.5) } });

      // middle cast point
      if(nbs[up] != nbs[down] || nbs[left] != nbs[right]) {
        // main cast (required)
        casts.push({ x: width * (j + 0.5), y: height * (i + 0.5) });

        casts.push({ x: width * (j + 0.5) + epsilon, y: height * (i + 0.5) + epsilon }); // top left
        casts.push({ x: width * (j + 0.5) + epsilon, y: height * (i + 0.5) - epsilon }); // top right
        casts.push({ x: width * (j + 0.5) - epsilon, y: height * (i + 0.5) + epsilon }); // bottom left
        casts.push({ x: width * (j + 0.5) - epsilon, y: height * (i + 0.5) - epsilon }); // bottom right
      }

      if (nbs.every(n => n)) {
        casts.push({ x: width * (j + 0.5), y: height * (i + 0.5) }); 
      }
    }
  }

  
  for (let i = 0; i < genLines.length; i++) {
    genLines[i].a.x = Math.round(genLines[i].a.x * roundFactor) / roundFactor;
    genLines[i].b.x = Math.round(genLines[i].b.x * roundFactor) / roundFactor;
    genLines[i].a.y = Math.round(genLines[i].a.y * roundFactor) / roundFactor;
    genLines[i].b.y = Math.round(genLines[i].b.y * roundFactor) / roundFactor;
  }

  for (let i = 0; i < casts.length; i++) {
    casts[i].x = Math.round(casts[i].x * roundFactor) / roundFactor;
    casts[i].y = Math.round(casts[i].y * roundFactor) / roundFactor;
  }

  for (let i = genLines.length - 1; i >= 0; i--) {
    let line = genLines[i];
    if(!line) continue;
    for (let j = genLines.length - 1; j >= 0; j--) {
      if (i == j) continue;
      
      let line2 = genLines[j];
      let aDir = line.a.x == line.b.x;
      let bDir = line2.a.x == line2.b.x;
      if (aDir !== bDir) continue;
      
      let shares = 0;
      if (equalPoint(line.a, line2.a)) shares = 1;     // i.a = j.a
      else if (equalPoint(line.a, line2.b)) shares = 2;// i.a = j.b
      else if (equalPoint(line.b, line2.a)) shares = 3;// i.b = j.a
      else if (equalPoint(line.b, line2.b)) shares = 4;// i.b = j.b
      else continue;
      
      if (shares == 1) line.a = line2.b;
      else if (shares == 2) line.a = line2.a;
      else if (shares == 3) line.b = line2.b;
      else if (shares == 4) line.b = line2.a;
      genLines.splice(j, 1);
    }
  }

  // for (let i = 0; i < casts.length; i++) {
  //   casts[i].x += bugOffset;
  //   casts[i].y += bugOffset;
  // }

  return { lines: genLines, maze: maze, casts: casts };
}

function generateMaze(w, h) {
  function newMaze() {
    var newMaze = new Array(w);
    for (let i = 0; i < w; i++)
      newMaze[i] = new Array(h).fill(0);
    return newMaze;
  }
  
  let grid = newMaze(w, h);
  
  function addOuterWalls() {
    for (i = 0; i < grid.length; i++) {
      grid[i][0] = 1;
      grid[i][grid[0].length - 1] = 1;
    }

    for (i = 0; i < grid[0].length; i++) {
      grid[0][i] = 1;
      grid[grid.length - 1][i] = 1;
    }
  }
  function addInnerWalls(h, minX, maxX, minY, maxY) {
    if (h) {
      if (maxX - minX < 2) return;

      var y = Math.floor(randomNumber(minY, maxY) / 2) * 2;
      
      addHWall(minX, maxX, y);
      addInnerWalls(!h, minX, maxX, minY, y - 1);
      addInnerWalls(!h, minX, maxX, y + 1, maxY);
    } else {
      if (maxY - minY < 2) return;

      var x = Math.floor(randomNumber(minX, maxX) / 2) * 2;
      
      addVWall(minY, maxY, x);
      addInnerWalls(!h, minX, x - 1, minY, maxY);
      addInnerWalls(!h, x + 1, maxX, minY, maxY);
    }
  }

  function addHWall(minX, maxX, y) {
    var hole = Math.floor(randomNumber(minX, maxX) / 2) * 2 + 1;

    for (var i = minX; i <= maxX; i++) {
      if (i == hole) grid[y][i] = 0;
      else grid[y][i] = 1;
    }
  }
  function addVWall(minY, maxY, x) {
    var hole = Math.floor(randomNumber(minY, maxY) / 2) * 2 + 1;

    for (var i = minY; i <= maxY; i++) {
      if (i == hole) grid[i][x] = 0;
      else grid[i][x] = 1;
    }
  }
  function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  
  addInnerWalls((Math.random() > 0.5), 1, grid[0].length - 2, 1, grid.length - 2);

  // for (let i = 0; i < 5; i++) {
  //   grid[i + 5][10] = 1;
  // }
  addOuterWalls();

  return grid;
}
