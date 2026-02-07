// Background script - handles communication between popup and recorder

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openRecorder') {
    // Open recorder in a new small window
    browser.windows.create({
      url: browser.runtime.getURL('recorder.html'),
      type: 'popup',
      width: 350,
      height: 500
    });
  }
  return true;
});
