var backgroundColors = [
  '#0AE', '#A0E', '#EA0', '#6C6', '#CC6', '#C66'
];
var gameboardColors = [
  '#0CE', '#ACE', '#C60', '#0DC', '#CA9', '#9AC'
];
var shipColors = [
  '#CCC', '#888', '#68A',
  '#C9C', '#848', '#A2A',
  '#9CC', '#488', '#2AA',
  '#9CA', '#486', '#2A4',
  '#AAC', '#668', '#33A',
  '#CAA', '#866', '#A33'
];

function ready(fun) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading") {
    fun();
  }
  else {
    document.addEventListener('DOMContentLoaded', fun);
  }
}

function showForm() {
  document.getElementById('spinner').className = 'hide';
  document.getElementById('form').className = '';
}

function showGameboard() {
  document.getElementById('form-table').className = 'hide';
  document.getElementById('errors').innerHTML = '';
  document.getElementById('gameboard').className = '';
  document.getElementById('nav').className = '';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
}

function handleErrors(message) {
  document.getElementById('errors').innerHTML = message;
}

function clearTiles(board, ship) {
  var bounds = ship.getBounds();
  var increment = ship.rad == 0 || ship.rad == PI ? 1 : 12;
  var shipHead = (bounds.l - 40) / 40 + 12 * (bounds.t - 80) / 40;
  var shipTail = shipHead + increment * ship.size;

  for (var i = shipHead; i < shipTail; i += increment) {
    if (board[i]) {
      board[i] = 0;
    }
  }
}

// Returns true only if the ship is overlaying all empty tiles
function updateBoard(board, ship) {
  var bounds = ship.getBounds();
  var increment = ship.rad == 0 || ship.rad == PI ? 1 : 12;
  var shipHead = (bounds.l - 40) / 40 + 12 * (bounds.t - 80) / 40;
  var shipTail = shipHead + increment * ship.size;

  var tiles = [];
  for (var i = shipHead; i < shipTail; i += increment) {
    // If tile is occupied by a ship
    if (board[i]) {
      return false;
    }
    tiles.push(i);
  }
  ship.tiles = tiles;

  for (var i = 0; i < ship.size; i++) {
    board[tiles[i]] = 1;
  }
  return true;
}

function setMessage(message, content, flash) {
  message.content = content;
  message.length = content.length;
  message.cursorDelay = 0;
  message.flash = flash;

  if (flash) {
    message.delay = 90;
    message.cursor = Math.min(33, content.length);
  }
  else {
    message.delay = 0;
    message.cursor = 0;
  }
}
