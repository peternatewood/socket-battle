var audio;
if (typeof AudioContext != 'undefined') {
  audio = new AudioContext;
}
else if (typeof webkitAudioContext != 'undefined') {
  audio = new webkitAudioContext;
}

if (typeof audio != 'undefined') {
  audio.mute = false;
}

function startTone(audio, freq, type, start, stop) {
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
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
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
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
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
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
  osc.stop(time + 2);
}

function playShipHitSound(audio) {
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
    return;
  }

  var osc = audio.createOscillator();
  var gain = audio.createGain();
  var time = audio.currentTime;

  gain.connect(audio.destination);
  osc.connect(gain);

  osc.type = 'square';

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(Math.pow(1.05, 96 / -20) / 4, time + 0.01);

  gain.gain.setValueAtTime(Math.pow(1.05, 80 / -20) / 4, time + 0.15);
  gain.gain.exponentialRampToValueAtTime(Math.pow(1.05, 50 / -20) / 4, time + 0.7);
  gain.gain.linearRampToValueAtTime(0, time + 1);

  osc.frequency.setValueAtTime(96, time);
  osc.frequency.setValueAtTime(80, time + 0.15);
  osc.frequency.exponentialRampToValueAtTime(50, time + 0.7);

  osc.start(time);
  osc.stop(time + 0.71);
}

function playShipSunkSound(audio) {
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
    return;
  }

  var osc = audio.createOscillator();
  var osc2 = audio.createOscillator();
  var gain = audio.createGain();
  var gain2 = audio.createGain();
  var time = audio.currentTime;

  osc.frequency.setValueAtTime(52, time);
  osc2.frequency.setValueAtTime(64, time);

  osc.type = 'square';
  osc2.type = 'sawtooth';

  gain.connect(audio.destination);
  gain2.connect(audio.destination);
  osc.connect(gain);
  osc2.connect(gain);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(Math.pow(1.05, 52 / -20) / 4, time + 0.01);
  gain.gain.linearRampToValueAtTime(0, time + 1);

  gain2.gain.setValueAtTime(0, time);
  gain2.gain.linearRampToValueAtTime(Math.pow(1.05, 64 / -20) / 4, time + 0.01);
  gain2.gain.linearRampToValueAtTime(0, time + 1);

  osc.start(time);
  osc2.start(time);

  osc.stop(time + 1);
  osc2.stop(time + 1);
}

function playSplashSound(audio) {
  // In case webAudio is not supported or mute is active
  if (! audio || audio.mute) {
    return;
  }

  var gain = audio.createGain();
  var time = audio.currentTime;

  var pink = (function() {
    var bufferSize = 4096;
    var b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    var node = audio.createScriptProcessor(bufferSize, 1, 1);
    node.onaudioprocess = function(e) {
      var output = e.outputBuffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
    }
    return node;
  })();

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
  gain.gain.linearRampToValueAtTime(0, time + 0.8);

  gain.connect(audio.destination);
  pink.connect(gain);

  setTimeout(function() { pink = null; }, 1000);
}
