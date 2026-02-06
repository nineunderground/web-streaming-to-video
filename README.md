# Tab Recorder - Firefox Extension

Record any browser tab with audio, with one click.

## Features

- 🔴 One-click recording start/stop
- 🎵 Captures tab audio (if shared)
- ⏱️ Live recording timer
- 💾 Custom filename with save dialog
- 🎨 Clean dark UI

## Installation

### Temporary (for testing)

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select the `manifest.json` file from this folder

The extension will appear in your toolbar.

### Permanent (unsigned)

1. Go to `about:config`
2. Set `xpinstall.signatures.required` to `false`
3. Zip the extension folder
4. Rename to `.xpi`
5. Drag into Firefox

## Usage

1. Click the 🔴 icon in the toolbar
2. Click **"Start Recording"**
3. Firefox will ask you to select what to share:
   - Select **"Browser Tab"** (not Window or Screen)
   - ✅ Check **"Also share tab audio"** 
4. Click **"Allow"**
5. Recording starts — you'll see the timer
6. When done, click **"Stop Recording"**
7. Enter a filename and click **"Save Video"**
8. Choose where to save the `.webm` file

## Output

- Format: WebM (VP9 + Opus audio)
- Works in VLC, browsers, most video players
- Can be converted to MP4 with ffmpeg:

```bash
ffmpeg -i recording.webm -c:v libx264 -c:a aac output.mp4
```

## Tips

- Make sure to check "Share tab audio" when prompted
- Recording continues even if you close the popup
- Stop by clicking the toolbar icon again
- Large recordings may take a moment to save

## License

MIT
