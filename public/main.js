function ready(fun) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
    fun();
  }
  else {
    document.addEventListener('DOMContentLoaded', fun);
  }
}

function showForm() {
  var spinner = document.getElementById('spinner');
  var form = document.getElementById('form');

  spinner.style.display = 'none';
  form.style.display = 'block';
}

function showGameboard() {
  var form = document.getElementById('form-table');
  var errors = document.getElementById('errors');
  var game = document.getElementById('gameboard');
  var signout = document.getElementById('signout-wrapper');
  var username = document.getElementById('username');
  var password = document.getElementById('password');

  username.value = '';
  password.value = '';
  form.style.display = 'none';
  errors.innerHTML = '';
  game.style.display = 'table';
  signout.style.display = 'block';
}

ready(function() {
  var debug = 0;
  function handleKeyDown(e) {
    if(!e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (e.key == '`') {
        debug =! debug;
      }
      if (typeof heldShip === 'number' && e.key == ' ') {
        ships[heldShip].rotate();
      }
    }
  }
  document.addEventListener('keydown', handleKeyDown);

  var socket = io();

  var isGameInProgress = false;

  var gameData = window.localStorage.getItem('gameData');
  if (gameData) {
    socket.emit('login token', JSON.parse(gameData));
  }
  else {
    showForm();
  }

  socket.on('token valid', function(response) {
    if (response.success) {
      showGameboard();
      gameData = response.gameData;
      window.localStorage.setItem('gameData', JSON.stringify(response.gameData));
    }
    else {
      showForm();
      window.localStorage.removeItem('gameData');
    }
  });

  // Signup/login form
  function handleFormSubmit(event) {
    event.preventDefault();
    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var signupData = {
      username: username.value,
      password: password.value
    };

    var loginOrSignup = event.target.dataset.loginOrSignup;
    if (loginOrSignup) {
      socket.emit(loginOrSignup, signupData);
    }
    else {
      socket.emit('login', signupData);
    }
  }

  document.getElementById('signup').addEventListener('click', handleFormSubmit);
  document.getElementById('login').addEventListener('click', handleFormSubmit);
  document.getElementById('form').addEventListener('submit', handleFormSubmit);

  function handleFormSuccess(response) {
    var errors = document.getElementById('errors');
    errors.innerHTML = response.message;
    errors.className = 'errors valid';

    gameData = {
      username: response.username,
      token: response.token
    };
    window.localStorage.setItem('gameData', JSON.stringify(gameData));

    setTimeout(showGameboard, 400);
  }
  socket.on('signup valid', handleFormSuccess);
  socket.on('login valid', handleFormSuccess);

  function handleErrors(message) {
    var errors = document.getElementById('errors');
    errors.innerHTML = message;
  }
  socket.on('login error', handleErrors);
  socket.on('signup error', handleErrors);

  function handleSignoutClick(event) {
    event.preventDefault();
    socket.emit('signout', gameData.username);
    window.localStorage.removeItem('gameData');

    var spinner = document.getElementById('spinner');
    var formTable = document.getElementById('form-table');
    var form = document.getElementById('form');
    var game = document.getElementById('gameboard');
    var signout = document.getElementById('signout-wrapper');

    spinner.style.display = 'none';
    formTable.style.display = '';
    form.style.display = 'block';
    game.style.display = 'none';
    signout.style.display = 'none';
  }
  document.getElementById('signout').addEventListener('click', handleSignoutClick);

  var trayWidth = 500;

  var fleetBoard = [
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0
  ];
  function clearTiles(board, ship) {
    var bounds = ship.getBounds();
    var increment = ship.direction == 'west' || ship.direction == 'east' ? 1 : 12;
    var shipHead = (bounds.l - 40) / 40 + 12 * (bounds.t - 80) / 40;
    var shipTail = shipHead + increment * ship.size;

    for (var i = shipHead; i < shipTail; i += increment) {
      if (board[i]) {
        board[i] = 0;
      }
    }
  }
  // Returns true only if the ship is overlaying all empty tiles
  function updateBoard(board, ship) {
    var bounds = ship.getBounds();
    var increment = ship.direction == 'west' || ship.direction == 'east' ? 1 : 12;
    var shipHead = (bounds.l - 40) / 40 + 12 * (bounds.t - 80) / 40;
    var shipTail = shipHead + increment * ship.size;

    var tiles = [];
    for (var i = shipHead; i < shipTail; i += increment) {
      // If tile is occupied by a ship
      if (board[i]) {
        return false;
      }
      tiles.push(i);
    }

    for (var i = 0; i < ship.size; i++) {
      board[tiles[i]] = 1;
    }
    return true;
  }

  // 0: no action, 1: targetted, 2: miss, 3: hit
  var targetBoard = [
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0
  ];
  var targetIndex;
  function isOverTargetBoard(x, y) {
    return x >= 680 && x <= 1160 && y >= 80 && y <= 560;
  }
  function setTargetBoardTile(board, x, y) {
    var index = ((x - 680) / 40 >> 0) + 12 * ((y - 80) / 40 >> 0);
    if (typeof board[index] == 'number') {
      if (board[index] == 0) {
        board[index] = 1;
        return index;
      }
    }
    else {
      console.log('No such index', index, 'in target board');
    }
  }

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
        this.horizontalName = 'SUBMARINE';
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
        this.name = 'Aircraft Carrier';
        this.horizontalName = 'AIRCRAFT CARRIER';
        this.verticalName = 'CARRIER';
        break;
    }

    return this;
  }
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
  Ship.prototype.drop = function() {
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

      if (updateBoard(fleetBoard, this)) {
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
    updateBoard(fleetBoard, this);
    this.setRenderPoints();
    this.onBoard = false;
  };
  Ship.prototype.isMouseOver = function(x, y) {
    var bounds = this.getBounds();

    return x >= bounds.l && x <= bounds.r && y >= bounds.t && y <= bounds.b;
  };
  Ship.prototype.render = function(context) {
    context.fillStyle = '#888';
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

  var heldShip;

  var ships = [
    new Ship(740, 450, 6),
    new Ship(780, 430, 5),
    new Ship(820, 410, 4),
    new Ship(860, 390, 3),
    new Ship(900, 390, 3),
    new Ship(940, 370, 2),
    new Ship(980, 370, 2)
  ];

  function isShipOnBoard(ship) {
    return ship.onBoard;
  }

  var mouse = {
    over: false,
    fire: false,
    x: -1,
    y: -1
  };

  var searchingForGame = false;

  var loader = {
    rad: 0,
    spin: Math.PI,
    x: 200,
    y: 200,
    targetX: 200,
    targetY: 200,
    pingX: 0,
    pingY: 0,
    pingS: 0
  };

  var canvas = document.getElementById('canvas');
  // Intercept and stop right-click menu
  canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });
  canvas.addEventListener('mousedown', function(event) {
    var x = event.layerX;
    var y = event.layerY;

    if (isGameInProgress) {
      if (isOverTargetBoard(x, y)) {
        if (typeof targetIndex == 'number') {
          targetBoard[targetIndex] = 0;
        }
        targetIndex = setTargetBoardTile(targetBoard, x, y);
      }
    }
    else {
      if (mouse.fire) {
        if (! searchingForGame && ships.every(isShipOnBoard)) {
          socket.emit('start game', { fleetBoard: fleetBoard, ships: ships });
          searchingForGame = true;
        }
      }
      else {
        for (var i = 0; i < ships.length; i++) {
          if (ships[i].isMouseOver(x, y)) {
            if (event.button == 0) {
              heldShip = i;
              clearTiles(fleetBoard, ships[i]);
            }
            if (typeof heldShip === 'number' && event.button == 2) {
              ships[heldShip].rotate();
            }
            break;
          }
        }
      }
    }
  });
  canvas.addEventListener('mouseup', function(event) {
    if (typeof heldShip === 'number' && event.button == 0) {
      ships[heldShip].drop();
      heldShip = null;
    }
  });
  canvas.addEventListener('mousemove', function(event) {
    var x = event.layerX;
    var y = event.layerY;
    mouse.x = x;
    mouse.y = y;

    if (searchingForGame) {
      loader.targetX = x;
      loader.targetY = y;
    }
    else {
      if (typeof heldShip === 'number') {
        var xDist = x - ships[heldShip].x;
        var yDist = y - ships[heldShip].y;

        ships[heldShip].x += xDist;
        ships[heldShip].y += yDist;
        for (var i = 0; i < 10; i += 2) {
          ships[heldShip].renderPoints[i] += xDist;
          ships[heldShip].renderPoints[i + 1] += yDist;
        }
      }
      else if (isGameInProgress) {
        if (isOverTargetBoard(x, y)) {
          if (!mouse.over) {
            mouse.over = true;
          }
        }
        else if (mouse.over) {
          mouse.over = false;
        }
      }

      if (x >= 520 && x <= 680 && y >= 618 && y <= 680) {
        if (!mouse.fire) {
          mouse.fire = true;
        }
      }
      else if (mouse.fire) {
        mouse.fire = false;
      }
    }
  });
  canvas.addEventListener('mouseout', function(event) {
    mouse.x = -1;
    mouse.y = -1;
  });

  socket.on('joined game', function(response) {
    console.log('Welcome to', response.room, 'Player', response.playerNum);
    gameData.room = response.room;
    gameData.playerNum = response.playerNum;
    window.localStorage.setItem('gameData', JSON.stringify(gameData));
  });

  socket.on('game ready', function() {
    console.log('Game ready');
    searchingForGame = false;
    isGameInProgress = true;
    trayWidth--;
  });

  socket.on('game rejoined', function(response) {
    console.log('Game rejoined', response);
    showGameboard();
    gameData = response.gameData;
    window.localStorage.setItem('gameData', JSON.stringify(response.gameData));

    // Update ships, fleet board, target board
    for (var i = 0; i < response.ships.length; i++) {
      ships[i].x = response.ships[i].x;
      ships[i].y = response.ships[i].y;
      ships[i].onBoard = true;
      ships[i].setRenderPoints();
    }
    for (var i = 0; i < 144; i++) {
      fleetBoard[i] = response.fleetBoard[i];
      targetBoard[i] = response.targetBoard[i];
    }

    if (response.inProgress) {
      trayWidth = 0;
      isGameInProgress = true;
    }
    else {
      searchingForGame = true;
    }
  });

  function step(t) {
    var context = document.getElementById('canvas').getContext('2d');

    var PI = Math.PI;
    var TAU = 2 * PI;

    context.clearRect(0, 0, 1200, 680);
    // Draw grid lines and numbers/letters
    context.lineWidth = 4;
    context.fillStyle = '#333';
    context.strokeStyle = '#333';
    context.strokeRect(40, 80, 480, 480);
    context.strokeRect(680, 80, 480, 480);

    context.lineWidth = 2;
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (var x = 0; x < 12; x++) {
      var xPos = 80 + 40 * x;
      if (x % 2 == 0) {
        context.strokeRect(40, 40 + xPos, 480, 40);
        context.strokeRect(xPos, 80, 40, 480);
        context.strokeRect(680, 40 + xPos, 480, 40);
        context.strokeRect(640 + xPos, 80, 40, 480);
      }

      context.strokeText(x + 1, 20, 20 + xPos);
      context.strokeText(String.fromCharCode(65 + x), xPos - 20, 60);
      context.strokeText(x + 1, 660, 20 + xPos);
      context.strokeText(String.fromCharCode(65 + x), 620 + xPos, 60);
    }

    context.font = '24px Arial';
    context.lineWidth = 1;
    context.strokeText('Your Fleet', 280, 20);
    context.fillText('Your Fleet', 280, 20);
    context.strokeText("The Opponent's Fleet", 920, 20);
    context.fillText("The Opponent's Fleet", 920, 20);

    // Tray of ship pieces
    if (trayWidth > 0) {
      context.fillStyle = '#AAA';
      context.strokeStyle = '#333';
      context.lineWidth = 8;
      context.fillRect(1200 - trayWidth, 60, trayWidth, 520);
      context.strokeRect(1200 - trayWidth, 60, trayWidth + 4, 520);

      context.fillStyle = '#000';
      context.textAlign = 'left';
      context.fillText('Click and drag to place your ships!', 1220 - trayWidth, 100);
      context.fillText('Rotate a grabbed ship with', 1220 - trayWidth, 160);
      context.fillText('the right mouse button or spacebar', 1220 - trayWidth, 200);
      context.fillText("Click the FIRE! button when you're", 1220 - trayWidth, 260);
      context.fillText("ready to start!", 1220 - trayWidth, 300);

      if (trayWidth < 500) {
        trayWidth -= 8;
      }
    }

    // Ships
    for (var i = 0; i < ships.length; i++) {
      ships[i].render(context);
    }

    if (isGameInProgress) {
      for (var i = 0; i < 144; i++) {
        // Target board
        var left = 40 + 40 * (i % 12);
        var top = 80 + 40 * (i / 12 >> 0);
        switch (fleetBoard[i]) {
          case 2:
            context.fillStyle = '#FFF';
            context.beginPath();
            context.arc(left + 20, top + 20, 4, 0, TAU);
            context.fill();
            context.closePath();
            context.strokeStyle = '#FFF';
            context.lineWidth = 4;
            context.beginPath();
            context.arc(left + 20, top + 20, 10, 0, TAU);
            context.stroke();
            context.closePath();
            break;
          case 3:
            var radialGrad = context.createRadialGradient(left + 20, top + 20, 0, left + 20, top + 20, 20);
            radialGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
            radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = radialGrad;
            context.fillRect(left, top, 40, 40);
            break;
        }
        // Fleet board hits/misses
        left += 640;
        switch (targetBoard[i]) {
          case 1:
            context.strokeStyle = '#4F4';
            context.lineWidth = 4;
            context.beginPath();
            context.moveTo(left + 20, top + 4);
            context.lineTo(left + 20, top + 36);
            context.moveTo(left + 4, top + 20);
            context.lineTo(left + 36, top + 20);
            context.moveTo(left + 32, top + 20);
            context.arc(left + 20, top + 20, 12, 0, TAU);
            context.stroke();
            context.closePath();
            break;
          case 2:
            context.strokeStyle = '#FFF';
            context.lineWidth = 4;
            context.beginPath();
            context.moveTo(left + 8, top + 8);
            context.lineTo(left + 32, top + 32);
            context.moveTo(left + 32, top + 8);
            context.lineTo(left + 8, top + 32);
            context.stroke();
            context.closePath();
            break;
          case 3:
            context.fillStyle = '#F44';
            context.beginPath();
            context.arc(left + 20, top + 20, 4, 0, TAU);
            context.fill();
            context.closePath();
            context.strokeStyle = '#F44';
            context.lineWidth = 4;
            context.beginPath();
            context.arc(left + 20, top + 20, 8, 0, TAU);
            context.moveTo(left + 34, top + 20);
            context.arc(left + 20, top + 20, 14, 0, TAU);
            context.stroke();
            context.closePath();
            break;
        }
      }
    }
    if (mouse.over) {
      context.fillStyle = 'rgba(0,0,0,0.2)';
      context.fillRect(40 * (mouse.x / 40 >> 0), 40 * (mouse.y / 40 >> 0), 40, 40);
    }

    // Fire button
    context.fillStyle = '#FF0';
    context.fillRect(520, 618, 160, 62);
    context.fillStyle = '#000';
    context.beginPath();
    context.moveTo(520, 649);
    context.lineTo(535, 618);
    context.lineTo(550, 618);
    context.lineTo(520, 680);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(552, 680);
    context.lineTo(582, 618);
    context.lineTo(597, 618);
    context.lineTo(567, 680);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(603, 680);
    context.lineTo(633, 618);
    context.lineTo(648, 618);
    context.lineTo(618, 680);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(680, 618);
    context.lineTo(650, 680);
    context.lineTo(665, 680);
    context.lineTo(680, 649);
    context.closePath();
    context.fill();
    context.fillStyle = '#AAA';
    context.fillRect(574, 628, 100, 40);
    context.font = '32px Arial';
    context.textAlign = 'right';
    context.fillStyle = '#FFF';
    context.strokeStyle = '#000';
    context.lineWidth = 2;
    context.strokeText('FIRE!', 667, 648);
    context.fillText('FIRE!', 666, 649);
    context.fillStyle = mouse.fire ? '#F88' : '#F00';
    context.beginPath();
    context.arc(548, 649, 22, 0, TAU);
    context.closePath();
    context.fill();
    context.beginPath();
    context.arc(548, 649, 16, 0, TAU);
    context.closePath();
    context.stroke();

    // Loader toy
    if (searchingForGame) {
      var xDist = loader.targetX - loader.x;
      if (xDist >> 0 >= 8) {
        loader.x += Math.max(1, xDist / 12 >> 0);
      }
      else if (xDist) {
        loader.x += xDist;
      }
      var yDist = loader.targetY - loader.y;
      if (yDist >> 0 >= 8) {
        loader.y += Math.max(1, yDist / 12 >> 0);
      }
      else if (yDist) {
        loader.y += yDist;
      }
      loader.rad = Math.atan2(loader.y - 300, loader.x - 600);

      context.fillStyle = 'rgba(0,0,0,0.6)';
      context.fillRect(0, 0, 1200, 680);

      context.fillStyle = '#4F4';
      context.strokeStyle = '#4F4';
      context.lineWidth = 2;
      context.textAlign = 'center';
      context.font = '32px Courier';

      context.fillText('Searching for Partner...', 600, 60);

      context.beginPath();
      context.moveTo(600, 300);
      context.lineTo(loader.x, loader.y);
      context.moveTo(600, 140);
      context.lineTo(600, 460);
      context.moveTo(440, 300);
      context.lineTo(760, 300);
      context.moveTo(600 + 60 * Math.cos(loader.rad - PI / 4), 300 + 60 * Math.sin(loader.rad - PI / 4));
      context.arc(600, 300, 60, loader.rad - PI / 4, loader.rad + PI / 4);
      context.moveTo(600 + 120 * Math.cos(loader.spin - PI / 4), 300 + 120 * Math.sin(loader.spin - PI / 4));
      context.arc(600, 300, 120, loader.spin - PI / 4, loader.spin + Math.PI / 4);
      context.stroke();
      context.closePath();

      context.beginPath();
      context.arc(loader.pingX, loader.pingY, loader.pingS / 10, 0, 2 * Math.PI);
      context.fill();
      context.closePath();

      var spin = loader.spin + PI / 36;
      if (spin > 2 * PI) {
        spin = 0;
      }
      loader.spin = spin;

      if (loader.pingS) {
        loader.pingS--;
      }
      else {
        loader.pingS = 90;
        loader.pingX = (450 + 300 * Math.random()) >> 0;
        loader.pingY = (150 + 300 * Math.random()) >> 0;
      }
    }

    // Mouse cursor
    if (mouse.x >= 0 && mouse.y >= 0) {
      var x = mouse.x;
      var y = mouse.y;
      context.fillStyle = '#FFF';
      context.strokeStyle = '#000';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x - 1, y + 3);
      context.arc(x, y, 3, PI * 0.75, PI * 1.75);
      context.lineTo(x + 10, y + 6);
      context.arc(x + 12, y + 3, 3, PI * 0.75, PI * 1.75);
      context.arc(x + 18, y, 3, PI * 0.75, PI * 1.75);
      context.arc(x + 24, y - 3, 3, PI * 0.75, PI * 1.75);
      context.lineTo(x + 34, y + 11);
      context.lineTo(x + 20, y + 24);
      context.lineTo(x + 17, y + 21);
      context.arc(x + 14, y + 18, 3, PI * 0.25, PI * 0.75);
      context.lineTo(x + 6, y + 15);
      context.arc(x + 9, y + 15, 3, PI * 0.75, PI * 1.375);
      context.closePath();
      context.fill();
      context.stroke();
    }

    // Debug rendering
    if (debug) {
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(0, 0, 240, 240);

      // context.fillStyle='#0F0';
      // for(var y=0;y<600;y+=40){context.fillRect(0,y,1200,1)}
      // for(var x=0;x<1200;x+=40){context.fillRect(x,0,1,600)}

      context.fillStyle = '#333';
      context.textAlign = 'left';
      context.font = '16px Courier';
      for (var i = 0; i < 144; i += 12) {
        context.fillText(fleetBoard.slice(i, i + 12).join(''), 8, 16 + i * 1.2);
      }
    }

    // Pause recursion if the user leaves the tab
    if(!s){var s=t}if(t-s<2000)window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
});
