// Ships: Carrier (6), Battleship (5), 2 Destroyers (4), 2 Submarines (3), 2 Patrol Boats (2)
var Ship = function(x, y, size, direction) {
  // Center
  this.x = x;
  this.y = y;
  this.oldX = x;
  this.oldY = y;

  this.size = size;
  this.life = size;
  this.direction = direction || 'north';

  this.setRenderPoints();

  switch (size) {
    case 2:
      this.name = 'Patrol Boat';
      this.horizontalName = 'PT';
      this.verticalName = 'PT';
      break;
    case 3:
      this.name = 'Submarine';
      this.horizontalName = 'SUB';
      this.verticalName = 'SUB';
      break;
    case 4:
      this.name = 'Destroyer';
      this.horizontalName = 'DESTROYER';
      this.verticalName = 'DESTROY';
      break;
    case 5:
      this.name = 'Battleship';
      this.horizontalName = 'BATTLESHIP';
      this.verticalName = 'BATTLE';
      break;
    case 6:
      this.name = 'Carrier';
      this.horizontalName = 'AIRCRAFT CARRIER';
      this.verticalName = 'CARRIER';
      break;
  }

  return this;
}
Ship.prototype.tiles = [];
Ship.prototype.onBoard = false;
Ship.prototype.setRenderPoints = function() {
  var halfSize = (40 * this.size) / 2;

  switch (this.direction) {
    case 'north':
      this.renderPoints = [
        this.x,      this.y - halfSize +  6,
        this.x + 12, this.y - halfSize + 30,
        this.x + 12, this.y + halfSize -  8,
        this.x - 12, this.y + halfSize -  8,
        this.x - 12, this.y - halfSize + 30
      ];
      break;
    case 'east':
      this.renderPoints = [
        this.x + halfSize -  6, this.y,
        this.x + halfSize - 30, this.y + 12,
        this.x - halfSize +  8, this.y + 12,
        this.x - halfSize +  8, this.y - 12,
        this.x + halfSize - 30, this.y - 12
      ];
      break;
    case 'south':
      this.renderPoints = [
        this.x,      this.y + halfSize - 6,
        this.x + 12, this.y + halfSize - 30,
        this.x + 12, this.y - halfSize +  8,
        this.x - 12, this.y - halfSize +  8,
        this.x - 12, this.y + halfSize - 30
      ];
      break;
    case 'west':
      this.renderPoints = [
        this.x - halfSize +  6, this.y,
        this.x - halfSize + 30, this.y + 12,
        this.x + halfSize -  8, this.y + 12,
        this.x + halfSize -  8, this.y - 12,
        this.x - halfSize + 30, this.y - 12
      ];
      break;
  }
};
Ship.prototype.rotate = function() {
  var halfSize = (40 * this.size) / 2;

  switch (this.direction) {
    case 'north'  : this.direction = 'east'; break;
    case 'east'   : this.direction = 'south'; break;
    case 'south'  : this.direction = 'west'; break;
    case 'west'   : this.direction = 'north'; break;
  }

  this.setRenderPoints();
};
Ship.prototype.getBounds = function() {
  var halfSize = (40 * this.size) / 2;

  if (this.direction == 'north' || this.direction == 'south') {
    return {
      l: this.x - 20,
      r: this.x + 20,
      t: this.y - halfSize,
      b: this.y + halfSize
    };
  }
  else if (this.direction == 'east' || this.direction == 'west') {
    return {
      l: this.x - halfSize,
      r: this.x + halfSize,
      t: this.y - 20,
      b: this.y + 20
    };
  }
};
Ship.prototype.drop = function(board) {
  // Slot into gameboard grid if within bounds
  if (this.x >= 40 && this.x <= 520 && this.y >= 80 && this.y <= 560) {
    var halfSize = (40 * this.size) / 2;

    if (this.direction == 'north' || this.direction == 'south') {
      this.x = Math.min(500, Math.max(60, 40 * (this.x / 40 >> 0) + 20));
      this.y = Math.min(560 - halfSize, Math.max(80 + halfSize, 40 * (this.y / 40 >> 0) + ((this.size % 2) * 20)));
    }
    else if (this.direction == 'east' || this.direction == 'west') {
      this.x = Math.min(520 - halfSize, Math.max(40 + halfSize, 40 * (this.x / 40 >> 0) + ((this.size % 2) * 20)));
      this.y = Math.min(540, Math.max(60, 40 * (this.y / 40 >> 0) + 20));
    }

    if (updateBoard(board, this)) {
      this.oldX = this.x;
      this.oldY = this.y;
      this.setRenderPoints();
      this.onBoard = true;
      return;
    }
  }
  // Otherwise put back where it was
  this.x = this.oldX;
  this.y = this.oldY;
  if (this.onBoard) {
    updateBoard(board, this);
  }
  this.setRenderPoints();
};
Ship.prototype.isMouseOver = function(x, y) {
  var bounds = this.getBounds();

  return x >= bounds.l && x <= bounds.r && y >= bounds.t && y <= bounds.b;
};
Ship.prototype.render = function(context, mouseOver) {
  context.fillStyle = mouseOver ? '#68A' : '#888';
  context.strokeStyle = '#CCC';
  context.lineWidth = 4;

  context.beginPath();
  context.moveTo(this.renderPoints[0], this.renderPoints[1]);
  for (var i = 2; i < 10; i += 2) {
    context.lineTo(this.renderPoints[i], this.renderPoints[i + 1]);
  }
  context.closePath();

  context.fill();
  context.stroke();

  // Ship names
  context.fillStyle = '#000';
  context.strokeStyle = '#000';
  context.lineWidth = 1;
  context.font = '16px Arial';
  context.textAlign = 'center'
  if (this.direction == 'west' || this.direction == 'east') {
    context.fillText(this.horizontalName, this.x + (this.direction == 'west' ? 6 : -6), this.y);
    context.strokeText(this.horizontalName, this.x + (this.direction == 'west' ? 6 : -6), this.y);
  }
  else {
    var start = this.y - 8 * (this.verticalName.length - 1) + (this.direction == 'north' ? 6 : -6);
    for (var i = 0; i < this.verticalName.length; i++) {
      context.fillText(this.verticalName[i], this.x, start + 16 * i);
      context.strokeText(this.verticalName[i], this.x, start + 16 * i);
    }
  }
};

function isShipOnBoard(ship) {
  return ship.onBoard;
}
