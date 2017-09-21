var mysqlConnection = function(credentials) {
  var mysql = require('mysql');

  this.connection = mysql.createConnection(credentials);
  return this;
}
mysqlConnection.prototype.getUsers = function(callback, errCallback) {
  this.connection.query('SELECT username, password_hash, token, is_admin FROM users', function(err, rows, fields) {
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

var psqlConnection = function(credentials) {
  var pgp = require('pg-promise')();

  this.connection = pgp(credentials);
  return this;
}
psqlConnection.prototype.getUsers = function(callback, errCallback) {
  var query = this.connection.any('SELECT username, password_hash, token, is_admin FROM users');

  if (errCallback) {
    query.catch(errCallback);
  }

  query.then(callback);
}
psqlConnection.prototype.createUser = function(fields, callback, errCallback) {
  var fieldsList = [
    fields.username,
    fields.password_hash,
    fields.token,
    fields.created_at,
    fields.updated_at
  ];

  var query = this.connection.none('INSERT INTO users(username, password_hash, token, created_at, updated_at) VALUES($1, $2, $3, $4, $5)', fieldsList);

  if (errCallback) {
    query.catch(errCallback);
  }

  query.then(callback);
}
psqlConnection.prototype.loginUser = function(token, username, callback, errCallback) {
  var query = this.connection.none('UPDATE users SET token = $1 WHERE username = $2', [token, username]);

  if (errCallback) {
    query.catch(errCallback);
  }

  query.then(callback);
}
psqlConnection.prototype.signoutUser = function(username, callback, errCallback) {
  var query = this.connection.none('UPDATE users SET token = NULL WHERE username = $1', username);

  if (errCallback) {
    query.catch(errCallback);
  }

  query.then(callback);
}

module.exports = (credentials, type) => {
  switch (type) {
    case 'mysql':
      return new mysqlConnection(credentials);
      break;
    case 'psql':
    case 'postgres':
      return new psqlConnection(credentials);
      break;
  }
};
