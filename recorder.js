// Recorder page - handles the actual screen capture

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
  hideError();
  
  try {
    // Request screen/tab capture
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser"
      },
      audio: true
    });

    // Log what we got
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log(`Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);

    recordedChunks = [];
    
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
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(`Chunk received: ${event.data.size} bytes`);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
      finalTimeEl.textContent = timerEl.textContent;
      showState('save');
      
      // Generate default filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      filenameEl.value = `recording-${timestamp}`;
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      showError(`Recording error: ${event.error.message}`);
    };

    // Handle stream ending (user clicked "Stop sharing" in browser)
    stream.getVideoTracks()[0].onended = () => {
      console.log('Video track ended');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
      }
    };

    // Start recording with 1-second chunks
    mediaRecorder.start(1000);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    showState('recording');
    console.log('Recording started');
    
  } catch (err) {
    console.error('Error starting recording:', err);
    
    let errorMsg = 'Recording failed. ';
    
    if (err.name === 'NotAllowedError') {
      errorMsg = 'Permission denied or cancelled. Click "Start Recording" and select a tab to share.';
    } else if (err.name === 'NotFoundError') {
      errorMsg = 'No screen or tab available to record.';
    } else if (err.name === 'AbortError') {
      errorMsg = 'Recording was cancelled.';
    } else if (err.name === 'NotSupportedError') {
      errorMsg = 'Screen recording is not supported in this browser.';
    } else {
      errorMsg += err.message || 'Unknown error occurred.';
    }
    
    showError(errorMsg);
  }
}

// Stop recording
function stopRecording() {
  console.log('Stopping recording...');
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped track: ${track.kind}`);
    });
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Save recording
function saveRecording() {
  if (recordedChunks.length === 0) {
    showError('No recording data to save.');
    return;
  }
  
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  
  let filename = filenameEl.value.trim() || 'recording';
  if (!filename.endsWith('.webm')) {
    filename += '.webm';
  }
  
  console.log(`Saving ${blob.size} bytes as ${filename}`);
  
  // Use browser downloads API
  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }).then((downloadId) => {
    console.log(`Download started: ${downloadId}`);
  }).catch(err => {
    console.error('Download API error:', err);
    // Fallback: create a link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Reset for new recording
function resetRecorder() {
  recordedChunks = [];
  stream = null;
  mediaRecorder = null;
  startTime = null;
  timerEl.textContent = '00:00:00';
  hideError();
  showState('idle');
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
saveBtn.addEventListener('click', saveRecording);
newBtn.addEventListener('click', resetRecorder);

// Handle Enter key in filename input
filenameEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveRecording();
  }
});

// Focus filename input when save state appears
const observer = new MutationObserver(() => {
  if (!saveState.classList.contains('hidden')) {
    filenameEl.focus();
    filenameEl.select();
  }
});
observer.observe(saveState, { attributes: true, attributeFilter: ['class'] });
