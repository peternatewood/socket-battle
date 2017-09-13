// Ships: Carrier (6), Battleship (5), 2 Destroyers (4), 2 Submarines (3), 2 Patrol Boats (2)
var Ship = function(x, y, size, rad) {
  // Center
  this.x = x;
  this.y = y;
  this.oldX = x;
  this.oldY = y;

  this.size = size;
  this.life = size;

  var shipRad = typeof rad == 'number' ? rad : 1.5 * PI;
  this.rad = shipRad;
  this.targetRad = shipRad;
  this.oldRad = shipRad;

  switch (size) {
    case 2: this.name = 'Patrol Boat'; break;
    case 3: this.name = 'Submarine'; break;
    case 4: this.name = 'Destroyer'; break;
    case 5: this.name = 'Battleship'; break;
    case 6: this.name = 'Carrier'; break;
  }

  return this;
}
Ship.colors = ['', '', ''];
Ship.setColors = function(colors, option) {
  for (var i = 0; i < 3; i++) {
    this.colors[i] = colors[3 * option + i];
  }
};
Ship.prototype.tiles = [];
Ship.prototype.oldTiles = [];
Ship.prototype.onBoard = false;
Ship.prototype.rotate = function() {
  var rad = this.targetRad + PI / 2;
  if (rad > TAU) {
    rad -= TAU;
  }
  this.targetRad = rad;
  startTone(audio, 256, 'square', 0, 0.12);
  startTone(audio, 384, 'square', 0.12, 0.24);
};
Ship.prototype.setTiles = function() {
  var halfSize = (40 * this.size) / 2;
  var bounds = this.getBounds();

  if (bounds.l >= 20 && bounds.r < 540 && bounds.t >= 60 && bounds.b < 580) {
    var col, row, head, tileMax, increment;

    if (this.rad < PI / 2 || (this.rad >= PI && this.rad < 1.5 * PI)) {
      increment = 1;
      col = ((this.x - 20 - halfSize) / 40) >> 0;
      row = ((this.y - 80) / 40) >> 0;
      tileMax = 12 - col;
    }
    else {
      increment = 12;
      col = ((this.x - 40) / 40) >> 0;
      row = ((this.y - 60 - halfSize) / 40) >> 0;
      tileMax = 12 - row;
    }

    head = col + 12 * row;
    tilesOnBoard = tileMax >= this.size ? this.size : this.size - tileMax;

    var tiles = [];
    for (var i = 0; i < tilesOnBoard; i++) {
      tiles.push(head + (i * increment));
    }
    this.tiles = tiles;
  }
  else {
    this.tiles = [];
  }
};
Ship.prototype.getBounds = function() {
  var halfSize = (40 * this.size) / 2;

  if (this.rad == 0 || this.rad == PI) {
    return {
      l: this.x - halfSize,
      r: this.x + halfSize,
      t: this.y - 20,
      b: this.y + 20
    };
  }
  else {
    return {
      l: this.x - 20,
      r: this.x + 20,
      t: this.y - halfSize,
      b: this.y + halfSize
    };
  }
};
Ship.prototype.drop = function(board) {
  // Slot into gameboard grid if within bounds
  if (this.x >= 40 && this.x <= 520 && this.y >= 80 && this.y <= 560) {
    var halfSize = (40 * this.size) / 2;

    if (this.rad == 0 || this.rad == PI) {
      this.x = 40 + 40 * (this.tiles[0] % 12) + halfSize;
      this.y = 80 + 40 * (this.tiles[0] / 12 >> 0) + 20;
    }
    else {
      this.x = 40 + 40 * (this.tiles[0] % 12) + 20;
      this.y = 80 + 40 * (this.tiles[0] / 12 >> 0) + halfSize;
    }

    if (updateBoard(board, this)) {
      this.oldX = this.x;
      this.oldY = this.y;
      this.onBoard = true;
      startTone(audio, 384, 'square', 0, 0.2);
      startTone(audio, 576, 'square', 0, 0.2);
      return;
    }
  }
  // Otherwise put back where it was
  this.x = this.oldX;
  this.y = this.oldY;
  this.rad = this.oldRad;
  this.targetRad = this.oldRad;
  this.tiles = this.oldTiles;
  if (this.onBoard) {
    updateBoard(board, this);
  }
  startTone(audio, 96, 'square', 0, 0.2);
  startTone(audio, 144, 'square', 0, 0.2);
};
Ship.prototype.isMouseOver = function(x, y) {
  var bounds = this.getBounds();

  return x >= bounds.l && x <= bounds.r && y >= bounds.t && y <= bounds.b;
};
Ship.prototype.render = function(context, mouseOver) {
  context.fillStyle = mouseOver ? Ship.colors[2] : Ship.colors[1];
  context.strokeStyle = Ship.colors[0];
  context.lineWidth = 4;

  switch (this.size) {
    case 2:
      context.beginPath();
      context.moveTo(this.x + 32 * Math.cos(this.rad), this.y + 32 * Math.sin(this.rad));
      context.lineTo(this.x + 28 * Math.cos(this.rad + 0.3), this.y + 28 * Math.sin(this.rad + 0.3));
      context.lineTo(this.x + 12 * Math.cos(this.rad + PI / 2), this.y + 12 * Math.sin(this.rad + PI / 2));
      context.lineTo(this.x - 32 * Math.cos(this.rad - 0.4), this.y - 32 * Math.sin(this.rad - 0.4));
      context.lineTo(this.x - 32 * Math.cos(this.rad + 0.4), this.y - 32 * Math.sin(this.rad + 0.4));
      context.lineTo(this.x + 12 * Math.cos(this.rad - PI / 2), this.y + 12 * Math.sin(this.rad - PI / 2));
      context.lineTo(this.x + 28 * Math.cos(this.rad - 0.3), this.y + 28 * Math.sin(this.rad - 0.3));
      context.closePath();
      context.fill();
      context.stroke();

      context.fillStyle = Ship.colors[0];
      context.beginPath();
      context.moveTo(this.x + 6 * Math.cos(this.rad + 1.57), this.y + 6 * Math.sin(this.rad + 1.57));
      context.lineTo(this.x + 18 * Math.cos(this.rad + 0.25), this.y + 18 * Math.sin(this.rad + 0.25));
      context.lineTo(this.x + 18 * Math.cos(this.rad - 0.25), this.y + 18 * Math.sin(this.rad - 0.25));
      context.lineTo(this.x + 6 * Math.cos(this.rad - 1.57), this.y + 6 * Math.sin(this.rad - 1.57));
      context.closePath();
      context.fill();
      break;
    case 3:
      context.beginPath();
      context.moveTo(this.x + 52 * Math.cos(this.rad), this.y + 52 * Math.sin(this.rad));
      context.lineTo(this.x + 42 * Math.cos(this.rad + PI / 16), this.y + 42 * Math.sin(this.rad + PI / 16));
      context.lineTo(this.x + 19 * Math.cos(this.rad + 0.25 * PI), this.y + 19 * Math.sin(this.rad + 0.25 * PI));
      context.lineTo(this.x - 42 * Math.cos(this.rad - PI / 16), this.y - 42 * Math.sin(this.rad - PI / 16));
      context.lineTo(this.x - 52 * Math.cos(this.rad), this.y - 52 * Math.sin(this.rad));
      context.lineTo(this.x - 42 * Math.cos(this.rad + PI / 16), this.y - 42 * Math.sin(this.rad + PI / 16));
      context.lineTo(this.x + 19 * Math.cos(this.rad - 0.25 * PI), this.y + 19 * Math.sin(this.rad - 0.25 * PI));
      context.lineTo(this.x + 42 * Math.cos(this.rad - PI / 16), this.y + 42 * Math.sin(this.rad - PI / 16));
      context.closePath();
      context.fill();
      context.stroke();

      context.fillStyle = Ship.colors[0];
      context.beginPath();
      context.moveTo(this.x + 34 * Math.cos(this.rad), this.y + 34 * Math.sin(this.rad));
      context.lineTo(this.x + 30 * Math.cos(this.rad + PI / 24), this.y + 30 * Math.sin(this.rad + PI / 24));
      context.lineTo(this.x + 20 * Math.cos(this.rad + PI / 16), this.y + 20 * Math.sin(this.rad + PI / 16));
      context.lineTo(this.x + 8 * Math.cos(this.rad), this.y + 8 * Math.sin(this.rad));
      context.lineTo(this.x + 20 * Math.cos(this.rad - PI / 16), this.y + 20 * Math.sin(this.rad - PI / 16));
      context.lineTo(this.x + 30 * Math.cos(this.rad - PI / 24), this.y + 30 * Math.sin(this.rad - PI / 24));
      context.closePath();
      context.fill();
      break;
    case 4:
      context.beginPath();
      context.moveTo(this.x + 72 * Math.cos(this.rad), this.y + 72 * Math.sin(this.rad));
      context.lineTo(this.x + 64 * Math.cos(this.rad + 0.1), this.y + 64 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x + 24 * Math.cos(this.rad + 0.6), this.y + 24 * Math.sin(this.rad + 0.6));
      context.lineTo(this.x - 28 * Math.cos(this.rad - 0.5), this.y - 28 * Math.sin(this.rad - 0.5));
      context.lineTo(this.x - 70 * Math.cos(this.rad - 0.1), this.y - 70 * Math.sin(this.rad - 0.1));
      context.lineTo(this.x - 72 * Math.cos(this.rad), this.y - 72 * Math.sin(this.rad));
      context.lineTo(this.x - 70 * Math.cos(this.rad + 0.1), this.y - 70 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x - 28 * Math.cos(this.rad + 0.5), this.y - 28 * Math.sin(this.rad + 0.5));
      context.lineTo(this.x + 24 * Math.cos(this.rad - 0.6), this.y + 24 * Math.sin(this.rad - 0.6));
      context.lineTo(this.x + 64 * Math.cos(this.rad - 0.1), this.y + 64 * Math.sin(this.rad - 0.1));
      context.closePath();
      context.fill();
      context.stroke();

      context.fillStyle = Ship.colors[0];
      context.beginPath();
      context.moveTo(this.x + 52 * Math.cos(this.rad + 0.05), this.y + 52 * Math.sin(this.rad + 0.05));
      context.lineTo(this.x + 32 * Math.cos(this.rad + 0.15), this.y + 32 * Math.sin(this.rad + 0.15));
      context.lineTo(this.x + 32 * Math.cos(this.rad - 0.15), this.y + 32 * Math.sin(this.rad - 0.15));
      context.lineTo(this.x + 52 * Math.cos(this.rad - 0.05), this.y + 52 * Math.sin(this.rad - 0.05));
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(this.x + 26 * Math.cos(this.rad + 0.2), this.y + 26 * Math.sin(this.rad + 0.2));
      context.lineTo(this.x + 10 * Math.cos(this.rad + 0.8), this.y + 10 * Math.sin(this.rad + 0.8));
      context.lineTo(this.x - 40 * Math.cos(this.rad - 0.1), this.y - 40 * Math.sin(this.rad - 0.1));
      context.lineTo(this.x - 40 * Math.cos(this.rad + 0.1), this.y - 40 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x + 10 * Math.cos(this.rad - 0.8), this.y + 10 * Math.sin(this.rad - 0.8));
      context.lineTo(this.x + 26 * Math.cos(this.rad - 0.2), this.y + 26 * Math.sin(this.rad - 0.2));
      context.closePath();
      context.fill();
      break;
    case 5:
      context.beginPath();
      context.moveTo(this.x + 92 * Math.cos(this.rad), this.y + 92 * Math.sin(this.rad));
      context.lineTo(this.x + 82 * Math.cos(this.rad + 0.1), this.y + 82 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x + 36 * Math.cos(this.rad + 0.4), this.y + 36 * Math.sin(this.rad + 0.4));
      context.lineTo(this.x - 46 * Math.cos(this.rad - 0.3), this.y - 46 * Math.sin(this.rad - 0.3));
      context.lineTo(this.x - 94 * Math.cos(this.rad - 0.1), this.y - 94 * Math.sin(this.rad - 0.1));
      context.lineTo(this.x - 94 * Math.cos(this.rad + 0.1), this.y - 94 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x - 46 * Math.cos(this.rad + 0.3), this.y - 46 * Math.sin(this.rad + 0.3));
      context.lineTo(this.x + 36 * Math.cos(this.rad - 0.4), this.y + 36 * Math.sin(this.rad - 0.4));
      context.lineTo(this.x + 82 * Math.cos(this.rad - 0.1), this.y + 82 * Math.sin(this.rad - 0.1));
      context.closePath();

      context.fill();
      context.stroke();

      context.fillStyle = Ship.colors[0];
      context.beginPath();
      context.moveTo(this.x + 64 * Math.cos(this.rad + 0.03), this.y + 64 * Math.sin(this.rad + 0.03));
      context.lineTo(this.x + 52 * Math.cos(this.rad + 0.05), this.y + 52 * Math.sin(this.rad + 0.05));
      context.lineTo(this.x + 52 * Math.cos(this.rad + 0.12), this.y + 52 * Math.sin(this.rad + 0.12));
      context.lineTo(this.x + 40 * Math.cos(this.rad + 0.2), this.y + 40 * Math.sin(this.rad + 0.2));
      context.lineTo(this.x + 40 * Math.cos(this.rad - 0.2), this.y + 40 * Math.sin(this.rad - 0.2));
      context.lineTo(this.x + 52 * Math.cos(this.rad - 0.12), this.y + 52 * Math.sin(this.rad - 0.12));
      context.lineTo(this.x + 52 * Math.cos(this.rad - 0.05), this.y + 52 * Math.sin(this.rad - 0.05));
      context.lineTo(this.x + 64 * Math.cos(this.rad - 0.03), this.y + 64 * Math.sin(this.rad - 0.03));
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(this.x + 28 * Math.cos(this.rad + 0.1), this.y + 28 * Math.sin(this.rad + 0.1));
      context.lineTo(this.x + 16 * Math.cos(this.rad + 0.2), this.y + 16 * Math.sin(this.rad + 0.2));
      context.lineTo(this.x + 16 * Math.cos(this.rad + 0.45), this.y + 16 * Math.sin(this.rad + 0.45));
      context.lineTo(this.x + 8 * Math.cos(this.rad + 1.57), this.y + 8 * Math.sin(this.rad + 1.57));
      context.lineTo(this.x + 8 * Math.cos(this.rad - 1.57), this.y + 8 * Math.sin(this.rad - 1.57));
      context.lineTo(this.x + 16 * Math.cos(this.rad - 0.45), this.y + 16 * Math.sin(this.rad - 0.45));
      context.lineTo(this.x + 16 * Math.cos(this.rad - 0.2), this.y + 16 * Math.sin(this.rad - 0.2));
      context.lineTo(this.x + 28 * Math.cos(this.rad - 0.1), this.y + 28 * Math.sin(this.rad - 0.1));
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(this.x - 12 * Math.cos(this.rad - 0.5), this.y - 12 * Math.sin(this.rad - 0.5));
      context.lineTo(this.x - 30 * Math.cos(this.rad - 0.2), this.y - 30 * Math.sin(this.rad - 0.2));
      context.lineTo(this.x - 30 * Math.cos(this.rad + 0.2), this.y - 30 * Math.sin(this.rad + 0.2));
      context.lineTo(this.x - 12 * Math.cos(this.rad + 0.5), this.y - 12 * Math.sin(this.rad + 0.5));
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(this.x - 64 * Math.cos(this.rad + 0.03), this.y - 64 * Math.sin(this.rad + 0.03));
      context.lineTo(this.x - 52 * Math.cos(this.rad + 0.05), this.y - 52 * Math.sin(this.rad + 0.05));
      context.lineTo(this.x - 52 * Math.cos(this.rad + 0.12), this.y - 52 * Math.sin(this.rad + 0.12));
      context.lineTo(this.x - 40 * Math.cos(this.rad + 0.2), this.y - 40 * Math.sin(this.rad + 0.2));
      context.lineTo(this.x - 40 * Math.cos(this.rad - 0.2), this.y - 40 * Math.sin(this.rad - 0.2));
      context.lineTo(this.x - 52 * Math.cos(this.rad - 0.12), this.y - 52 * Math.sin(this.rad - 0.12));
      context.lineTo(this.x - 52 * Math.cos(this.rad - 0.05), this.y - 52 * Math.sin(this.rad - 0.05));
      context.lineTo(this.x - 64 * Math.cos(this.rad - 0.03), this.y - 64 * Math.sin(this.rad - 0.03));
      context.closePath();
      context.fill();
      break;
    case 6:
      context.beginPath();
      context.moveTo(this.x + 112 * Math.cos(this.rad + 0.12), this.y + 112 * Math.sin(this.rad + 0.12));
      context.lineTo(this.x - 112 * Math.cos(this.rad - 0.12), this.y - 112 * Math.sin(this.rad - 0.12));
      context.lineTo(this.x - 112 * Math.cos(this.rad + 0.12), this.y - 112 * Math.sin(this.rad + 0.12));
      context.lineTo(this.x + 112 * Math.cos(this.rad - 0.12), this.y + 112 * Math.sin(this.rad - 0.12));
      context.closePath();

      context.fill();
      context.stroke();

      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(this.x + 96 * Math.cos(this.rad), this.y + 96 * Math.sin(this.rad));
      context.lineTo(this.x - 16 * Math.cos(this.rad), this.y - 16 * Math.sin(this.rad));
      context.stroke();
      context.closePath();

      context.fillStyle = Ship.colors[0];
      context.beginPath();
      context.moveTo(this.x - 27.4 * Math.cos(this.rad + 0.45), this.y - 27.4 * Math.sin(this.rad + 0.45));
      context.lineTo(this.x - 25 * Math.cos(this.rad), this.y - 25 * Math.sin(this.rad));
      context.lineTo(this.x - 54 * Math.cos(this.rad), this.y - 54 * Math.sin(this.rad));
      context.lineTo(this.x - 64 * Math.cos(this.rad + 0.2), this.y - 64 * Math.sin(this.rad + 0.2));
      context.closePath();
      context.fill();
      break;
  }
};

function isShipOnBoard(ship) {
  return ship.onBoard;
}
