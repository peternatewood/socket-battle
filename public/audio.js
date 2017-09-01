var audio = new AudioContext || new webkitAudioContext;

function playRadarPing() {
  var osc = audio.createOscillator();
  var gain = audio.createGain();
  var time = audio.currentTime;

  gain.connect(audio.destination);
  osc.connect(gain);

  osc.type = 'triangle';
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.linearRampToValueAtTime(0, time + 0.2);
  osc.start(time);
  osc.stop(time + 0.2);
}
