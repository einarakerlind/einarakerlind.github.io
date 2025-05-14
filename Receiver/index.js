// Get DOM elements
const videoPlayer = document.getElementById('videoPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevFrameBtn = document.getElementById('prevFrameBtn');
const nextFrameBtn = document.getElementById('nextFrameBtn');
const saveFrameBtn = document.getElementById('saveFrameBtn');
const currentFrameEl = document.getElementById('currentFrame');
const totalFramesEl = document.getElementById('totalFrames');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

// Video variables
let fps = 30; // Estimated frames per second
let frameDuration; // Duration of one frame in seconds
let videoLoaded = false;

// Initialize message listener for UXP communication
window.addEventListener('message', handleUXPMessage);

// Initialize buttons
playPauseBtn.addEventListener('click', togglePlayPause);
prevFrameBtn.addEventListener('click', goToPreviousFrame);
nextFrameBtn.addEventListener('click', goToNextFrame);
saveFrameBtn.addEventListener('click', saveCurrentFrame);

// Handle UXP messages
function handleUXPMessage(event) {
    const message = event.data;
    
    // Check if the message is for loading a video
    if (message && message.key === 'loadVideo' && message.value) {
        loadVideoFromUXP(message.value);
    }
}

// Load video from UXP message
function loadVideoFromUXP(videoData) {
    // videoData is expected to be a URL or Data URI usable as video.src
    
    // Reset UI elements related to previous video if any
    resetVideoState();
    
    // Load the video
    videoPlayer.crossOrigin = 'anonymous';
    videoPlayer.src = videoData;
    
    // Use 'loadedmetadata' for initial setup, 'canplay' might be better for ensuring playback readiness
    videoPlayer.addEventListener('loadedmetadata', initializeVideo);
    videoPlayer.addEventListener('error', handleVideoError); // Add error handling
    videoPlayer.load(); // Trigger loading
    
    showStatus('Receiving video from UXP plugin...');
}

function handleVideoError(e) {
    console.error("Video Error:", e);
    showStatus(`Error loading video: ${e.message || 'Unknown error'}`);
    resetVideoState(); // Ensure controls are disabled etc.
}

// Reset video player state and UI
function resetVideoState() {
    pauseVideo(); // Ensure it's paused
    videoPlayer.removeAttribute('src'); // Remove old source
    videoPlayer.load(); // Reset the player
    
    videoLoaded = false;
    currentFrameEl.textContent = '0';
    totalFramesEl.textContent = '0';
    currentTimeEl.textContent = '0.00';
    totalTimeEl.textContent = '0.00';
    
    // Disable controls
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = 'Play';
    prevFrameBtn.disabled = true;
    nextFrameBtn.disabled = true;
    saveFrameBtn.disabled = true;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Remove old event listeners to prevent duplicates if loading multiple videos
    videoPlayer.removeEventListener('loadedmetadata', initializeVideo);
    videoPlayer.removeEventListener('timeupdate', updateFrameInfo);
    videoPlayer.removeEventListener('play', updatePlayPauseButton);
    videoPlayer.removeEventListener('pause', updatePlayPauseButton);
    videoPlayer.removeEventListener('ended', updatePlayPauseButton);
    videoPlayer.removeEventListener('error', handleVideoError);
}


// Initialize video data once metadata is loaded
function initializeVideo() {
    // Set canvas size to match video dimensions
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight;
    
    // Calculate total frames (estimated)
    fps = estimateFrameRate(); // Consider making FPS configurable via UXP message?
    frameDuration = 1 / fps;
    const totalFrames = Math.ceil(videoPlayer.duration * fps);
    
    // Update UI
    totalFramesEl.textContent = totalFrames || '0'; // Handle potential NaN/Infinity
    totalTimeEl.textContent = videoPlayer.duration.toFixed(2) || '0.00';
    
    // Enable controls
    videoLoaded = true;
    playPauseBtn.disabled = false;
    prevFrameBtn.disabled = false;
    nextFrameBtn.disabled = false;
    saveFrameBtn.disabled = false;
    
    // Set initial frame
    updateCurrentFrameInfo(0);
    
    // Set up event listeners for playback state and time updates
    videoPlayer.addEventListener('timeupdate', updateFrameInfo);
    videoPlayer.addEventListener('play', updatePlayPauseButton);
    videoPlayer.addEventListener('pause', updatePlayPauseButton);
    videoPlayer.addEventListener('ended', updatePlayPauseButton); // Update button when video finishes
    
    // Show status
    showStatus(`Video ready: ${videoPlayer.videoWidth}x${videoPlayer.videoHeight}, ~${fps}fps, ${videoPlayer.duration.toFixed(2)}s`);
}

// Estimate frame rate based on video duration
function estimateFrameRate() {
    // Basic estimation, could be improved or set via UXP message
    return 30;
}

// Update frame information while video is playing or seeking
function updateFrameInfo() {
    if (!videoLoaded || !isFinite(videoPlayer.duration)) return; // Check video is loaded and duration is valid
    const currentTime = videoPlayer.currentTime;
    const currentFrame = Math.round(currentTime * fps); // Use round for potentially better frame alignment
    updateCurrentFrameInfo(currentFrame);
}

// Update current frame display
function updateCurrentFrameInfo(frameNumber) {
    const totalFrames = parseInt(totalFramesEl.textContent) || 0;
    // Ensure frameNumber doesn't exceed totalFrames visually
    const displayFrame = Math.min(frameNumber, totalFrames);
    currentFrameEl.textContent = displayFrame;
    currentTimeEl.textContent = videoPlayer.currentTime.toFixed(2);
}

// Toggle play/pause state
function togglePlayPause() {
    if (!videoLoaded) return;
    
    if (videoPlayer.paused || videoPlayer.ended) {
        playVideo();
    } else {
        pauseVideo();
    }
}

// Play video function
function playVideo() {
    if (videoLoaded) {
        videoPlayer.play().catch(e => {
            console.error("Error playing video:", e);
            showStatus("Could not play video.");
            updatePlayPauseButton(); // Ensure button state is correct even on error
        });
    }
}

// Pause video function
function pauseVideo() {
    if (videoLoaded) {
        videoPlayer.pause();
    }
}

// Update play/pause button text based on video state
function updatePlayPauseButton() {
    if (!videoLoaded) {
        playPauseBtn.textContent = 'Play';
        playPauseBtn.disabled = true;
        return;
    }
    
    if (videoPlayer.paused || videoPlayer.ended) {
        playPauseBtn.textContent = 'Play';
    } else {
        playPauseBtn.textContent = 'Pause';
    }
    playPauseBtn.disabled = false; // Should be enabled if video is loaded
}

// Go to previous frame
function goToPreviousFrame() {
    if (!videoLoaded || !isFinite(frameDuration)) return;
    
    pauseVideo(); // Ensure paused before seeking
    
    // Calculate target time ensuring it doesn't go below zero
    const targetTime = Math.max(0, videoPlayer.currentTime - frameDuration);
    
    // Seek and update info immediately
    videoPlayer.currentTime = targetTime;
    // 'seeked' event could be used, but manual update often feels more responsive for frame stepping
    const prevFrame = Math.round(targetTime * fps);
    updateCurrentFrameInfo(prevFrame);
}

// Go to next frame
function goToNextFrame() {
    if (!videoLoaded || !isFinite(frameDuration) || !isFinite(videoPlayer.duration)) return;
    
    pauseVideo(); // Ensure paused before seeking
    
    // Calculate target time ensuring it doesn't exceed duration
    const targetTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + frameDuration);
    
    // Seek and update info immediately
    videoPlayer.currentTime = targetTime;
    const nextFrame = Math.round(targetTime * fps);
    updateCurrentFrameInfo(nextFrame);
}

