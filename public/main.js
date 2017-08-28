function ready(fun) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
    fun();
  }
  else {
    document.addEventListener('DOMContentLoaded', fun);
  }
}

ready(function() {
  var socket = io();

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
    errors = document.getElementById('errors');
    errors.innerHTML = response.message;
    errors.className = 'errors valid';

    // setTimeout(function() {  }, 300);
  }
  socket.on('signup valid', handleFormSuccess);
  socket.on('login valid', handleFormSuccess);

  function handleErrors(message) {
    errors = document.getElementById('errors');
    errors.innerHTML = message;
  }
  socket.on('login error', handleErrors);
  socket.on('signup error', handleErrors);

  function step(t) {
    // Pause recursion if the user leaves the tab
    if(!s){var s=t}if(t-s<2000)window.requestAnimationFrame(step);
  }
});
