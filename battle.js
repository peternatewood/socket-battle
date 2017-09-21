const PORT = process.env.PORT || 4500;

var express = require('express');
var app = express();
var path = require('path');
var passwordHash = require('password-hash');
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(PORT, function() {
  console.log('Server listening at port %d', PORT);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'public/index.html'));
});

// Database connection
var databaseType = process.env.DB_TYPE || 'postgres';

var dbCredentials = process.env.DATABASE_URL || {
  host      : process.env.DB_HOST     || 'localhost',
  user      : process.env.DB_USER     || 'root',
  password  : process.env.DB_PASSWORD || 'root',
  database  : process.env.DB_NAME     || 'socket_battle'
};
var connection = require('./database_connection.js')(dbCredentials, databaseType);

var users = {};

connection.getUsers(function(rows) {
  for (var i = 0; i < rows.length; i++) {
    u = rows[i];
    users[u.username] = {
      passwordHash: u.password_hash,
      token: u.token,
      is_admin: u.is_admin
    };
  }
});

// Games and socketio rooms
var Game = function(username, fleetBoard, ships) {
  this.players = [username];
  this.fleetBoards = [fleetBoard];
  this.ships = [ships];

  return this;
}
Game.prototype.targetBoards = [
  [
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
  ],
  [
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
  ]
];
Game.prototype.turn = 0;
Game.prototype.addPlayer = function(username, fleetBoard, ships) {
  this.players.push(username);
  this.fleetBoards.push(fleetBoard);
  this.ships.push(ships);
};
Game.prototype.isEmpty = function() {
  return this.players.length < 2;
}

var activeGames = {};
function getEmptyRoom(games) {
  var roomNum = 0;
  for (var room in games) {
    if (games.hasOwnProperty(room)) {
      if (games[room].isEmpty()) {
        return room;
      }
      roomNum++;
    }
  }
  return roomNum;
}
function deleteGameRoom(room) {
  if (activeGames[room]) {
    activeGames[room].turn = null;
    activeGames[room].players = null;
    activeGames[room].fleetBoards = null;
    activeGames[room].targetBoards = null;
    activeGames[room].ships = null;
    delete activeGames[room];
  }
}

function generateToken() {
  return passwordHash.generate(Date.now().toString());
}

