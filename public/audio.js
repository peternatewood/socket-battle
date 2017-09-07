var audio = new AudioContext || new webkitAudioContext;

function startTone(audio, freq, type, stop) {
  var osc = audio.createOscillator();
  var gain = audio.createGain();
  var time = audio.currentTime;

  if (freq) {
    osc.frequency.setValueAtTime(freq, time);
  }
  else {
    var freq = osc.frequency.value;
  }

  if (type) {
    osc.type = type;
  }
  else {
    var type = osc.type;
  }

  var gainMod;
  switch (type) {
    case 'sine': gainMod = stop ? 2 : 4; break;
    case 'triangle': gainMod = stop ? 2 : 5; break;
    case 'sawtooth': gainMod = stop ? 5 : 20; break;
    case 'square': gainMod = stop ? 6 : 22; break;
  }

  gain.connect(audio.destination);
  osc.connect(gain);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(Math.pow(1.05, freq / -20) / gainMod, time + 0.01);
  osc.start(time);

  if (stop) {
    gain.gain.linearRampToValueAtTime(0, time + stop);
    osc.stop(time + stop);
  }
  else {
    return { osc: osc, gain: gain };
  }
}

function stopTone(audio, tone) {
  var time = audio.currentTime;

  if (tone instanceof Array) {
    for (var i = 0; i < tone.length; i++) {
      tone[i].gain.gain.linearRampToValueAtTime(0, time + 0.2);
      tone[i].osc.stop(time + 0.2);
    }
  }
  else {
    tone.gain.gain.linearRampToValueAtTime(0, time + 0.2);
    tone.osc.stop(time + 0.2);
  }
}
