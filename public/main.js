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

  form.style.display = 'none';
  errors.innerHTML = '';
  game.style.display = 'table';
  signout.style.display = 'block';
}

ready(function() {
  var debug = 0;
  function toggleDebug(e){if(!e.repeat&&e.key=='`'){e.preventDefault();debug=!debug}}
  document.addEventListener('keydown', toggleDebug);

  var socket = io();

  var battleToken = window.localStorage.getItem('battleToken');
  if (battleToken) {
    socket.emit('login token', battleToken);
  }
  else {
    showForm();
  }

  socket.on('token valid', function(response) {
    if (response.success) {
      showGameboard();
      battleToken = response.battleToken;
      window.localStorage.setItem('battleToken', JSON.stringify(response.battleToken));
    }
    else {
      showForm();
      window.localStorage.removeItem('battleToken');
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

    battleToken = {
      username: response.username,
      token: response.token
    };
    window.localStorage.setItem('battleToken', JSON.stringify(battleToken));

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
    socket.emit('signout', battleToken.username);
    window.localStorage.removeItem('battleToken');

    var form = document.getElementById('form-table');
    var game = document.getElementById('gameboard');
    var signout = document.getElementById('signout-wrapper');

    form.style.display = '';
    game.style.display = 'none';
    signout.style.display = 'none';
  }
  document.getElementById('signout').addEventListener('click', handleSignoutClick);

  var trayWidth = 500;

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
      case 2: this.name = 'Patrol Boat'; break;
      case 3: this.name = 'Submarine'; break;
      case 4: this.name = 'Destroyer'; break;
      case 5: this.name = 'Battleship'; break;
      case 6: this.name = 'Carrier'; break;
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
  Ship.prototype.drop = function() {
    // Slot into gameboard grid if within bounds
    if (this.x >= 40 && this.x <= 520 && this.y >= 80 && this.y <= 560) {
      var halfSize = (40 * this.size) / 2;

      if (this.direction == 'north' || this.direction == 'south') {
        this.x = Math.min(500, Math.max(60, 40 * (this.x / 40 >> 0) + 20));
        this.y = Math.min(560 - halfSize, Math.max(80 + halfSize, 40 * (this.y / 40 >> 0) + 20));
      }
      else if (this.direction == 'east' || this.direction == 'west') {
        this.x = Math.min(520 - halfSize, Math.max(80 + halfSize, 40 * (this.x / 40 >> 0) + 20));
        this.y = Math.min(540, Math.max(60, 40 * (this.y / 40 >> 0) + 20));
      }
      this.oldX = this.x;
      this.oldY = this.y;
      this.setRenderPoints();
      this.onBoard = true;
    }
    // Otherwise put back where it was
    else {
      this.x = this.oldX;
      this.y = this.oldY;
      this.setRenderPoints();
      this.onBoard = false;
    }
  };
  Ship.prototype.isMouseOver = function(x, y) {
    var halfSize = (40 * this.size) / 2;
    // Hitbox
    var l, r, t, b;
    if (this.direction == 'north' || this.direction == 'south') {
      l = this.x - 20;
      r = this.x + 20;
      t = this.y - halfSize;
      b = this.y + halfSize;
    }
    else if (this.direction == 'east' || this.direction == 'west') {
      l = this.x - halfSize;
      r = this.x + halfSize;
      t = this.y - 20;
      b = this.y + 20;
    }

    return x >= l && x <= r && y >= t && y <= b;
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
  };

  var heldShip;

  var ships = [
    new Ship(730, 150, 4),
    new Ship(770, 130, 3),
    new Ship(810, 110, 2),
    new Ship(850, 170, 5)
  ];

  var canvas = document.getElementById('canvas');
  // Intercept and stop right-click menu
  canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });
  canvas.addEventListener('mousedown', function(event) {
    var x = event.layerX;
    var y = event.layerY;
    for (var i = 0; i < ships.length; i++) {
      if (ships[i].isMouseOver(x, y)) {
        if (event.button == 0) {
          heldShip = i;
        }
        if (typeof heldShip === 'number' && event.button == 2) {
          ships[heldShip].rotate();
        }
        break;
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
    if (typeof heldShip === 'number') {
      var xDist = event.layerX - ships[heldShip].x;
      var yDist = event.layerY - ships[heldShip].y;

      ships[heldShip].x += xDist;
      ships[heldShip].y += yDist;
      for (var i = 0; i < 10; i += 2) {
        ships[heldShip].renderPoints[i] += xDist;
        ships[heldShip].renderPoints[i + 1] += yDist;
      }
    }
  });

  function step(t) {
    var context = document.getElementById('canvas').getContext('2d');

    context.clearRect(0, 0, 1200, 600);
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

      context.strokeText(x + 1, 10, 20 + xPos);
      context.strokeText(String.fromCharCode(65 + x), xPos - 20, 60);
      context.strokeText(x + 1, 650, 20 + xPos);
      context.strokeText(String.fromCharCode(65 + x), 620 + xPos, 60);
    }

    context.font = '24px Arial';
    context.lineWidth = 1;
    context.strokeText('Your Fleet', 280, 20);
    context.fillText('Your Fleet', 280, 20);
    context.strokeText("The Opponent's Fleet", 920, 20);
    context.fillText("The Opponent's Fleet", 920, 20);

    // Tray of ship pieces
    if (trayWidth) {
      context.fillStyle = '#AAA';
      context.strokeStyle = '#333';
      context.lineWidth = 8;
      context.fillRect(1200 - trayWidth, 60, trayWidth, 520);
      context.strokeRect(1200 - trayWidth, 60, trayWidth + 4, 520);
    }

    // Ships
    for (var i = 0; i < ships.length; i++) {
      ships[i].render(context);
    }

    // Debug rendering
    if (debug) {
      context.fillStyle='#0F0';
      for(var y=0;y<600;y+=40){context.fillRect(0,y,1200,1)}
      for(var x=0;x<1200;x+=40){context.fillRect(x,0,1,600)}
    }

    // Pause recursion if the user leaves the tab
    if(!s){var s=t}if(t-s<2000)window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
});
