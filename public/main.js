function ready(fun) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
    fun();
  }
  else {
    document.addEventListener('DOMContentLoaded', fun);
  }
}

function showGameboard() {
  var form = document.getElementById('form-table')
  var game = document.getElementById('gameboard');

  form.style.display = 'none';
  game.style.display = 'block';
}

ready(function() {
  var socket = io();

  var battleToken = window.localStorage.getItem('battleToken');
  if (battleToken) {
    socket.emit('login token', battleToken);
  }
  socket.on('token valid', function(response) {
    if (response.success) {
      showGameboard();
      window.localStorage.setItem('battleToken', JSON.stringify(response.battleToken));
    }
    else {
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

    var loginOrSignup = event.target.dataset.signup;
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

    var battleToken = {
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

  function step(t) {
    // Pause recursion if the user leaves the tab
    if(!s){var s=t}if(t-s<2000)window.requestAnimationFrame(step);
  }
});
