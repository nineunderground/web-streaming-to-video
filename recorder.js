// Recorder page - handles the actual screen capture

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let startTime = null;
let timerInterval = null;
let recordedBlob = null;

// DOM elements
const idleState = document.getElementById('idleState');
const recordingState = document.getElementById('recordingState');
const saveState = document.getElementById('saveState');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const newBtn = document.getElementById('newBtn');
const timerEl = document.getElementById('timer');
const finalTimeEl = document.getElementById('finalTime');
const filenameEl = document.getElementById('filename');
const dot = document.getElementById('dot');
const errorEl = document.getElementById('errorMsg');

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

// Show error message
function showError(msg) {
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}

// Hide error message  
function hideError() {
  if (errorEl) {
    errorEl.classList.add('hidden');
  }
}

// Show specific state
function showState(state) {
  console.log('Switching to state:', state);
  idleState.classList.add('hidden');
  recordingState.classList.add('hidden');
  saveState.classList.add('hidden');
  
  if (state === 'idle') idleState.classList.remove('hidden');
  if (state === 'recording') recordingState.classList.remove('hidden');
  if (state === 'save') saveState.classList.remove('hidden');
  
  dot.classList.toggle('recording', state === 'recording');
}

// Called when recording is fully stopped
function onRecordingStopped() {
  console.log('Recording stopped, chunks:', recordedChunks.length);
  
  // Stop the timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Create the blob immediately
  if (recordedChunks.length > 0) {
    recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
    console.log('Created blob:', recordedBlob.size, 'bytes');
  }
  
  // Update final time display
  if (startTime) {
    finalTimeEl.textContent = formatTime(Date.now() - startTime);
  }
  
  // Generate default filename
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  filenameEl.value = `recording-${timestamp}`;
  
  // Show save state
  showState('save');
}

// Start recording
async function startRecording() {
  hideError();
  console.log('Starting recording...');
  
  try {
    // Request screen/tab capture
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser"
      },
      audio: true
    });

    console.log('Got stream');
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log(`Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);

    recordedChunks = [];
    recordedBlob = null;
    
    // Find supported mime type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus', 
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    console.log(`Using mime type: ${mimeType}`);
    
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(`Chunk: ${event.data.size} bytes, total chunks: ${recordedChunks.length}`);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('MediaRecorder onstop fired');
      onRecordingStopped();
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      showError(`Recording error: ${event.error?.message || 'Unknown error'}`);
    };

    // Handle stream ending (user clicked "Stop sharing" in browser)
    videoTracks[0].onended = () => {
      console.log('Video track ended externally');
      stopRecording();
    };

    // Start recording
    mediaRecorder.start(1000);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
    
    showState('recording');
    console.log('Recording started successfully');
    
  } catch (err) {
    console.error('Error starting recording:', err);
    
    let errorMsg = 'Recording failed. ';
    
    if (err.name === 'NotAllowedError') {
      errorMsg = 'Permission denied. Click "Start Recording" and select a tab to share.';
    } else if (err.name === 'NotFoundError') {
      errorMsg = 'No screen or tab available to record.';
    } else if (err.name === 'AbortError') {
      errorMsg = 'Recording was cancelled.';
    } else if (err.name === 'NotSupportedError') {
      errorMsg = 'Screen recording not supported in this browser.';
    } else {
      errorMsg += err.message || 'Unknown error.';
    }
    
    showError(errorMsg);
  }
}

// Stop recording
function stopRecording() {
  console.log('stopRecording called');
  console.log('mediaRecorder state:', mediaRecorder?.state);
  
  // Stop all stream tracks first
  if (stream) {
    stream.getTracks().forEach(track => {
      console.log(`Stopping track: ${track.kind}`);
      track.stop();
    });
    stream = null;
  }
  
  // Stop the media recorder
  if (mediaRecorder) {
    if (mediaRecorder.state === 'recording') {
      console.log('Stopping mediaRecorder...');
      mediaRecorder.stop();
    } else if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      mediaRecorder.stop();
    } else {
      console.log('MediaRecorder already inactive, showing save state');
      onRecordingStopped();
    }
  } else {
    console.log('No mediaRecorder, showing save state');
    onRecordingStopped();
  }
}

// Save recording - uses simple download link approach
function saveRecording() {
  console.log('saveRecording called');
  
  if (!recordedBlob || recordedBlob.size === 0) {
    console.log('No blob or empty blob');
    if (recordedChunks.length > 0) {
      recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
      console.log('Created blob from chunks:', recordedBlob.size);
    } else {
      showError('No recording data to save.');
      return;
    }
  }
  
  let filename = filenameEl.value.trim() || 'recording';
  if (!filename.endsWith('.webm')) {
    filename += '.webm';
  }
  
  console.log(`Saving ${recordedBlob.size} bytes as ${filename}`);
  
  // Create download link and click it
  const url = URL.createObjectURL(recordedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(a);
  console.log('Clicking download link...');
  a.click();
  
  // Cleanup after a short delay
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Download triggered, cleanup done');
  }, 100);
}

// Reset for new recording
function resetRecorder() {
  console.log('Resetting recorder');
  recordedChunks = [];
  recordedBlob = null;
  stream = null;
  mediaRecorder = null;
  startTime = null;
  timerEl.textContent = '00:00:00';
  hideError();
  showState('idle');
}

// Event listeners
console.log('Setting up event listeners');

startBtn.addEventListener('click', function(e) {
  console.log('Start button clicked', e);
  startRecording();
});

stopBtn.addEventListener('click', function(e) {
  console.log('Stop button clicked', e);
  stopRecording();
});

saveBtn.addEventListener('click', function(e) {
  console.log('Save button clicked', e);
  e.preventDefault();
  saveRecording();
});

newBtn.addEventListener('click', function(e) {
  console.log('New button clicked', e);
  resetRecorder();
});

// Handle Enter key in filename input
filenameEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveRecording();
  }
});

console.log('Recorder initialized');
