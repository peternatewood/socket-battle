ready(function() {
  var socket = io();

  var trayWidth; // Unsigned integer 0..500
  var heldShip, isGameInProgress, searchingForGame, opponentDisconnected; // Booleans

  var debug = 0;
  var winner = 0;
  var overOption = -1;
  var overRow = -1;
  var gameOver = false;
  var allowFiring = true;
  var previousScene = '';
  var scene = 'menu';
  var opponentName = 'Opponent';
  var fleetBoard = [];
  var ships = [];

  // Ensure prerendering doesn't happen until fonts are loaded
  WebFont.load({
    google: {
      families: ['Audiowide', 'Black Ops One', 'Roboto Mono']
    },
    active: prerender
  });

  // Prerenders
  var title = document.getElementById('title');
  var menuText = document.getElementById('menu-text');
  var fireButton = document.getElementById('fire-button');
  var messageCanvas = document.getElementById('message');
  var directions = document.getElementById('directions');
  var loading = document.getElementById('loading');
  var optionsText = document.getElementById('options-text');

  var optionShips = [
    new Ship(460, 532, 2, 5.49),
    new Ship(520, 532, 3, 5.49),
    new Ship(580, 532, 4, 5.49),
    new Ship(640, 532, 5, 5.49),
    new Ship(700, 532, 6, 5.49)
  ];

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

  var splash = {
    tile: -1,
    life: 0
  };

  var shipExplosion = {
    sunk: false,
    tile: -1,
    life: 0,
    name: ''
  };

  var targetMiss = {
    tile: -1,
    life: 0
  };

  var targetHit = {
    sunk: false,
    tile: -1,
    life: 0,
    name: ''
  };

  var message = {
    length: 0,
    cursor: 0,
    cursorX: 694,
    width: 0,
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
    showPing: false,
    pingX: 0,
    pingY: 0,
    pingS: 0,
    pingR: 0
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

  var options = window.localStorage.getItem('options');
  if (!options) {
    options = {
      mute: true,
      background: 0,
      gameboard: 0,
      ships: 0
    };

    updateOptions();
  }
  else {
    options = JSON.parse(options);
  }
  audio.mute = options.mute;
  document.body.style['background-color'] = backgroundColors[options.background];
  document.getElementById('canvas').style['background-color'] = gameboardColors[options.gameboard];
  Ship.setColors(shipColors, options.ships);

  // If no option name provided, just save all options in local storage
  function updateOptions(name, value) {
    if (name && typeof options[name] != 'undefined') {
      options[name] = value;

      switch (name) {
        case 'mute':
          audio.mute = value;
          break;
        case 'background':
          document.body.style['background-color'] = backgroundColors[overOption];
          break;
        case 'gameboard':
          document.getElementById('canvas').style['background-color'] = gameboardColors[overOption];
          break;
        case 'ships':
          Ship.setColors(shipColors, options.ships);
          break;
      }
    }
    window.localStorage.setItem('options', JSON.stringify(options));
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

    startTone(audio, 330, 'sine', 0, 0.15);
    startTone(audio, 440, 'sine', 0.15, 0.3);
    setTimeout(showGameboard, 400);
  }
  socket.on('signup valid', handleFormSuccess);
  socket.on('login valid', handleFormSuccess);

  socket.on('login error', handleErrors);
  socket.on('signup error', handleErrors);

  function quitGame() {
    socket.emit('quit to menu');
    scene = 'menu';
    delete gameData.playerNum;
    delete gameData.room;
    window.localStorage.setItem('gameData', JSON.stringify(gameData));
    setupGame();
  }

  function handleBackClick(event) {
    event.preventDefault();
    if (scene == 'options') {
      if (previousScene) {
        scene = previousScene;
        previousScene = '';
      }
      else {
        scene = 'menu';
      }
    }
  }
  document.getElementById('back').addEventListener('click', handleBackClick);

  function handleMenuClick(event) {
    event.preventDefault();
    quitGame();
  }
  document.getElementById('menu').addEventListener('click', handleMenuClick);

  function handleOptionsClick(event) {
    event.preventDefault();
    previousScene = scene;
    scene = 'options';
  }
  document.getElementById('options').addEventListener('click', handleOptionsClick);

  socket.on('opponent quit', function() {
    setMessage(message, opponentName + ' quit the game', true);
    setTimeout(quitGame, 600);
  });

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
    var nav = document.getElementById('nav');

    spinner.className = 'hide';
    formTable.className = '';
    form.className = '';
    game.className = 'hide';
    nav.className = 'hide';
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
    gameOver = false;
    winner = 0;
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
    var rect = document.getElementById('canvas').getBoundingClientRect();
    var x = (event.clientX - rect.left) * (1200 / rect.width);
    var y = (event.clientY - rect.top) * (1200 / rect.width);

    switch (scene) {
      case 'menu':
        switch (mouse.overOption) {
          case 0: scene = 'game'; break;
          case 1: break;
          case 2: scene = 'options'; break;
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
      case 'options':
        switch (overRow) {
          case 0:
            if (overOption >= 0) {
              options.background = overOption;
              updateOptions('background', overOption);
            }
            break;
          case 1:
            if (overOption >= 0) {
              options.gameboard = overOption;
              updateOptions('gameboard', overOption);
            }
            break;
          case 2:
            if (overOption >= 0) {
              options.ships = overOption;
              updateOptions('ships', overOption);
            }
            break;
          case 3:
            options.mute = !options.mute;
            updateOptions('mute', options.mute);
            break;
        }
        break;
      case 'game':
        if (gameOver) {
          setupGame();
          socket.emit('quit to menu');
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
          else if (mouse.fire && allowFiring) {
            if (typeof targetIndex == 'number') {
              allowFiring = false;
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
                  ships[i].oldTiles = ships[i].tiles;
                  if (ships[i].onBoard) {
                    clearTiles(fleetBoard, ships[i]);
                  }
                  startTone(audio, 192, 'square', 0, 0.2);
                  startTone(audio, 288, 'square', 0, 0.2);
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
          startTone(audio, 440, 'triangle', 0, 0.2);
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
    var rect = document.getElementById('canvas').getBoundingClientRect();
    var x = (event.clientX - rect.left) * (1200 / rect.width);
    var y = (event.clientY - rect.top) * (1200 / rect.width);

    mouse.x = x;
    mouse.y = y;

    switch (scene) {
      case 'menu':
        if (x >= 80 && x <= 480 && y >= 300) {
          if (y <= 400) {
            if (mouse.overOption != 0) {
              mouse.overOption = 0;
              startTone(audio, 128, 'triangle', 0, 0.2);
            }
          }
          else if (y <= 500) {
            if (mouse.overOption != 1) {
              mouse.overOption = 1;
              startTone(audio, 128, 'triangle', 0, 0.2);
            }
          }
          else if (y <= 600) {
            if (mouse.overOption != 2) {
              mouse.overOption = 2;
              startTone(audio, 128, 'triangle', 0, 0.2);
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
      case 'options':
        if (y >= 128 && y <= 182) {
          if (x >= 720 && x <= 1200) {
            if (overRow != 3) {
              overRow = 3;
            }
          }
          else if (overRow >= 0) {
            overRow = -1;
          }
        }
        else if (y >= 182 && y <= 242) {
          if (overRow != 0) {
            overRow = 0;
          }
        }
        else if (y >= 342 && y <= 402) {
          if (overRow != 1) {
            overRow = 1;
          }
        }
        else if (y >= 502 && y <= 562) {
          if (overRow != 2) {
            overRow = 2;
          }
        }
        else if (overRow >= 0) {
          overRow = -1;
        }

        if (overRow >= 0 && x >= 38 && x <= 408) {
          var option = ((x - 48) / 60) >> 0;
          if (overOption != option) {
            overOption = option;
          }
        }
        else if (overOption >= 0) {
          overOption = -1;
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
            ships[heldShip].setTiles();
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
                  startTone(audio, 256 - 16 * ships[i].size, 'sine', 0, 0.2);
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
              if (allowFiring) {
                startTone(audio, 64, 'square', 0, 0.4);
              }
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
  canvas.addEventListener('contextmenu', preventAndStopPropagation);

  function preventAndStopPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseout', handleMouseOut);
  // Touch Events
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('touchmove', handleTouchMove);
  // Prevent touches from scaling and other stuff
  document.body.addEventListener('touchstart', preventOnCanvas);
  document.body.addEventListener('touchmove', preventOnCanvas);
  document.body.addEventListener('touchend', preventOnCanvas);

  function preventOnCanvas(event) {
    if (event.target.id == 'canvas') { event.preventDefault(); }
  }

  function handleTouchStart(event) {
    var clientPos = {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY,
      button: event.touches.length > 1 ? 2 : 0
    };

    var mouseMove = new MouseEvent('mousemove', clientPos);
    var mouseDown = new MouseEvent('mousedown', clientPos);

    canvas.dispatchEvent(mouseMove);
    canvas.dispatchEvent(mouseDown);
  }
  function handleTouchEnd(event) {
    var mouseUp = new MouseEvent('mouseup', {});

    canvas.dispatchEvent(mouseUp);
  }
  function handleTouchMove(event) {
    var clientPos = {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY
    };
    var mouseMove = new MouseEvent('mousemove', clientPos);

    canvas.dispatchEvent(mouseMove);
  }

  function receiveRadarBlip(coords) {
    radar.x = coords.x;
    radar.y = coords.y;
    radar.life = 60;
    startTone(audio, 880, 'triangle', 0, 0.2);
  }
  socket.on('radar blip', receiveRadarBlip);

  function handleOpponentDisconnect() {
    setMessage(message, opponentName + ' disconnected', true);
    opponentDisconnected = true;
  }
  socket.on('opponent disconnected', handleOpponentDisconnect);

  function handleOpponentRejoin() {
    setMessage(message, opponentName + ' rejoined the game');
    opponentDisconnected = false;
  }
  socket.on('opponent rejoined', handleOpponentRejoin);

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
    allowFiring = true;
    setMessage(message, "It's not your turn yet!", true);
  });
  socket.on('tile already hit', function() {
    allowFiring = true;
    setMessage(message, "You've already hit this tile", true);
  });

  socket.on('salvo missed', function(index) {
    targetMiss.tile = index;
    targetMiss.life = 180;

    playFireSound(audio);
  });
  socket.on('ships missed', function(index) {
    allowFiring = false;
    splash.tile = index;
    splash.life = 180;

    playFireSound(audio);
  });

  socket.on('salvo hit', function(response) {
    targetHit.tile = response.index;
    targetHit.sunk = response.sunk;
    targetHit.name = response.name;
    targetHit.life = 180;

    playFireSound(audio);
  });
  socket.on('ship hit', function(response) {
    allowFiring = false;
    shipExplosion.tile = response.index;
    shipExplosion.sunk = response.sunk;
    shipExplosion.name = response.name;
    shipExplosion.life = 180;

    playFireSound(audio);
  });

  socket.on('winner', function(opponent) {
    winner = 1;
  });
  socket.on('loser', function(opponent) {
    winner = -1;
  });

  function step(t) {
    var context = document.getElementById('canvas').getContext('2d');

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
        context.drawImage(title, 64, 80);

        // Menu options
        context.drawImage(menuText, 0, mouse.overOption == 0 ? 46 : 0, 306, 46, 120, 316, 306, 46);
        context.drawImage(menuText, 306, mouse.overOption == 1 ? 46 : 0, 322, 46, 120, 416, 322, 46);
        context.drawImage(menuText, 628, mouse.overOption == 2 ? 46 : 0, 208, 46, 120, 516, 208, 46);
        break;
      case 'options':
        // Hover rectangles
        if (overRow >= 0) {
          context.fillStyle = 'rgba(255, 255, 255, 0.4)';

          if (overRow < 3) {
            if (overOption >= 0) {
              context.fillRect(20, 116 + 160 * overRow, overRow < 2 ? 540 : 400, 132);
            }
          }
          else {
            context.fillRect(720, 110, 480, 75);
          }
        }

        context.drawImage(optionsText, 32, 32);

        context.lineWidth = 4;
        context.lineJoin = 'round';
        // Background color options
        for (var i = 0; i < backgroundColors.length; i++) {
          context.fillStyle = backgroundColors[i];
          context.fillRect(48 + 60 * i, 192, 40, 40);
          context.strokeStyle = overRow == 0 && i == overOption ? '#555' : '#000';
          context.strokeRect(48 + 60 * i, 192, 40, 40);
        }
        // Gameboard color options
        for (var i = 0; i < gameboardColors.length; i++) {
          context.fillStyle = gameboardColors[i];
          context.fillRect(48 + 60 * i, 352, 40, 40);
          context.strokeStyle = overRow == 1 && i == overOption ? '#555' : '#000';
          context.strokeRect(48 + 60 * i, 352, 40, 40);
        }
        // Ship color options
        for (var i = 0; i < shipColors.length / 3; i++) {
          // Use hover color when hovering
          context.fillStyle = overRow == 2 && i == overOption ? shipColors[3 * i + 2] : shipColors[3 * i + 1];
          context.strokeStyle = shipColors[3 * i];
          context.fillRect(48 + 60 * i, 512, 40, 40);
          context.strokeRect(48 + 60 * i, 512, 40, 40);
        }
        // Example ships
        for (var i = 0; i < 5; i++) {
          optionShips[i].render(context);
        }

        // Mute
        if (!options.mute) {
          context.strokeStyle = '#777';
          context.lineWidth = 4;
          context.beginPath();
          context.arc(736, 148, 40, -0.6, 0.6);
          context.stroke();
          context.closePath();

          context.beginPath();
          context.arc(736, 148, 52, -0.6, 0.6);
          context.stroke();
          context.closePath();
        }
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

          context.drawImage(directions, 1212 - trayWidth, 80);

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
            ships[i].setTiles();
          }
          if (heldShip == i) {
            context.fillStyle = 'rgba(0,0,0,0.2)';
            var tileX, tileY;
            for (var l = 0; l < ships[i].size; l++) {
              context.fillRect(40 + 40 * (ships[i].tiles[l] % 12), 80 + 40 * (ships[i].tiles[l] / 12 >> 0), 40, 40);
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

        // Animate fleet board explosion
        if (shipExplosion.tile >= 0) {
          var expX = 60 + 40 * (shipExplosion.tile % 12);
          var expY = 100 + 40 * (shipExplosion.tile / 12 >> 0);

          context.strokeStyle = '#740';
          context.lineWidth = 2;

          if (shipExplosion.life == 60) {
            if (shipExplosion.sunk) {
              setMessage(message, opponentName + ' sunk your ' + shipExplosion.name + '!', true);
              playShipSunkSound(audio);
            }
            else {
              setMessage(message, opponentName + ' hit your ' + shipExplosion.name);
              playShipHitSound(audio);
            }
          }

          if (shipExplosion.life > 20 && shipExplosion.life < 60) {
            context.beginPath();
            context.arc(expX, expY, 30 - (shipExplosion.life / 2), 0, TAU);
            context.stroke();
            context.closePath();
          }

          if (shipExplosion.life < 40) {
            context.beginPath();
            context.arc(expX, expY, 20 - (shipExplosion.life / 2), 0, TAU);
            context.stroke();
            context.closePath();
          }

          if (shipExplosion.life > 0) {
            shipExplosion.life--;
          }
          else {
            allowFiring = true;
            fleetBoard[shipExplosion.tile] = 3;
            shipExplosion.tile = -1;
            if (winner) {
              mouse.over = false;
              mouse.fire = false;
              gameOver = true;
            }
          }
        }

        // Animate fleet board splash
        if (splash.tile >= 0) {
          var spX = 60 + 40 * (splash.tile % 12);
          var spY = 100 + 40 * (splash.tile / 12 >> 0);

          context.strokeStyle = '#FFF';
          context.lineWidth = 2;

          if (splash.life == 60) {
            setMessage(message, opponentName + "'s salvo missed");
            playSplashSound(audio);
          }

          if (splash.life > 30 && splash.life < 60) {
            context.beginPath();
            context.arc(spX, spY, 40 - (2 * splash.life / 3), 0, TAU);
            context.stroke();
            context.closePath();
          }
          if (splash.life > 15 && splash.life < 45) {
            context.beginPath();
            context.arc(spX, spY, 30 - (2 * splash.life / 3), 0, TAU);
            context.stroke();
            context.closePath();
          }

          if (splash.life > 0) {
            splash.life--;
          }
          else {
            allowFiring = true;
            fleetBoard[splash.tile] = 2;
            splash.tile = -1;
          }
        }

        // Flash target board hit
        if (targetHit.tile >= 0) {
          var targetX = 700 + 40 * (targetHit.tile % 12);
          var targetY = 100 + 40 * (targetHit.tile / 12 >> 0);

          context.strokeStyle = '#F00';
          context.lineWidth = 4;

          if (targetHit.life == 60) {
            targetIndex = null;
            targetBoard[targetHit.tile] = 0;
            if (targetHit.sunk) {
              setMessage(message, opponentName + "'s " + targetHit.name + ' sunk!', true);
              startTone(audio, 360, 'sawtooth', 0, 0.12);
              startTone(audio, 270, 'sawtooth', 0, 0.12);
              startTone(audio, 270, 'sawtooth', 0.12, 0.24);
              startTone(audio, 180, 'sawtooth', 0.12, 0.24);
              startTone(audio, 360, 'sawtooth', 0.24, 0.36);
              startTone(audio, 270, 'sawtooth', 0.24, 0.36);
              startTone(audio, 540, 'sawtooth', 0.36, 1);
              startTone(audio, 360, 'sawtooth', 0.36, 1);
            }
            else {
              setMessage(message, 'You hit a ' + targetHit.name);
              startTone(audio, 360, 'sawtooth', 0, 0.1);
              startTone(audio, 270, 'sawtooth', 0, 0.1);
              startTone(audio, 360, 'sawtooth', 0.15, 0.7);
              startTone(audio, 270, 'sawtooth', 0.15, 0.7);
            }
          }

          if (targetHit.life <= 60 && (targetHit.life / 10 >> 0) % 2 == 0) {
            context.beginPath();
            context.moveTo(targetX - 12, targetY - 12);
            context.lineTo(targetX + 12, targetY + 12);
            context.moveTo(targetX - 12, targetY + 12);
            context.lineTo(targetX + 12, targetY - 12);
            context.stroke();
            context.closePath();
          }

          if (targetHit.life > 0) {
            targetHit.life--;
          }
          else {
            allowFiring = true;
            targetBoard[targetHit.tile] = 3;
            targetHit.tile = -1;
            if (winner) {
              mouse.over = false;
              mouse.fire = false;
              gameOver = true;
            }
          }
        }

        // Flash target board miss
        if (targetMiss.tile >= 0) {
          var targetX = 700 + 40 * (targetMiss.tile % 12);
          var targetY = 100 + 40 * (targetMiss.tile / 12 >> 0);

          context.strokeStyle = '#EEE';
          context.lineWidth = 4;

          if (targetMiss.life == 60) {
            targetIndex = null;
            targetBoard[targetMiss.tile] = 0;
            setMessage(message, 'Your salvo missed');
            startTone(audio, 256, 'sawtooth', 0, 0.2);
            startTone(audio, 100, 'sawtooth', 0.15, 0.7);
          }

          if (targetMiss.life <= 60 && (targetMiss.life / 10 >> 0) % 2 == 0) {
            context.beginPath();
            context.moveTo(targetX - 12, targetY - 12);
            context.lineTo(targetX + 12, targetY + 12);
            context.moveTo(targetX - 12, targetY + 12);
            context.lineTo(targetX + 12, targetY - 12);
            context.stroke();
            context.closePath();
          }

          if (targetMiss.life > 0) {
            targetMiss.life--;
          }
          else {
            allowFiring = true;
            targetBoard[targetMiss.tile] = 2;
            targetMiss.tile = -1;
          }
        }

        // Fire button background
        context.drawImage(fireButton, 520, 618);
        // Red button
        context.fillStyle = mouse.fire && allowFiring ? '#F88' : '#F00';
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
        // Overlay if firing is not allowed
        if (!allowFiring) {
          context.fillStyle = 'rgba(0,0,0,0.4)';
          context.fillRect(520, 618, 160, 62);
        }

        // Message display
        if (message.flash && message.delay > 0) {
          message.delay--;
          if (message.delay == 0) {
            message.flash = false;
          }
        }
        else if (message.cursor < message.length) {
          message.cursor += 0.5;
          if (message.cursor >= 34) {
            message.cursor = 33;
          }
          message.width = message.cursor * 15;
          if (message.width > 492) {
            message.width = 492;
          }
          message.cursorX = 694 + 14 * (message.cursor + 1);
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
        if (message.width > 0 && (!message.flash || (message.flash && (message.delay / 10 >> 0) % 2))) {
          context.drawImage(messageCanvas, 0, 0, message.width, 25, 696, 638, message.width, 25);
        }
        if (message.cursorDelay > 48 || message.cursor < message.length) {
          context.strokeStyle = '#4F4';
          context.beginPath();
          context.moveTo(message.cursorX, 656);
          context.lineTo(message.cursorX + 12, 656);
          context.stroke();
          context.closePath();
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
          if (xDist >> 0 >= 2) {
            loader.x += Math.max(1, xDist / 12 >> 0);
          }
          else if (xDist) {
            loader.x = loader.targetX;
          }
          var yDist = loader.targetY - loader.y;
          if (yDist >> 0 >= 2) {
            loader.y += Math.max(1, yDist / 12 >> 0);
          }
          else if (yDist) {
            loader.y = loader.targetY;
          }
          var mag = Math.max(160, Math.sqrt(Math.pow(loader.x - 600, 2) + Math.pow(loader.y - 340, 2)));
          loader.rad = Math.atan2(loader.y - 340, loader.x - 600);

          context.drawImage(loading, 0, 0);

          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(600, 340);
          context.lineTo(600 + mag * Math.cos(loader.rad), 340 + mag * Math.sin(loader.rad));
          context.moveTo(600, 180);
          context.lineTo(600, 500);
          context.moveTo(440, 340);
          context.lineTo(760, 340);
          context.moveTo(600 + 60 * Math.cos(loader.rad - PI / 4), 340 + 60 * Math.sin(loader.rad - PI / 4));
          context.arc(600, 340, 60, loader.rad - PI / 4, loader.rad + PI / 4);
          context.moveTo(600 + 120 * Math.cos(loader.spin - PI / 4), 340 + 120 * Math.sin(loader.spin - PI / 4));
          context.arc(600, 340, 120, loader.spin - PI / 4, loader.spin + Math.PI / 4);
          context.stroke();
          context.closePath();

          if (loader.showPing) {
            context.beginPath();
            context.arc(loader.pingX, loader.pingY, loader.pingS / 10, 0, 2 * Math.PI);
            context.fill();
            context.closePath();
          }

          var spin = loader.spin + PI / 36;
          if (spin > TAU) {
            spin = 0;
          }
          loader.spin = spin;

          if (loader.pingS > 0) {
            if (loader.showPing) {
              loader.pingS--;
            }
          }
          else {
            loader.pingS = 90;
            loader.pingX = (490 + 300 * Math.random()) >> 0;
            loader.pingY = (190 + 300 * Math.random()) >> 0;
            loader.pingR = Math.atan2(loader.pingY - 300, loader.pingX - 600);
            loader.showPing = false;
          }

          if (!loader.showPing && Math.abs(loader.pingR - loader.rad) < 0.1) {
            startTone(audio, 440, 'triangle', 0, 0.2);
            loader.showPing = true;
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
          if (winner > 0) {
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
        context.fillText('Ship Tiles:', 1032, 32);
        for (var i = 0; i < ships[heldShip].size; i++) {
          if (typeof ships[heldShip].tiles[i] == 'number') {
            context.fillText(ships[heldShip].tiles[i], 1032, 64 + i * 32);
          }
          else {
            break;
          }
        }
      }
      // context.fillText('Mouse X:', 1032, 32);
      // context.fillText(mouse.x, 1132, 32);
      // context.fillText('Mouse Y:', 1032, 64);
      // context.fillText(mouse.y, 1132, 64);

      // context.fillText('Ship Rad:', 1032, 32);
      // context.fillText(shipToy.rad, 1132, 32);
      // context.fillText('Ship Target:', 1032, 64);
      // context.fillText(shipToy.targetR, 1132, 64);

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
