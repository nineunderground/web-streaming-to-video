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
const downloadLink = document.getElementById('downloadLink');
const newBtn = document.getElementById('newBtn');
const timerEl = document.getElementById('timer');
const finalTimeEl = document.getElementById('finalTime');
const filenameEl = document.getElementById('filename');
const fileSizeEl = document.getElementById('fileSize');
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

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

// Prepare download link with the recorded video
function prepareDownload() {
  console.log('Preparing download, chunks:', recordedChunks.length);
  
  if (recordedChunks.length === 0) {
    showError('No recording data available.');
    return;
  }
  
  // Create blob
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  console.log('Blob created:', blob.size, 'bytes');
  
  // Show file size
  fileSizeEl.textContent = `File size: ${formatSize(blob.size)}`;
  
  // Create object URL and set on download link
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  
  // Update filename when input changes
  updateDownloadFilename();
}

// Update the download link filename
function updateDownloadFilename() {
  let filename = filenameEl.value.trim() || 'recording';
  if (!filename.endsWith('.webm')) {
    filename += '.webm';
  }
  downloadLink.download = filename;
  downloadLink.textContent = `💾 Save Video: ${filename}`;
}

// Called when recording is fully stopped
function onRecordingStopped() {
  console.log('Recording stopped, chunks:', recordedChunks.length);
  
  // Stop the timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Update final time display
  if (startTime) {
    finalTimeEl.textContent = formatTime(Date.now() - startTime);
  }
  
  // Generate default filename
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  filenameEl.value = `recording-${timestamp}`;
  
  // Prepare the download link
  prepareDownload();
  
  // Show save state
  showState('save');
}

// Start recording
async function startRecording() {
  hideError();
  startBtn.disabled = true;
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
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('MediaRecorder onstop event');
      onRecordingStopped();
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      showError(`Recording error: ${event.error?.message || 'Unknown error'}`);
      startBtn.disabled = false;
    };

    // Handle stream ending (user clicked "Stop sharing" in browser)
    videoTracks[0].onended = () => {
      console.log('Video track ended externally');
      doStopRecording();
    };

    // Start recording - request data every second
    mediaRecorder.start(1000);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 100);
    
    showState('recording');
    console.log('Recording started successfully');
    
  } catch (err) {
    console.error('Error starting recording:', err);
    startBtn.disabled = false;
    
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

// Actually stop the recording
function doStopRecording() {
  console.log('doStopRecording called');
  
  // Disable stop button to prevent double clicks
  stopBtn.disabled = true;
  
  // First, stop the media recorder if it's recording
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    console.log('Calling mediaRecorder.stop()');
    // Request any remaining data
    mediaRecorder.requestData();
    mediaRecorder.stop();
  }
  
  // Then stop all tracks
  if (stream) {
    console.log('Stopping stream tracks');
    stream.getTracks().forEach(track => {
      track.stop();
    });
    stream = null;
  }
}

// Stop button handler
function stopRecording() {
  console.log('stopRecording called, mediaRecorder.state:', mediaRecorder?.state);
  
  if (!mediaRecorder) {
    console.log('No mediaRecorder');
    return;
  }
  
  if (mediaRecorder.state === 'inactive') {
    console.log('Already stopped');
    onRecordingStopped();
    return;
  }
  
  doStopRecording();
}

// Reset for new recording
function resetRecorder() {
  console.log('Resetting recorder');
  
  // Revoke old blob URL if exists
  if (downloadLink.href && downloadLink.href.startsWith('blob:')) {
    URL.revokeObjectURL(downloadLink.href);
  }
  
  recordedChunks = [];
  stream = null;
  mediaRecorder = null;
  startTime = null;
  timerEl.textContent = '00:00:00';
  downloadLink.href = '#';
  downloadLink.download = 'recording.webm';
  startBtn.disabled = false;
  stopBtn.disabled = false;
  hideError();
  showState('idle');
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
newBtn.addEventListener('click', resetRecorder);

// Update download filename when input changes
filenameEl.addEventListener('input', updateDownloadFilename);
filenameEl.addEventListener('change', updateDownloadFilename);

console.log('Recorder initialized');
