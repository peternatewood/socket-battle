ready(function() {
  var socket = io();

  var trayWidth; // Unsigned integer 0..500
  var heldShip, isGameInProgress, searchingForGame; // Booleans

  var debug = 0;
  var gameOver = 0;
  var scene = 'menu';
  var opponentName = 'Opponent';
  var fleetBoard = [];
  var ships = [];

  var mouse = {
    shipIndex: -1,
    overOption: -1,
    over: false,
    fire: false,
    x: -1,
    y: -1
  };

  var shipToy = new Ship(960, 480, 2 + (5 * Math.random() >> 0));
  shipToy.mag = 0;
  shipToy.move = false;
  shipToy.xVel = 0;
  shipToy.yVel = 0;

  var message = {
    content: '',
    text: '',
    length: 0,
    cursor: 0,
    cursorDelay: 0,
    delay: 0,
    flash: false
  };

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

  var radar = {
    x: -1,
    y: -1,
    rad: 0,
    life: 0
  };

  document.addEventListener('keydown', function(e) {
    if(!e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key == '`') {
        e.preventDefault();
        debug =! debug;
      }
      if (typeof heldShip === 'number' && e.key == ' ') {
        e.preventDefault();
        ships[heldShip].rotate();
      }
    }
  });

  var gameData = window.localStorage.getItem('gameData');
  if (gameData) {
    socket.emit('login token', JSON.parse(gameData));
  }
  else {
    showForm();
  }

  // Signup/login form
  function handleSignupClick(event) {
    event.preventDefault();
    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var signupData = {
      username: username.value,
      password: password.value
    };

    socket.emit('signup', signupData);
  }
  function handleFormSubmit(event) {
    event.preventDefault();
    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var signupData = {
      username: username.value,
      password: password.value
    };

    socket.emit('login', signupData);
  }

  document.getElementById('signup').addEventListener('click', handleSignupClick);
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
    setupGame();

    setTimeout(showGameboard, 400);
  }
  socket.on('signup valid', handleFormSuccess);
  socket.on('login valid', handleFormSuccess);

  socket.on('login error', handleErrors);
  socket.on('signup error', handleErrors);

  function handleSignoutClick(event) {
    event.preventDefault();

    socket.emit('signout', gameData.username);
    scene = 'menu';
    window.localStorage.removeItem('gameData');
    setupGame();

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

  // 0: no action, 1: targetted, 2: miss, 3: hit
  var targetBoard = [];
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
      else if (board[index] == 1) {
        board[index] = 0;
        return null;
      }
    }
  }

  function setupGame() {
    trayWidth = 500;
    gameOver = 0;
    searchingForGame = false;
    isGameInProgress = false;

    ships = [
      new Ship(740, 450, 6),
      new Ship(780, 430, 5),
      new Ship(820, 410, 4),
      new Ship(860, 390, 3),
      new Ship(900, 390, 3),
      new Ship(940, 370, 2),
      new Ship(980, 370, 2)
    ];

    fleetBoard = [
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
    targetBoard = [
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

    setupGame();
  });

  function handleMouseDown(event) {
    var x = event.layerX;
    var y = event.layerY;

    switch (scene) {
      case 'menu':
        switch (mouse.overOption) {
          case 0: scene = 'game'; break;
          case 1: break;
          case 2: break;
          default:
            if (!shipToy.move) {
              shipToy.move = true;
              shipToy.sound = [
                startTone(audio, 54 + 8 * (6 - shipToy.size), 'square'),
                startTone(audio, 2 * (54 + 8 * (6 - shipToy.size)), 'square')
              ];
            }
            break;
        }
        break;
      case 'game':
        if (gameOver) {
          setupGame();
          scene = 'menu';
        }
        else if (isGameInProgress) {
          if (isOverTargetBoard(x, y)) {
            var newIndex = setTargetBoardTile(targetBoard, x, y);
            if (typeof targetIndex == 'number') {
              targetBoard[targetIndex] = 0;
            }
            targetIndex = newIndex;
          }
          else if (mouse.fire) {
            if (typeof targetIndex == 'number') {
              socket.emit('fire salvo', targetIndex);
            }
            else {
              setMessage(message, 'Please target a tile');
            }
          }
        }
        else {
          if (mouse.fire) {
            if (! searchingForGame) {
              if (ships.every(isShipOnBoard)) {
                socket.emit('start game', { fleetBoard: fleetBoard, ships: ships });
                mouse.shipIndex = -1;
                mouse.fire = false;
                searchingForGame = true;
              }
              else {
                setMessage(message, 'Please place all your ships');
              }
            }
          }
          else {
            for (var i = 0; i < ships.length; i++) {
              if (ships[i].isMouseOver(x, y)) {
                if (event.button == 0) {
                  heldShip = i;
                  ships[i].oldRad = ships[i].rad;
                  if (ships[i].onBoard) {
                    clearTiles(fleetBoard, ships[i]);
                  }
                }
                if (typeof heldShip === 'number' && event.button == 2) {
                  ships[heldShip].rotate();
                }
                break;
              }
            }
          }
        }

        if (!searchingForGame && x >= 6 && x <= 72 && y >= 606 && y <= 672) {
          radar.x = x;
          radar.y = y;
          radar.life = 60;
          socket.emit('ping radar', { x: x, y: y });
          startTone(audio, 440, 'triangle', 0.2);
        }
        break;
    }
  }
  function handleMouseUp(event) {
    if (typeof heldShip === 'number' && event.button == 0) {
      ships[heldShip].drop(fleetBoard);
      heldShip = null;
    }
    if (shipToy.move) {
      shipToy.move = false;
      shipToy.mag = 0;
      stopTone(audio, shipToy.sound);
    }
  }
  function handleMouseMove(event) {
    var x = event.layerX;
    var y = event.layerY;
    mouse.x = x;
    mouse.y = y;

    switch (scene) {
      case 'menu':
        if (x >= 80 && x <= 480 && y >= 300) {
          if (y <= 400) {
            if (mouse.overOption != 0) {
              mouse.overOption = 0;
            }
          }
          else if (y <= 500) {
            if (mouse.overOption != 1) {
              mouse.overOption = 1;
            }
          }
          else if (y <= 600) {
            if (mouse.overOption != 2) {
              mouse.overOption = 2;
            }
          }
          else if (mouse.overOption >= 0) {
            mouse.overOption = -1;
          }
        }
        else if (mouse.overOption >= 0) {
          mouse.overOption = -1;
        }
        break;
      case 'game':
        if (gameOver) {
          // Highlight new game/menu button
        }
        else if (searchingForGame) {
          loader.targetX = x;
          loader.targetY = y;
        }
        else {
          if (typeof heldShip === 'number') {
            var xDist = x - ships[heldShip].x;
            var yDist = y - ships[heldShip].y;

            ships[heldShip].x += xDist;
            ships[heldShip].y += yDist;
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
          else {
            for (var i = 0; i < ships.length; i++) {
              if (ships[i].isMouseOver(x, y)) {
                if (mouse.shipIndex != i) {
                  mouse.shipIndex = i;
                }
                return;
              }
            }
            if (mouse.shipIndex >= 0) {
              mouse.shipIndex = -1;
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
        break;
    }
  }
  function handleMouseOut(event) {
    mouse.over = false;
    mouse.x = -1;
    mouse.y = -1;

    if (shipToy.move) {
      shipToy.move = false;
      shipToy.mag = 0;
      stopTone(audio, shipToy.sound);
    }
  }

  var canvas = document.getElementById('canvas');
  // Intercept and stop right-click menu
  canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseout', handleMouseOut);

  function receiveRadarBlip(coords) {
    radar.x = coords.x;
    radar.y = coords.y;
    radar.life = 60;
    startTone(audio, 880, 'triangle', 0.2);
  }
  socket.on('radar blip', receiveRadarBlip);

  socket.on('joined game', function(response) {
    gameData.room = response.room;
    gameData.playerNum = response.playerNum;
    window.localStorage.setItem('gameData', JSON.stringify(gameData));
  });

  socket.on('game ready', function(opponent) {
    opponentName = opponent;
    searchingForGame = false;
    isGameInProgress = true;
    trayWidth--;
  });

  socket.on('game rejoined', function(response) {
    scene = 'game';
    showGameboard();
    gameData = response.gameData;
    window.localStorage.setItem('gameData', JSON.stringify(response.gameData));
    if (response.opponent) {
      opponentName = response.opponent;
    }

    // Update ships, fleet board, target board
    for (var i = 0; i < response.ships.length; i++) {
      var rShip = response.ships[i];
      var ship = new Ship(rShip.x, rShip.y, rShip.size, rShip.rad);
      ship.onBoard = true;
      ships.push(ship);
    }
    for (var i = 0; i < 144; i++) {
      fleetBoard.push(response.fleetBoard[i]);
      targetBoard.push(response.targetBoard[i]);
    }

    if (response.inProgress) {
      trayWidth = 0;
      isGameInProgress = true;
    }
    else {
      searchingForGame = true;
    }
  });

  socket.on('opponent signout', function() {
    setMessage(message, opponentName + ' has quit!', true);
    setupGame();
  });
  socket.on('not your turn', function() {
    setMessage(message, "It's not your turn yet!", true);
  });
  socket.on('tile already hit', function() {
    setMessage(message, "You've already hit this tile", true);
  });

  socket.on('salvo missed', function(index) {
    setMessage(message, 'Your salvo missed');
    targetIndex = null;
    targetBoard[index] = 2;
  });
  socket.on('ships missed', function(index) {
    setMessage(message, opponentName + "'s salvo missed");
    fleetBoard[index] = 2;
  });

  socket.on('salvo hit', function(response) {
    if (response.sunk) {
      setMessage(message, opponentName + "'s " + response.name + ' sunk!', true);
    }
    else {
      setMessage(message, 'You hit a ' + response.name);
    }

    targetIndex = null;
    targetBoard[response.index] = 3;
  });
  socket.on('ship hit', function(response) {
    if (response.sunk) {
      setMessage(message, opponentName + ' sunk your ' + response.name + '!', true);
    }
    else {
      setMessage(message, opponentName + ' hit your ' + response.name);
    }

    fleetBoard[response.index] = 3;
  });

  socket.on('winner', function(opponent) {
    mouse.over = false;
    mouse.fire = false;
    gameOver = 1;
  });
  socket.on('loser', function(opponent) {
    mouse.over = false;
    mouse.fire = false;
    gameOver = -1;
  });

  function step(t) {
    var context = document.getElementById('canvas').getContext('2d');

    var PI = Math.PI;
    var TAU = 2 * PI;

    context.clearRect(0, 0, 1200, 680);

    switch (scene) {
      case 'menu':
        // Ship toy
        if (shipToy.move && mouse.x >= 0 && mouse.y >= 0) {
          var dir;
          var targetR = (TAU + Math.atan2(mouse.y - shipToy.y, mouse.x - shipToy.x)) % TAU;
          var diff = targetR - shipToy.rad;

          if (Math.abs(diff) > PI) {
            dir = diff > 0 ? -1 : 1;
          }
          else if (Math.abs(diff) > 0.1) {
            dir = diff > 0 ? 1 : -1;
          }
          else {
            dir = 0;
          }

          if (shipToy.mag < 1) {
            shipToy.mag += 0.1;
          }

          shipToy.rad = (TAU + shipToy.rad + dir * 0.01) % TAU;
          shipToy.xVel = shipToy.mag * Math.cos(shipToy.rad);
          shipToy.yVel = shipToy.mag * Math.sin(shipToy.rad);
        }

        if (shipToy.xVel != 0) {
          var xVel = shipToy.xVel * 0.95;
          if (xVel < 0.01 && xVel > -0.01) {
            xVel = 0;
          }
          shipToy.xVel = xVel;
          shipToy.y += shipToy.yVel;
        }

        if (shipToy.yVel != 0) {
          var yVel = shipToy.yVel * 0.95;
          if (yVel < 0.01 && yVel > -0.01) {
            yVel = 0;
          }
          shipToy.yVel = yVel;
          shipToy.x += shipToy.xVel;
        }

        context.lineWidth = 4;

        if (shipToy.xVel != 0 || shipToy.yVel != 0) {
          var mag = 24 * Math.sqrt(Math.pow(shipToy.xVel, 2) + Math.pow(shipToy.yVel, 2));
          var halfSize = 40 * (shipToy.size / 2);
          context.strokeStyle = '#FFF';

          context.beginPath();
          context.moveTo(shipToy.x - (halfSize - 8) * Math.cos(shipToy.rad), shipToy.y - (halfSize - 8) * Math.sin(shipToy.rad));
          context.lineTo(shipToy.x - (halfSize + mag) * Math.cos(shipToy.rad), shipToy.y - (halfSize + mag) * Math.sin(shipToy.rad));
          context.moveTo(shipToy.x - (halfSize - 12) * Math.cos(shipToy.rad - 0.16), shipToy.y - (halfSize - 12) * Math.sin(shipToy.rad - 0.16));
          context.lineTo(shipToy.x - (halfSize + mag) * Math.cos(shipToy.rad - 0.16), shipToy.y - (halfSize + mag) * Math.sin(shipToy.rad - 0.16));
          context.moveTo(shipToy.x - (halfSize - 12) * Math.cos(shipToy.rad + 0.16), shipToy.y - (halfSize - 12) * Math.sin(shipToy.rad + 0.16));
          context.lineTo(shipToy.x - (halfSize + mag) * Math.cos(shipToy.rad + 0.16), shipToy.y - (halfSize + mag) * Math.sin(shipToy.rad + 0.16));
          context.stroke();
          context.closePath();
        }

        shipToy.render(context);

        // Title
        context.fillStyle = '#331';
        context.font = '120px Black Ops One, Georgia';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.fillText('Sea Battle', 64, 80);

        // Menu options
        context.lineWidth = 2;
        context.font = '48px Audiowide, Arial';
        if (mouse.overOption == 0) {
          context.fillStyle = '#DC4';
          context.strokeStyle = '#A90';
        }
        else {
          context.fillStyle = '#BA4';
          context.strokeStyle = '#870';
        }
        context.fillText('Start Game', 120, 320);
        context.strokeText('Start Game', 120, 320);
        if (mouse.overOption == 1) {
          context.fillStyle = '#DC4';
          context.strokeStyle = '#A90';
        }
        else {
          context.fillStyle = '#BA4';
          context.strokeStyle = '#870';
        }
        context.fillText('Tournament', 120, 420);
        context.strokeText('Tournament', 120, 420);
        if (mouse.overOption == 2) {
          context.fillStyle = '#DC4';
          context.strokeStyle = '#A90';
        }
        else {
          context.fillStyle = '#BA4';
          context.strokeStyle = '#870';
        }
        context.fillText('Options', 120, 520);
        context.strokeText('Options', 120, 520);
        break;
      case 'game':
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

        context.font = '24px Audiowide, Arial';
        context.lineWidth = 1;
        context.strokeText('Your Fleet', 280, 20);
        context.fillText('Your Fleet', 280, 20);
        context.strokeText(opponentName, 920, 20);
        context.fillText(opponentName, 920, 20);

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

          context.fillText('Patrol Boats', 1510 - trayWidth, 390);
          context.fillText('Submarines', 1420 - trayWidth, 430);
          context.fillText('Destroyer', 1340 - trayWidth, 470);
          context.fillText('Battleship', 1300 - trayWidth, 510);
          context.fillText('Aircraft Carrier', 1260 - trayWidth, 550);

          if (trayWidth < 500) {
            trayWidth -= 8;
          }
        }

        // Ships
        for (var i = 0; i < ships.length; i++) {
          var radDiff = ships[i].targetRad - ships[i].rad;
          if (radDiff) {
            if (radDiff > 0.26) {
              ships[i].rad = (TAU + ships[i].rad + 0.26) % TAU;
            }
            else {
              ships[i].rad = (TAU + ships[i].targetRad) % TAU;
              if (ships[i].targetRad > 5) {
                ships[i].targetRad = 0;
              }
            }
          }
          ships[i].render(context, mouse.shipIndex == i);
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

        // Fire button background
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
        // FIRE! text
        context.font = '32px Audiowide, Arial';
        context.textAlign = 'right';
        context.fillStyle = '#FFF';
        context.shadowBlur = 8;
        context.shadowColor = '#000';
        context.fillText('FIRE!', 670, 649);
        context.fillText('FIRE!', 670, 649);
        context.shadowBlur = 0;
        // Red button
        context.fillStyle = mouse.fire ? '#F88' : '#F00';
        context.beginPath();
        context.arc(550, 649, 22, 0, TAU);
        context.closePath();
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#000';
        context.beginPath();
        context.arc(550, 649, 16, 0, TAU);
        context.closePath();
        context.stroke();

        // Message display
        if (message.flash && message.delay > 0) {
          if ((message.delay / 10 >> 0) % 2) {
            if (message.text) {
              message.text = '';
            }
          }
          else if (message.text == '') {
            message.text = message.content;
          }
          message.delay--;
          if (message.delay == 0) {
            message.flash = false;
          }
        }
        else if (message.cursor < message.length) {
          message.cursor += 0.5;
          message.text = message.content.slice(0, message.cursor >> 0);
          if (message.cursor >= 34) {
            message.cursor = 33;
          }
        }
        else {
          if (message.cursorDelay == 0) {
            message.cursorDelay = 96;
          }
          else {
            message.cursorDelay--;
          }
        }

        context.fillStyle = '#888';
        context.beginPath();
        context.moveTo(684, 622);
        context.lineTo(680, 618);
        context.lineTo(1200, 618);
        context.lineTo(1200, 680);
        context.lineTo(1196, 676);
        context.closePath();
        context.fill();
        context.fillStyle = '#CCC';
        context.beginPath();
        context.moveTo(684, 622);
        context.lineTo(680, 618);
        context.lineTo(680, 680);
        context.lineTo(1200, 680);
        context.lineTo(1196, 676);
        context.closePath();
        context.fill();
        context.fillStyle = '#030';
        context.fillRect(684, 622, 512, 54);
        context.fillStyle = '#4F4';
        context.font = '24px Roboto Mono, Courier';
        context.textAlign = 'left';
        context.fillText(message.text, 694, 649);
        if (message.cursorDelay > 48) {
          context.fillText('_', 694 + 14 * (message.cursor + 1), 649);
        }

        // Radar toy
        var rad = radar.rad + PI / 72;
        if (rad >= TAU) {
          rad -= TAU;
        }
        radar.rad = rad;
        context.fillStyle = '#888';
        context.beginPath();
        context.moveTo(0, 600);
        context.lineTo(80, 600);
        context.lineTo(80, 680);
        context.closePath();
        context.fill();
        context.fillStyle = '#CCC';
        context.beginPath();
        context.moveTo(0, 600);
        context.lineTo(80, 680);
        context.lineTo(0, 680);
        context.closePath();
        context.fill();
        context.fillStyle = '#030';
        context.fillRect(6, 606, 68, 68);
        context.lineWidth = 1;
        context.strokeStyle = '#4F4';
        context.beginPath();
        context.moveTo(40, 606);
        context.lineTo(40, 674);
        context.moveTo(6, 640);
        context.lineTo(74, 640);
        context.moveTo(55, 640);
        context.arc(40, 640, 15, 0, TAU);
        context.moveTo(70, 640);
        context.arc(40, 640, 30, 0, TAU);
        context.moveTo(40, 640);
        context.lineTo(40 + 30 * Math.cos(radar.rad), 640 + 30 * Math.sin(radar.rad));
        context.closePath();
        context.stroke();
        // Radar blip
        if (radar.life > 0) {
          context.fillStyle = '#4F4';
          context.beginPath();
          context.arc(radar.x, radar.y, radar.life / 10, 0, TAU);
          context.closePath();
          context.fill();
          radar.life--;
        }

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
          context.font = '32px Roboto Mono, Courier';

          context.fillText('Searching for Opponent...', 600, 60);

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
          if (spin > TAU) {
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

        // Game Over message
        if (gameOver) {
          context.fillStyle = 'rgba(255,255,255,0.7)';
          context.fillRect(0, 0, 1200, 680);

          context.lineWidth = 2;
          context.font = '120px Black Ops One, Georgia';
          context.textAlign = 'center';

          // Winner
          if (gameOver > 0) {
            context.fillStyle = '#4CD';
            context.strokeStyle = '#09A';
            context.fillText('You defeated', 600, 300);
            context.strokeText('You defeated', 600, 300);
            context.fillText(opponentName, 600, 420);
            context.strokeText(opponentName, 600, 420);
          }
          // Loser
          else {
            context.fillStyle = '#DC4';
            context.strokeStyle = '#A90';
            context.fillText('You lost to', 600, 300);
            context.strokeText('You lost to', 600, 300);
            context.fillText(opponentName, 600, 420);
            context.strokeText(opponentName, 600, 420);
          }
        }
        break;
    }

    // Mouse cursor
    if (mouse.x >= 0 && mouse.y >= 0) {
      var x = mouse.x;
      var y = mouse.y;

      if (mouse.shipIndex >= 0) {
        context.fillStyle = '#ADF';
      }
      else if (mouse.over) {
        context.fillStyle = '#AFA';
      }
      else if (mouse.fire) {
        context.fillStyle = '#FDA';
      }
      else {
        context.fillStyle = '#FFF';
      }

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
      context.arc(x + 9, y + 15, 3, PI * 0.75, PI * 1.375);
      context.lineTo(x + 12, y + 16);
      context.closePath();
      context.fill();
      context.stroke();
    }

    // Debug rendering
    if (debug) {
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(0, 0, 240, 240);
      context.fillRect(1000, 0, 200, 200);

      // context.fillStyle='#0F0';
      // for(var y=0;y<600;y+=40){context.fillRect(0,y,1200,1)}
      // for(var x=0;x<1200;x+=40){context.fillRect(x,0,1,600)}

      context.fillStyle = '#333';
      context.textAlign = 'left';
      context.font = '16px Roboto Mono, Courier';
      for (var i = 0; i < 144; i += 12) {
        context.fillText(fleetBoard.slice(i, i + 12).join(''), 8, 16 + i * 1.2);
      }
      if (typeof heldShip == 'number') {
        context.fillText('Ship: ' + ships[heldShip].x + ', ' + ships[heldShip].y, 8, 200);
      }
      // context.fillText('Mouse X:', 1032, 32);
      // context.fillText(mouse.x, 1132, 32);
      // context.fillText('Mouse Y:', 1032, 64);
      // context.fillText(mouse.y, 1132, 64);

      context.fillText('Ship Rad:', 1032, 32);
      context.fillText(shipToy.rad, 1132, 32);
      context.fillText('Ship Target:', 1032, 64);
      context.fillText(shipToy.targetR, 1132, 64);

      context.strokeStyle = '#000';
      context.lineWidth = 2;
      for (var row = 0; row < 6; row++) {
        for (var col = 0; col < 7; col++) {
          context.strokeRect(720 + 40 * col, 330 + 40 * row, 40, 40);
        }
      }
    }

    // Pause recursion if the user leaves the tab
    if(!s){var s=t}if(t-s<2000)window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
});