io.on('connection', function(socket) {
  var loggedIn = false;

  var playerNum;
  var username;
  var gameRoom;

  console.log('a user connected', socket.id);

  socket.on('disconnect', function() {
    console.log('user disconnected');
    // Handle disconnect during game
    if (gameRoom) {
      socket.broadcast.to(gameRoom).emit('opponent disconnected');
    }
  });

  socket.on('login token', function(data) {
    var user = users[data.username];

    if (user && user.token === data.token) {
      loggedIn = true;
      username = data.username;

      connection.loginUser(data.token, username, function() {
        var token = generateToken();
        user.token = token;

        var gameData = {
          username: data.username,
          token: token
        };

        if (user.is_admin) {
          socket.emit('is admin', gameData);
        }

        // Player is rejoining game
        var room = activeGames[data.room];

        if (typeof data.playerNum == 'number' && data.room && room && room.players[data.playerNum] == username) {
          playerNum = data.playerNum;
          gameRoom = data.room;

          gameData.playerNum = data.playerNum;
          gameData.room = data.room;

          var opponent = '';
          if (room.players.length == 2) {
            opponent = room.players[(data.playerNum + 1) % 2];
            socket.broadcast.to(gameRoom).emit('opponent rejoined');
          }

          var response = {
            inProgress: !room.isEmpty(),
            gameData: gameData,
            ships: room.ships[data.playerNum],
            fleetBoard: room.fleetBoards[data.playerNum],
            targetBoard: room.targetBoards[data.playerNum],
            opponent: opponent
          };

          socket.join(data.room);
          console.log(username, 'rejoined game', gameRoom);
          socket.emit('game rejoined', response);
        }
        else {
          console.log(username, 'logged in');
          socket.emit('token valid', { success: true, gameData: gameData });
        }
      });
    }
    else {
      socket.emit('token valid', { success: false });
    }
  });

  socket.on('signup', function(data) {
    console.log('new user', data.username, data.password);

    var isValidUser = true;
    if (data.username === '' || data.password === '') {
      socket.emit('signup error', 'Please provide a username and password');
      isValidUser = false;
    }
    // Other possible errors: length, password content?

    if (users[data.username]) {
      socket.emit('signup error', 'This username is already taken');
      isValidUser = false;
    }

    if (data.username.length > 12) {
      socket.emit('signup error', 'A username must be 12 characters or shorter');
      isValidUser = false;
    }

    if (isValidUser) {
      var token = generateToken();
      var password = passwordHash.generate(data.password);

      var fields = {
        username: data.username,
        password_hash: password,
        token: token,
        created_at: new Date(),
        updated_at: new Date()
      };

      connection.createUser(fields, function() {
        users[data.username] = {
          passwordHash: password,
          token: token
        };

        loggedIn = true;
        username = data.username;

        var response = {
          message: 'Welcome ' + data.username,
          username: data.username,
          token: token
        };
        socket.emit('signup valid', response);
      });
    }
  });

  socket.on('login', function(data) {
    console.log('new login', data.username, data.password);

    if (data.username === '' || data.password === '') {
      socket.emit('login error', 'Please provide your username and password');
    }
    else {
      var user = users[data.username];
      if (!user || !passwordHash.verify(data.password, user.passwordHash)) {
        socket.emit('login error', 'Your username, password, or both is incorrect');
      }
      else {
        loggedIn = true;
        username = data.username;
        var token = generateToken();

        connection.loginUser(token, username, function() {
          user.token = token;

          var response = {
            message: 'Welcome ' + data.username,
            username: data.username,
            token: token
          };
          socket.emit('login valid', response);
          if (user.is_admin) {
            socket.emit('is admin', response);
          }
        });
      }
    }
  });

  socket.on('signout', function(name) {
    connection.signoutUser(name, function() {
      if (activeGames[gameRoom]) {
        if (activeGames[gameRoom].quit) {
          delete activeGames[gameRoom];
        }
        else {
          activeGames[gameRoom].quit = true;
          socket.broadcast.to(gameRoom).emit('opponent signout');
        }
      }

      socket.leave(gameRoom);
      loggedIn = false;
      username = null;
      gameRoom = null;
    });
  });

  socket.on('start game', function(data) {
    console.log('start game', username);
    var room = getEmptyRoom(activeGames);
    // If no empty rooms, make a new one
    if (typeof room == 'number') {
      room = 'game ' + room;
      activeGames[room] = new Game(username, data.fleetBoard, data.ships);
      playerNum = 0;
    }
    else {
      activeGames[room].addPlayer(username, data.fleetBoard, data.ships);
      playerNum = 1;
    }

    gameRoom = room;
    socket.join(room);
    socket.emit('joined game', { room: room, playerNum: playerNum });

    if (!activeGames[room].isEmpty()) {
      socket.emit('game ready', activeGames[room].players[(playerNum + 1) % 2]);
      socket.broadcast.to(room).emit('game ready', username);
      console.log('game ready', room, activeGames[room].players.join(' vs '));
    }
  });

  socket.on('quit to menu', function() {
    if (gameRoom) {
      socket.leave(gameRoom);
      socket.broadcast.to(gameRoom).emit('opponent quit');
      deleteGameRoom(gameRoom);
      gameRoom = null;
      playerNum = null;
    }
  });

  socket.on('ping radar', function(coords) {
    socket.to(gameRoom).emit('radar blip', coords);
  });

  socket.on('fire salvo', function(targetIndex) {
    var game = activeGames[gameRoom];
    if (game.turn == playerNum) {
      var opponent = (playerNum + 1) % 2;
      var tile = game.fleetBoards[opponent][targetIndex];
      switch (tile) {
        case 0:
          game.fleetBoards[opponent][targetIndex] = 2;
          game.targetBoards[playerNum][targetIndex] = 2;
          socket.emit('salvo missed', targetIndex);
          socket.broadcast.to(gameRoom).emit('ships missed', targetIndex);
          break;
        case 1:
          game.fleetBoards[opponent][targetIndex] = 3;
          game.targetBoards[playerNum][targetIndex] = 3;
          // Find hit ship and decrement life
          var ships = game.ships[opponent];
          var index = ships.findIndex(function(s) { return s.tiles.includes(targetIndex); });
          ships[index].life--;

          var response = {
            index: targetIndex,
            name: ships[index].name,
            sunk: ships[index].life == 0
          };

          socket.emit('salvo hit', response);
          socket.broadcast.to(gameRoom).emit('ship hit', response);
          // If there are no remaining ship tiles
          if (game.fleetBoards[opponent].every(function(tile) { return tile != 1 })) {
            socket.emit('winner', game.players[opponent]);
            socket.broadcast.to(gameRoom).emit('loser', username);
            deleteGameRoom(gameRoom);
            gameRoom = null;
            playerNum = null;
          }
          break;
        default:
          socket.emit('tile already hit');
          return; // So that we don't jump to the next turn
      }
      game.turn = (game.turn + 1) % 2;
    }
    else {
      socket.emit('not your turn');
    }
  });
});
