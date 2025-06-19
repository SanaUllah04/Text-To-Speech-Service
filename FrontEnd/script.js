class TTSInterface {
    constructor() {
        this.currentStep = 1;
        this.isConverting = false;
        this.audioBlob = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.enterBtn = document.getElementById('enterBtn');
        this.textInput = document.getElementById('textInput');
        this.wordCounter = document.getElementById('wordCounter');
        this.convertBtn = document.getElementById('convertBtn');
        this.audioOutput = document.getElementById('audioOutput');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.audioSource = document.getElementById('audioSource');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.successMessage = document.getElementById('successMessage');
    }

    bindEvents() {
        this.enterBtn.addEventListener('click', () => this.handleEnterClick());
        this.textInput.addEventListener('input', () => this.handleTextInput());
        this.convertBtn.addEventListener('click', () => this.handleConvertClick());
        this.downloadBtn.addEventListener('click', () => this.handleDownloadClick());
        this.refreshBtn.addEventListener('click', () => this.handleRefreshClick());
    }

    handleEnterClick() {
        this.enterBtn.classList.add('loading');
        this.enterBtn.disabled = true;

        // Start library installation
        this.installLibraries();
    }

    async installLibraries() {
        try {
            const response = await fetch('http://localhost:5000/api/start-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Libraries installed:', result.results);
                this.activateStep(2);
                this.textInput.classList.add('enabled');
                this.textInput.focus();
            } else {
                alert(`Installation failed: ${result.message}`);
            }
            
        } catch (error) {
            console.error('Backend connection error:', error);
            alert('Could not connect to backend server. Make sure the Python server is running on localhost:5000');
            
            // Continue with frontend-only mode
            this.activateStep(2);
            this.textInput.classList.add('enabled');
            this.textInput.focus();
        } finally {
            this.enterBtn.classList.remove('loading');
            this.enterBtn.disabled = false;
        }
    }

    handleTextInput() {
        const text = this.textInput.value.trim();
        const words = text ? text.split(/\s+/).filter(word => word.length > 0) : [];
        const wordCount = words.length;

        this.updateWordCounter(wordCount);
        
        if (wordCount > 0 && wordCount <= 150) {
            setTimeout(() => {
                if (!this.isConverting) {
                    this.activateStep(3);
                    this.convertBtn.disabled = false;
                }
            }, 2000);
        } else {
            this.convertBtn.disabled = true;
            this.deactivateStep(3);
        }
    }

    updateWordCounter(count) {
        this.wordCounter.textContent = `${count} / 150 words`;
        this.wordCounter.classList.toggle('warning', count > 150);
        
        if (count > 150) {
            this.convertBtn.disabled = true;
            this.deactivateStep(3);
        }
    }

    async handleConvertClick() {
        if (this.isConverting) return;
        
        this.isConverting = true;
        this.convertBtn.classList.add('loading');
        this.convertBtn.disabled = true;

        try {
            // Simulate TTS conversion process
            await this.simulateTTSConversion();
            
            this.activateStep(4);
            this.showSuccessMessage();
            this.displayAudioOutput();
        } catch (error) {
            console.error('TTS conversion failed:', error);
            alert('Conversion failed. Please try again.');
        } finally {
            this.isConverting = false;
            this.convertBtn.classList.remove('loading');
        }
    }

    async simulateTTSConversion() {
        const text = this.textInput.value.trim();
        
        try {
            // Save text to backend
            const saveResponse = await fetch('http://localhost:5000/api/save-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            if (!saveResponse.ok) {
                throw new Error('Failed to save text');
            }
            
            // Convert to speech
            const convertResponse = await fetch('http://localhost:5000/api/convert-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await convertResponse.json();
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            if (result.audio_file) {
                // Download the audio file
                const audioResponse = await fetch(`http://localhost:5000/api/download-audio/${result.audio_file}`);
                if (audioResponse.ok) {
                    this.audioBlob = await audioResponse.blob();
                }
            }
            
        } catch (error) {
            console.error('TTS Conversion Error:', error);
            // Fallback to demo audio if backend fails
            this.audioBlob = await this.createDummyAudio();
            throw error;
        }
    }

    async createDummyAudio() {
        // Create a simple beep tone for demonstration
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 2;
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        }

        const audioBlob = new Blob([this.bufferToWave(buffer)], { type: 'audio/wav' });
        return audioBlob;
    }

    bufferToWave(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        const data = buffer.getChannelData(0);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);

        // Convert float samples to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }

        return arrayBuffer;
    }

    showSuccessMessage() {
        this.successMessage.classList.add('show');
        setTimeout(() => {
            this.successMessage.classList.remove('show');
        }, 3000);
    }

    displayAudioOutput() {
        if (this.audioBlob) {
            const audioUrl = URL.createObjectURL(this.audioBlob);
            this.audioSource.src = audioUrl;
            this.audioPlayer.load();
            this.audioPlayer.style.display = 'block';
            this.downloadBtn.style.display = 'block';
            this.audioOutput.classList.add('has-audio');
            this.audioOutput.querySelector('p').textContent = '🎵 Your audio is ready!';
        }
    }

    handleDownloadClick() {
        if (this.audioBlob) {
            const url = URL.createObjectURL(this.audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tts-audio-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    handleRefreshClick() {
        // Reset all states
        this.currentStep = 1;
        this.isConverting = false;
        this.audioBlob = null;

        // Reset UI elements
        this.textInput.value = '';
        this.textInput.classList.remove('enabled');
        this.updateWordCounter(0);
        this.convertBtn.disabled = true;
        this.audioPlayer.style.display = 'none';
        this.downloadBtn.style.display = 'none';
        this.audioOutput.classList.remove('has-audio');
        this.audioOutput.querySelector('p').textContent = '🎵 Your audio file will appear here';
        this.successMessage.classList.remove('show');

        // Reset steps
        this.deactivateAllSteps();
        this.activateStep(1);

        // Clear any audio URLs
        if (this.audioSource.src) {
            URL.revokeObjectURL(this.audioSource.src);
            this.audioSource.src = '';
        }
    }

    activateStep(stepNumber) {
        const step = document.getElementById(`step${stepNumber}`);
        if (step) {
            step.classList.add('active');
        }
    }

    deactivateStep(stepNumber) {
        const step = document.getElementById(`step${stepNumber}`);
        if (step) {
            step.classList.remove('active');
        }
    }

    deactivateAllSteps() {
        for (let i = 1; i <= 4; i++) {
            this.deactivateStep(i);
        }
    }
}

// Initialize the TTS interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TTSInterface();
});