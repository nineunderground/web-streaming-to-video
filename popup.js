// Popup script - just opens the recorder window

document.getElementById('openRecorder').addEventListener('click', () => {
  // Open recorder in a popup window
  browser.windows.create({
    url: browser.runtime.getURL('recorder.html'),
    type: 'popup',
    width: 350,
    height: 520
  });
  
  // Close the popup
  window.close();
});
