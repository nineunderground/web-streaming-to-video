// State
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let startTime = null;
let timerInterval = null;

// DOM elements
const idleState = document.getElementById('idleState');
const recordingState = document.getElementById('recordingState');
const saveState = document.getElementById('saveState');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const timerEl = document.getElementById('timer');
const finalTimeEl = document.getElementById('finalTime');
const filenameEl = document.getElementById('filename');
const dot = document.getElementById('dot');

// Format time as HH:MM:SS
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => n.toString().padStart(2, '0')).join(':');
}

// Update timer display
function updateTimer() {
  if (startTime) {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }
}

// Show specific state
function showState(state) {
  idleState.classList.add('hidden');
  recordingState.classList.add('hidden');
  saveState.classList.add('hidden');
  
  if (state === 'idle') idleState.classList.remove('hidden');
  if (state === 'recording') recordingState.classList.remove('hidden');
  if (state === 'save') saveState.classList.remove('hidden');
  
  dot.classList.toggle('recording', state === 'recording');
}

// Start recording
async function startRecording() {
  try {
    // Request screen capture with audio
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
        preferCurrentTab: true
      },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      systemAudio: "include",
      surfaceSwitching: "exclude",
      monitorTypeSurfaces: "exclude"
    });

    // Check if we got audio
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log('No audio track - video only recording');
    }

    recordedChunks = [];
    
    // Try webm with different codecs
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      finalTimeEl.textContent = timerEl.textContent;
      showState('save');
      
      // Generate default filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      filenameEl.value = `recording-${timestamp}`;
    };

    // Handle stream ending (user clicked "Stop sharing")
    stream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
      }
    };

    mediaRecorder.start(1000); // Capture in 1-second chunks
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    showState('recording');
    
  } catch (err) {
    console.error('Error starting recording:', err);
    alert('Could not start recording. Make sure you select the current tab and enable audio sharing.');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Save recording
function saveRecording() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  
  let filename = filenameEl.value.trim() || 'recording';
  if (!filename.endsWith('.webm')) {
    filename += '.webm';
  }
  
  // Use browser downloads API
  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true  // This prompts for location
  }).then(() => {
    // Reset to idle state after save
    setTimeout(() => {
      showState('idle');
      recordedChunks = [];
    }, 500);
  }).catch(err => {
    console.error('Download error:', err);
    // Fallback: create a link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    setTimeout(() => {
      showState('idle');
      recordedChunks = [];
      URL.revokeObjectURL(url);
    }, 500);
  });
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
saveBtn.addEventListener('click', saveRecording);

// Handle Enter key in filename input
filenameEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveRecording();
  }
});
