class AnimationEditor {
    constructor() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.onionSkinCanvas = document.getElementById('onionSkinCanvas');
        this.onionSkinCtx = this.onionSkinCanvas.getContext('2d');
        this.frameCountInput = document.getElementById('frameCount');
        this.createFramesBtn = document.getElementById('createFrames');
        this.frameThumbnails = document.getElementById('frameThumbnails');
        this.copyPreviousBtn = document.getElementById('copyPrevious');
        this.toggleModeBtn = document.getElementById('toggleMode');
        this.playPauseBtn = document.getElementById('playPause');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.clearFrameBtn = document.getElementById('clearFrame');
        this.toggleOnionSkinBtn = document.getElementById('toggleOnionSkin');
        
        this.frames = [];
        this.currentFrame = 0;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.isEraseMode = false;
        this.isPlaying = false;
        this.animationInterval = null;
        this.fps = 10;
        this.currentColor = '#000000';
        this.showOnionSkin = false;

        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        // Set canvas size to match container
        const container = this.mainCanvas.parentElement;
        this.mainCanvas.width = container.clientWidth;
        this.mainCanvas.height = container.clientHeight;
        this.onionSkinCanvas.width = container.clientWidth;
        this.onionSkinCanvas.height = container.clientHeight;

        // Set drawing style
        this.updateDrawingStyle();
    }

    updateDrawingStyle() {
        // Set drawing styles for the mainCtx (display) based on current mode and color
        if (this.isEraseMode) {
            this.mainCtx.globalCompositeOperation = 'source-over';
            this.mainCtx.strokeStyle = '#f8f9fa';
            this.mainCtx.lineWidth = 20;
        } else {
            this.mainCtx.globalCompositeOperation = 'source-over';
            this.mainCtx.strokeStyle = this.currentColor;
            this.mainCtx.lineWidth = 2;
        }
        this.mainCtx.lineCap = 'round';
        this.mainCtx.lineJoin = 'round';
    }

    setupEventListeners() {
        // Create frames button
        this.createFramesBtn.addEventListener('click', () => this.createFrames());

        // Copy previous frame button
        this.copyPreviousBtn.addEventListener('click', () => this.copyPreviousFrame());

        // Toggle draw/erase mode
        this.toggleModeBtn.addEventListener('click', () => {
            this.isEraseMode = !this.isEraseMode;
            this.toggleModeBtn.textContent = this.isEraseMode ? 'Erase Mode' : 'Draw Mode';
            this.toggleModeBtn.classList.toggle('active', !this.isEraseMode);
            this.updateDrawingStyle();
            this.redrawCurrentFrame();
        });

        // Drawing events
        this.mainCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.mainCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.mainCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.mainCanvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events
        this.mainCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.mainCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.mainCanvas.addEventListener('touchend', () => this.stopDrawing());

        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        // Speed slider
        this.speedSlider.addEventListener('input', () => {
            this.fps = parseInt(this.speedSlider.value);
            this.speedValue.textContent = `${this.fps} fps`;
            if (this.isPlaying) {
                this.stopAnimation();
                this.startAnimation();
            }
        });

        // Clear frame button
        this.clearFrameBtn.addEventListener('click', () => this.clearCurrentFrame());

        // Color selection
        document.querySelectorAll('.color-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('active'));
                circle.classList.add('active');
                
                // Update current color
                this.currentColor = circle.dataset.color;
                this.updateDrawingStyle();
            });
        });

        // Onion skin toggle
        this.toggleOnionSkinBtn.addEventListener('click', () => {
            this.showOnionSkin = !this.showOnionSkin;
            this.toggleOnionSkinBtn.classList.toggle('active', this.showOnionSkin);
            this.toggleOnionSkinBtn.textContent = this.showOnionSkin ? 'Hide Onion Skin' : 'Show Onion Skin';
            this.updateOnionSkin();
        });
    }

    createFrames() {
        // Stop animation if playing
        if (this.isPlaying) {
            this.stopAnimation();
        }

        const count = parseInt(this.frameCountInput.value);
        if (count < 1) return;

        // Clear existing frames
        this.frames = [];
        this.frameThumbnails.innerHTML = '';

        // Create new frames
        for (let i = 0; i < count; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.mainCanvas.width;
            canvas.height = this.mainCanvas.height;
            const ctx = canvas.getContext('2d');
            
            // Fill new frame canvas with background color to ensure it's not transparent
            ctx.fillStyle = '#f8f9fa'; // Match container background color
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const thumbnail = document.createElement('div');
            thumbnail.className = 'frame-thumbnail';
            
            const thumbnailCanvas = document.createElement('canvas');
            thumbnailCanvas.width = 100;
            thumbnailCanvas.height = 100;
            thumbnail.appendChild(thumbnailCanvas);
            
            thumbnail.addEventListener('click', () => this.selectFrame(i));
            
            this.frameThumbnails.appendChild(thumbnail);
            this.frames.push({
                canvas: canvas,
                ctx: ctx,
                thumbnailCanvas: thumbnailCanvas,
                thumbnailCtx: thumbnailCanvas.getContext('2d')
            });
        }

        this.selectFrame(0);
        this.copyPreviousBtn.disabled = false;
    }

    copyPreviousFrame() {
        if (this.currentFrame === 0) return;
        
        const previousFrame = this.frames[this.currentFrame - 1];
        const currentFrame = this.frames[this.currentFrame];
        
        // Copy the full resolution canvas
        currentFrame.ctx.clearRect(0, 0, currentFrame.canvas.width, currentFrame.canvas.height);
        currentFrame.ctx.drawImage(previousFrame.canvas, 0, 0);
        
        // Update the thumbnail
        this.updateThumbnail(this.currentFrame);
        
        // Update the main canvas
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.drawImage(currentFrame.canvas, 0, 0);
    }

    selectFrame(index) {
        if (index < 0 || index >= this.frames.length) return;

        // Save current frame thumbnail (actual frame data is saved by draw/stopDrawing)
        if (this.currentFrame !== null) {
            this.updateThumbnail(this.currentFrame);
        }

        // Update current frame
        this.currentFrame = index;
        
        // Redraw the main canvas and onion skin
        this.redrawCurrentFrame();
        this.updateOnionSkin();

        // Update thumbnail selection
        document.querySelectorAll('.frame-thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    updateThumbnail(index) {
        const frame = this.frames[index];
        frame.thumbnailCtx.clearRect(0, 0, frame.thumbnailCanvas.width, frame.thumbnailCanvas.height);
        frame.thumbnailCtx.drawImage(frame.canvas, 0, 0, frame.thumbnailCanvas.width, frame.thumbnailCanvas.height);
    }

    startDrawing(e) {
        if (this.isPlaying) return;

        this.isDrawing = true;
        const rect = this.mainCanvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;

        // Set drawing styles for the permanent frame canvas
        if (this.isEraseMode) {
            this.frames[this.currentFrame].ctx.globalCompositeOperation = 'source-over';
            this.frames[this.currentFrame].ctx.strokeStyle = '#f8f9fa';
            this.frames[this.currentFrame].ctx.lineWidth = 20;
        } else {
            this.frames[this.currentFrame].ctx.globalCompositeOperation = 'source-over';
            this.frames[this.currentFrame].ctx.strokeStyle = this.currentColor;
            this.frames[this.currentFrame].ctx.lineWidth = 2;
        }
        this.frames[this.currentFrame].ctx.lineCap = 'round';
        this.frames[this.currentFrame].ctx.lineJoin = 'round';

        // Save mainCtx state to isolate temporary drawing styles
        this.mainCtx.save(); 
        if (this.isEraseMode) {
            this.mainCtx.globalCompositeOperation = 'source-over';
            this.mainCtx.strokeStyle = '#f8f9fa';
            this.mainCtx.lineWidth = 20;
        } else {
            this.mainCtx.globalCompositeOperation = 'source-over';
            this.mainCtx.strokeStyle = this.currentColor;
            this.mainCtx.lineWidth = 2;
        }
        this.mainCtx.lineCap = 'round';
        this.mainCtx.lineJoin = 'round';

        // Begin paths for both contexts
        this.frames[this.currentFrame].ctx.beginPath();
        this.frames[this.currentFrame].ctx.moveTo(this.lastX, this.lastY);

        this.mainCtx.beginPath();
        this.mainCtx.moveTo(this.lastX, this.lastY);
    }

    draw(e) {
        if (!this.isDrawing || this.isPlaying) return;

        const rect = this.mainCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Draw on the permanent frame context (for saving)
        this.frames[this.currentFrame].ctx.lineTo(x, y);
        this.frames[this.currentFrame].ctx.stroke();

        // Draw on the main canvas for real-time visual feedback
        this.mainCtx.lineTo(x, y);
        this.mainCtx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Restore mainCtx state to remove temporary drawing styles
            this.mainCtx.restore();

            // Update the thumbnail (it gets content from the frame's permanent canvas)
            this.updateThumbnail(this.currentFrame);

            // Redraw the main canvas to ensure correct final display
            this.redrawCurrentFrame();
        }
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }

    startAnimation() {
        if (this.frames.length === 0) return;
        
        this.isPlaying = true;
        this.playPauseBtn.textContent = 'Pause';
        this.playPauseBtn.classList.remove('play');
        this.playPauseBtn.classList.add('pause');
        
        // Disable drawing controls while playing
        this.toggleModeBtn.disabled = true;
        this.copyPreviousBtn.disabled = true;
        this.clearFrameBtn.disabled = true;
        this.toggleOnionSkinBtn.disabled = true;

        const frameInterval = 1000 / this.fps;
        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            // Only redraw current frame, no onion skin during animation
            this.redrawCurrentFrame();
            this.onionSkinCtx.clearRect(0, 0, this.onionSkinCanvas.width, this.onionSkinCanvas.height);
            
            // Update thumbnail selection
            document.querySelectorAll('.frame-thumbnail').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === this.currentFrame);
            });
        }, frameInterval);
    }

    stopAnimation() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = 'Play';
        this.playPauseBtn.classList.remove('pause');
        this.playPauseBtn.classList.add('play');
        
        // Re-enable drawing controls
        this.toggleModeBtn.disabled = false;
        this.copyPreviousBtn.disabled = this.currentFrame === 0;
        this.clearFrameBtn.disabled = false;
        this.toggleOnionSkinBtn.disabled = false;
        
        clearInterval(this.animationInterval);
        // Redraw the current frame and onion skin after stopping animation
        this.redrawCurrentFrame();
        this.updateOnionSkin();
    }

    clearCurrentFrame() {
        if (this.isPlaying) return;
        
        // Clear current frame's permanent content
        this.frames[this.currentFrame].ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        // Fill with background color to ensure it's not transparent after clearing
        this.frames[this.currentFrame].ctx.fillStyle = '#f8f9fa'; // Match container background color
        this.frames[this.currentFrame].ctx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        // Redraw main canvas to reflect cleared frame (and onion skin if active)
        this.redrawCurrentFrame();
        
        // Update thumbnail
        this.updateThumbnail(this.currentFrame);
    }

    redrawCurrentFrame() {
        // Clear main canvas
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        // Draw current frame's permanent content
        this.mainCtx.drawImage(this.frames[this.currentFrame].canvas, 0, 0);
    }

    updateOnionSkin() {
        // Clear onion skin canvas
        this.onionSkinCtx.clearRect(0, 0, this.onionSkinCanvas.width, this.onionSkinCanvas.height);
        
        // Draw onion skin if enabled and not first frame
        if (this.showOnionSkin && this.currentFrame > 0) {
            const previousFrame = this.frames[this.currentFrame - 1];
            this.onionSkinCtx.globalAlpha = 0.3;
            this.onionSkinCtx.drawImage(previousFrame.canvas, 0, 0);
            this.onionSkinCtx.globalAlpha = 1.0;
        }
    }
}

// Initialize the editor when the page loads
window.addEventListener('load', () => {
    new AnimationEditor();
});
