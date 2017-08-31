const PORT = process.env.PORT || 4500;

var express = require('express');
var app = express();
var path = require('path');
var passwordHash = require('password-hash');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mysql = require('mysql');

server.listen(PORT, function() {
  console.log('Server listening at port %d', PORT);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

app.get('/signup', function(request, response) {
  response.sendFile(path.join(__dirname, 'public/signup.html'));
});

app.get('/battle', function(request, response) {
  response.sendFile(path.join(__dirname, 'public/battle.html'));
});

// Database connection
var dbCredentials = {
  host      : process.env.DB_HOST     || 'localhost',
  user      : process.env.DB_USER     || 'root',
  password  : process.env.DB_PASSWORD || 'root',
  database  : process.env.DB_NAME     || 'socket_battle'
};
var connection = mysql.createConnection(dbCredentials);

try {
  connection.connect();
}
catch (err) {
  console.error('Database connection error', err, dbCredentials);
  // TODO what to do if the database won't connect?
}

var users = {};

connection.query('SELECT username, password_hash, token FROM users', function(err, rows, fields) {
  if (err) {
    throw err;
  }

  for (var i = 0; i < rows.length; i++) {
    u = rows[i];
    users[u.username] = {
      passwordHash: u.password_hash,
      token: u.token
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
  });

  socket.on('login token', function(data) {
    var user = users[data.username];

    if (user && user.token === data.token) {
      loggedIn = true;
      username = data.username;
      var token = generateToken();
      console.log('user logging in', activeGames);

      connection.query('UPDATE users SET token = ? WHERE username = ?', [token, data.username], function(err, results, fields) {
        if (err) {
          throw err;
        }
        else {
          user.token = token;
          console.log(username, 'logged in');
          var gameData = {
            username: data.username,
            token: token
          };
          // Player is rejoining game
          var room = activeGames[data.room];
          var index = data.playerNum - 1;

          if (data.playerNum && data.room && room && room.players[index] == username) {
            gameRoom = data.room;
            gameData.playerNum = data.playerNum;
            gameData.room = data.room;

            var response = {
              inProgress: !activeGames[data.room].isEmpty(),
              gameData: gameData,
              ships: room.ships[index],
              fleetBoard: room.fleetBoards[index],
              targetBoard: room.targetBoards[index]
            };

            socket.join(data.room);
            socket.emit('game rejoined', response);
          }
          else {
            socket.emit('token valid', { success: true, gameData: gameData });
          }
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

      connection.query('INSERT INTO users SET ?', fields, function(err, results, fields) {
        if (err) {
          throw err;
        }
        else {
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
        }
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

        connection.query('UPDATE users SET token = ? WHERE username = ?', [token, data.username], function(err, results, fields) {
          if (err) {
            throw err;
          }
          else {
            user.token = token;

            var response = {
              message: 'Welcome ' + data.username,
              username: data.username,
              token: token
            };
            socket.emit('login valid', response);
          }
        });
      }
    }
  });

  socket.on('signout', function(username) {
    connection.query('UPDATE users SET token = NULL WHERE username = ?', username, function(err, results, fields) {
      if (err) {
        throw err;
      }
      else {
        socket.leave(gameRoom);
        loggedIn = false;
        username = null;
        gameRoom = null;
      }
    });
  });

  socket.on('start game', function(data) {
    console.log('start game', username);
    var room = getEmptyRoom(activeGames);
    // If no empty rooms, make a new one
    if (typeof room == 'number') {
      room = 'game ' + room;
      activeGames[room] = new Game(username, data.fleetBoard, data.ships);
      playerNum = 1;
    }
    else {
      activeGames[room].players.push(username);
      activeGames[room].fleetBoards.push(data.fleetBoard);
      activeGames[room].ships.push(data.ships);
      playerNum = 2;
    }

    gameRoom = room;
    socket.join(room);
    socket.emit('joined game', { room: room, playerNum: playerNum });

    if (!activeGames[room].isEmpty()) {
      activeGames[room].turn = 1;
      io.to(room).emit('game ready');
      console.log('game ready', room, activeGames[room].players.join(' vs '));
    }
  });

  socket.on('ping radar', function(coords) {
    socket.to(gameRoom).emit('radar blip', coords);
  });

  socket.on('fire salvo', function(targetIndex) {
    var game = activeGames[gameRoom];
    if (game.turn == playerNum) {
      var opponent = playerNum == 1 ? 1 : 0;
      var tile = game.fleetBoards[opponent][targetIndex];
      switch (tile) {
        case 0:
          tile = 2;
          socket.emit('salvo missed', targetIndex);
          socket.broadcast.to(gameRoom).emit('ships missed', targetIndex);
          break;
        case 1:
          tile = 3;
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
            // Clean up game-related data
            delete activeGames[gameRoom];
            playerNum = null;
            gameRoom = null;
          }
          break;
        default:
          socket.emit('tile already hit');
          return; // So that we don't jump to the next turn
      }
      game.turn = opponent + 1;
    }
    else {
      socket.emit('not your turn');
    }
  });
});
