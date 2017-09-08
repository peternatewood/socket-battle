var audio;
if (typeof AudioContext != 'undefined') {
  audio = new AudioContext;
}
else if (typeof webkitAudioContext != 'undefined') {
  audio = new webkitAudioContext;
}

function startTone(audio, freq, type, start, stop) {
  // In case webAudio is not supported
  if (! audio) {
    return;
  }

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

  if (typeof start != 'number') {
    var start = 0;
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
  gain.gain.linearRampToValueAtTime(Math.pow(1.05, freq / -20) / gainMod, time + start + 0.01);
  osc.start(time + start);

  if (stop) {
    gain.gain.linearRampToValueAtTime(0, time + stop);
    osc.stop(time + stop);
  }
  else {
    return { osc: osc, gain: gain };
  }
}

function stopTone(audio, tone) {
  // In case webAudio is not supported
  if (! audio) {
    return;
  }

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

function playFireSound(audio) {
  // In case webAudio is not supported
  if (! audio) {
    return;
  }

  var osc = audio.createOscillator();
  var gain = audio.createGain();
  var time = audio.currentTime;

  gain.connect(audio.destination);
  osc.connect(gain);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(Math.pow(1.05, 880 / -20) / 2, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(Math.pow(1.05, 660 / -20) / 2, time + 1.99);
  gain.gain.linearRampToValueAtTime(0, time + 2);

  osc.frequency.setValueAtTime(880, time);
  osc.frequency.exponentialRampToValueAtTime(660, time + 1.99);

  osc.start(time);
  osc.stop(time + 2)
}
