function prerender() {
  var title = document.getElementById('title').getContext('2d');

  title.fillStyle = '#331';
  title.font = '120px Black Ops One';
  title.textAlign = 'left';
  title.fillText('Sea Battle', -7, 86);

  var menu = document.getElementById('menu-text').getContext('2d');

  menu.lineWidth = 2;
  menu.font = '48px Audiowide, Arial';
  menu.textAlign = 'left';

  menu.fillStyle = '#BA4';
  menu.strokeStyle = '#870';

  menu.fillText('Start Game', 0, 37);
  menu.strokeText('Start Game', 0, 37);
  menu.fillText('Tournament', 306, 37);
  menu.strokeText('Tournament', 306, 37);
  menu.fillText('Options', 628, 37);
  menu.strokeText('Options', 628, 37);

  menu.fillStyle = '#DC4';
  menu.strokeStyle = '#A90';

  menu.fillText('Start Game', 0, 83);
  menu.strokeText('Start Game', 0, 83);
  menu.fillText('Tournament', 306, 83);
  menu.strokeText('Tournament', 306, 83);
  menu.fillText('Options', 628, 83);
  menu.strokeText('Options', 628, 83);

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

  var loading = document.getElementById('loading').getContext('2d');

  loading.fillStyle = 'rgba(0,0,0,0.6)';
  loading.fillRect(0, 0, 1200, 680);

  loading.fillStyle = '#4F4';
  loading.strokeStyle = '#4F4';
  loading.lineWidth = 2;
  loading.textAlign = 'center';
  loading.font = '32px Roboto Mono, Courier';

  loading.fillText('Searching for Opponent...', 600, 60);

  var options = document.getElementById('options-text').getContext('2d');

  options.font = '48px Audiowide, Arial';
  options.fillStyle = '#331';
  options.strokeStyle = '#777';
  options.lineWidth = 2;

  options.fillText('Options', 0, 36);
  options.strokeText('Options', 0, 36);

  options.fillText('Background Color', 8, 132);
  options.strokeText('Background Color', 8, 132);

  options.fillText('Gameboard Color', 8, 292);
  options.strokeText('Gameboard Color', 8, 292);

  options.fillText('Ships Color', 8, 452);
  options.strokeText('Ships Color', 8, 452);

  options.fillText('Mute Sounds', 792, 132);
  options.strokeText('Mute Sounds', 792, 132);

  // Mute icon
  options.beginPath();
  options.moveTo(704, 106);
  options.lineTo(712, 106);
  options.arc(704, 116, 30, -0.7, 0.7);
  options.lineTo(712, 126);
  options.lineTo(704, 126);
  options.closePath();
  options.fill();
  options.stroke();
}
