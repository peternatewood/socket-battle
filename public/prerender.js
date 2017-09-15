function prerender() {
  var title = document.getElementById('title').getContext('2d');

  title.fillStyle = '#331';
  title.font = '120px Black Ops One';
  title.textAlign = 'left';
  title.fillText('Sea Battle', -7, 86);

  var fireButton = document.getElementById('fire-button').getContext('2d');

  // Fire button background
  fireButton.fillStyle = '#FF0';
  fireButton.fillRect(0, 0, 160, 62);
  fireButton.fillStyle = '#000';
  fireButton.beginPath();
  fireButton.moveTo(0, 31);
  fireButton.lineTo(15, 0);
  fireButton.lineTo(30, 0);
  fireButton.lineTo(0, 62);
  fireButton.closePath();
  fireButton.fill();
  fireButton.beginPath();
  fireButton.moveTo(32, 62);
  fireButton.lineTo(62, 0);
  fireButton.lineTo(77, 0);
  fireButton.lineTo(47, 62);
  fireButton.closePath();
  fireButton.fill();
  fireButton.beginPath();
  fireButton.moveTo(83, 62);
  fireButton.lineTo(113, 0);
  fireButton.lineTo(128, 0);
  fireButton.lineTo(98, 62);
  fireButton.closePath();
  fireButton.fill();
  fireButton.beginPath();
  fireButton.moveTo(160, 0);
  fireButton.lineTo(130, 62);
  fireButton.lineTo(145, 62);
  fireButton.lineTo(160, 31);
  fireButton.closePath();
  fireButton.fill();
  // FIRE! text
  fireButton.font = '32px Audiowide';
  fireButton.textAlign = 'right';
  fireButton.fillStyle = '#FFF';
  fireButton.shadowBlur = 8;
  fireButton.shadowColor = '#000';
  fireButton.fillText('FIRE!', 150, 41);
  fireButton.fillText('FIRE!', 150, 41);

  var directions = document.getElementById('directions').getContext('2d');

  directions.font = '24px Audiowide';
  directions.textAlign = 'left';
  directions.fillStyle = '#000';
  directions.fillText('Click and drag to place your ships!', 0, 19);
  directions.fillText('Rotate a grabbed ship with', 0, 79);
  directions.fillText('the right mouse button or spacebar', 0, 119);
  directions.fillText("Click the FIRE! button when you're", 0, 179);
  directions.fillText("ready to start!", 0, 219);

  directions.fillText('Patrol Boats', 298, 309);
  directions.fillText('Submarines', 208, 349);
  directions.fillText('Destroyer', 128, 389);
  directions.fillText('Battleship', 88, 429);
  directions.fillText('Aircraft Carrier', 48, 469);

  var message = document.getElementById('message').getContext('2d');
  // Set state now rather than later
  message.fillStyle = '#4F4';
  message.font = '24px Roboto Mono';
  message.textAlign = 'left';
  message.textBaseline = 'middle';
}
