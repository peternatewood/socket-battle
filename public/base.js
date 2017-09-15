const PI = Math.PI;
const TAU = 2 * PI;

var backgroundColors = [
  '#0AE', '#64A', '#A64', '#4A4', '#AA4', '#C66'
];
var gameboardColors = [
  '#0CE', '#ACE', '#C60', '#0DC', '#4C9', '#9AC'
];
var shipColors = [
  '#CCC', '#888', '#68A',
  '#C9C', '#648', '#82A',
  '#CC6', '#468', '#28A',
  '#AC9', '#684', '#6A2',
  '#CCE', '#668', '#33A',
  '#CC6', '#866', '#A33'
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
  var tiles = [];
  for (var i = 0; i < ship.size; i++) {
    // If tile is occupied by a ship or ship is not on the board
    if (typeof ship.tiles[i] != 'number' || board[ship.tiles[i]]) {
      return false;
    }
    tiles.push(ship.tiles[i]);
  }

  for (var i = 0; i < ship.size; i++) {
    board[tiles[i]] = 1;
  }
  return true;
}

function setMessage(message, content, flash) {
  var messageContext = document.getElementById('message').getContext('2d');

  messageContext.clearRect(0, 0, 492, 54);
  messageContext.fillStyle = '#4F4';
  messageContext.font = '24px Roboto Mono, Courier';
  messageContext.textAlign = 'left';
  messageContext.textBaseline = 'alphabetic';
  messageContext.fillText(content, 0, 20);

  message.length = content.length;
  message.cursorDelay = 0;
  message.flash = flash;

  if (flash) {
    message.delay = 90;
    message.cursor = Math.min(33, content.length);
    message.cursorX = 694 + 14 * (message.cursor + 1);
    message.width = Math.min(492, message.length * 15);
  }
  else {
    message.delay = 0;
    message.cursor = 0;
    message.cursorX = 694;
    message.width = 0;
  }
}
