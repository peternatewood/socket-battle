var mysqlConnection = function(credentials) {
  var mysql = require('mysql');

  this.connection = mysql.createConnection(credentials);
  return this;
}
mysqlConnection.prototype.getUsers = function(callback, errCallback) {
  this.connection.query('SELECT username, password_hash, token FROM users', function(err, rows, fields) {
    if (err) {
      if (errCallback) {
        errCallback(err);
      }
      else {
        throw err;
      }
    }

    callback(rows);
  });
};
mysqlConnection.prototype.createUser = function(fields, callback, errCallback) {
  this.connection.query('INSERT INTO users SET ?', fields, function(err, results, fields) {
    if (err) {
      if (errCallback) {
        errCallback(err);
      }
      else {
        throw err;
      }
    }
    else {
      callback();
    }
  });
};
mysqlConnection.prototype.loginUser = function(token, username, callback, errCallback) {
  this.connection.query('UPDATE users SET token = ? WHERE username = ?', [token, username], function(err, results, fields) {
    if (err) {
      if (errCallback) {
        errCallback(err);
      }
      else {
        throw err;
      }
    }
    else {
      callback();
    }
  });
};
mysqlConnection.prototype.signoutUser = function(username, callback, errCallback) {
  this.connection.query('UPDATE users SET token = NULL WHERE username = ?', username, function(err, results, fields) {
    if (err) {
      if (errCallback) {
        errCallback(err);
      }
      else {
        throw err;
      }
    }
    else {
      callback();
    }
  });
};

module.exports = (credentials, type) => {
  switch (type) {
    case 'mysql':
      return new mysqlConnection(credentials);
      break;
    default:
      return new mysqlConnection(credentials);
  }
};