// Send image data to UXP host
function sendImageData(frameNumber, frameTime) {
    if (window.uxpHost && window.uxpHost.postMessage) {
        try {
            const imageData = {
                "key": "imageDetails",
                "value": {
                   "dataUrl": canvas.toDataURL('image/png'), // Send as PNG Data URL
                   "frameNumber": frameNumber,
                   "frameTime": frameTime,
                   "width": canvas.width,
                   "height": canvas.height
                }
            };
            window.uxpHost.postMessage(imageData);
            return true;
        } catch (e) {
            console.error("Error sending message to UXP:", e);
            showStatus("Error sending frame data.");
            return false;
        }
    } else {
        console.warn("window.uxpHost.postMessage not available. Cannot send frame.");
        showStatus("Cannot send frame: UXP host not connected.");
        return false;
    }
}

// Save current frame (by sending to UXP)
function saveCurrentFrame() {
    if (!videoLoaded) return;
    
    pauseVideo(); // Ensure video is paused to capture the correct frame
    
    // Use a short timeout to ensure the frame is rendered after pause/seek
    setTimeout(() => {
        try {
            // Draw current video frame to canvas
            ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
            
            // Get current frame information
            const currentFrame = parseInt(currentFrameEl.textContent);
            const currentTime = videoPlayer.currentTime;
            
            // Send the frame data to UXP
            const sent = sendImageData(currentFrame, currentTime);
            
            if (sent) {
                showStatus(`Frame ${currentFrame} data sent to host!`);
            }
            // No else needed as fallback is removed
            
        } catch (e) {
            console.error("Error drawing or sending frame:", e);
            showStatus("Error capturing or sending frame.");
        }
    }, 50); // 50ms delay, adjust if needed
}

// Show status message with auto-clear
function showStatus(message) {
    statusEl.textContent = message;
    // Clear previous timeout if any
    if (window.statusTimeout) {
        clearTimeout(window.statusTimeout);
    }
    // Set new timeout
    window.statusTimeout = setTimeout(() => {
        statusEl.textContent = '';
        window.statusTimeout = null;
    }, 4000); // Increased duration slightly
}

// Announce ready state to UXP host
function announceReadyToUXP() {
    if (window.uxpHost && window.uxpHost.postMessage) {
        window.uxpHost.postMessage({
            "key": "webviewReady",
            "value": true
        });
        console.log("Webview ready message sent to UXP.");
    } else {
        console.warn("window.uxpHost.postMessage not available. Cannot announce ready state.");
        // Optional: show a status message if not in UXP context
        // showStatus("Ready (running outside UXP context).");
    }
}

// Announce ready when page is loaded
window.addEventListener('load', announceReadyToUXP);

// Initial setup: disable controls until video is loaded
resetVideoState();
