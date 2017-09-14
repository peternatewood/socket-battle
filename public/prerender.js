ready(function() {
  var title = document.getElementById('title').getContext('2d');

  title.fillStyle = '#331';
  title.font = '120px Black Ops One';
  title.textAlign = 'left';
  title.textBaseline = 'top';
  title.fillText('Sea Battle', -7, 0);

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
  fireButton.font = '32px Audiowide, Arial';
  fireButton.textAlign = 'right';
  fireButton.textBaseline = 'middle';
  fireButton.fillStyle = '#FFF';
  fireButton.shadowBlur = 8;
  fireButton.shadowColor = '#000';
  fireButton.fillText('FIRE!', 150, 31);
  fireButton.fillText('FIRE!', 150, 31);
});
