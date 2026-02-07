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
    // Firefox-compatible options for getDisplayMedia
    const displayMediaOptions = {
      video: {
        displaySurface: "browser"
      },
      audio: true
    };

    // Request screen/tab capture
    stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    // Check if we got audio
    const audioTracks = stream.getAudioTracks();
    console.log(`Audio tracks: ${audioTracks.length}`);

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
    console.log(`Using mime type: ${mimeType}`);
    
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

    // Handle stream ending (user clicked "Stop sharing" in browser UI)
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
    
    let errorMsg = 'Recording failed. ';
    
    if (err.name === 'NotAllowedError') {
      errorMsg = 'Permission denied. Please try again and select a tab to share.';
    } else if (err.name === 'NotFoundError') {
      errorMsg = 'No screen/tab found to record.';
    } else if (err.name === 'AbortError') {
      errorMsg = 'Recording was cancelled.';
    } else {
      errorMsg += err.message || 'Unknown error.';
    }
    
    showError(errorMsg);
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
