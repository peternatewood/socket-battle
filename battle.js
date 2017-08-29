const PORT = process.env.PORT || 4500;

var express = require('express');
var app = express();
var path = require('path');
var password = require('password-hash');
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
}

var users = {
  'admin': {
    passwordHash: 'sha1$5f55e186$1$a18a9b40dfaa7c7f2c83d184f8ce6abc8ba9eb1f',
    token: null,
  },
};

var loginRooms = {};

function generateToken() {
  return password.generate(Date.now().toString());
}

io.on('connection', function(socket) {
  var loggedIn = false;
  console.log('a user connected', socket.id);

  socket.on('disconnect', function() {
    console.log('user disconnected');
  });

  socket.on('login token', function(jsonString) {
    var user = {};
    var jsonParsed = false;
    try {
      data = JSON.parse(jsonString);
      jsonParsed = true;
      user = users[data.username];
    }
    catch (e) {
      console.log('Failed to parse data', jsonString, e);
    }

    if (jsonParsed && user && user.token === data.token) {
      loggedIn = true;
      var token = generateToken();
      user.token = token;

      battleToken = {
        username: data.username,
        token: token
      };
      socket.emit('token valid', { success: true, battleToken: battleToken });
    }
    else {
      socket.emit('token valid', { success: false });
    }
  });

  socket.on('signup', function(data) {
    console.log('new user', data.username);

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

      users[data.username] = {
        passwordHash: password.generate(data.password),
        token: token
      };

      loggedIn = true;

      var response = {
        message: 'Welcome ' + data.username,
        username: data.username,
        token: token
      };
      socket.emit('signup valid', response);
    }
  });

  socket.on('login', function(data) {
    if (data.username === '' || data.password === '') {
      socket.emit('login error', 'Please provide your username and password');
    }
    else {
      var user = users[data.username];
      if (!user || !password.verify(data.password, user.passwordHash)) {
        socket.emit('login error', 'Your username, password, or both is incorrect');
      }
      else {
        loggedIn = true;

        var token = generateToken();
        user.token = token;

        var response = {
          message: 'Welcome ' + data.username,
          username: data.username,
          token: token
        };
        socket.emit('login valid', response);
      }
    }
  })
});
