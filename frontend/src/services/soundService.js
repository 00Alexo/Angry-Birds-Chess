class SoundService {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.7;
    this.audioContext = null;
    
    // Initialize audio context (for better browser compatibility)
    this.initializeAudioContext();
    
    // Sound URLs - using data URLs for immediate working sounds
    this.soundUrls = {
      move: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      capture: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      check: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      checkmate: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      draw: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      gameStart: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      gameEnd: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      castling: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      promotion: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      premove: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      tick: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      lowTime: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEhBzCU4P',
      notification: null, // Will use Web Audio API beep
      chat: null // Will use Web Audio API beep
    };
    
    // Load sounds
    this.loadSounds();
  }

  initializeAudioContext() {
    try {
      // Create audio context for better performance
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.log('Audio context not supported, using fallback');
    }
  }

  async loadSounds() {
    for (const [name, url] of Object.entries(this.soundUrls)) {
      try {
        if (url === null) {
          // Create Web Audio API beep for notifications
          this.sounds[name] = {
            play: () => this.createBeep(name === 'chat' ? 600 : 800),
            pause: () => {},
            currentTime: 0,
            volume: this.volume
          };
          continue;
        }

        const audio = new Audio(url);
        audio.volume = this.volume;
        audio.preload = 'auto';
        
        // Handle loading errors gracefully
        audio.onerror = () => {
          console.warn(`Failed to load sound: ${name}`);
          // Create a beep as fallback
          this.sounds[name] = {
            play: () => this.createBeep(400),
            pause: () => {},
            currentTime: 0,
            volume: this.volume
          };
        };
        
        audio.onloadeddata = () => {
          this.sounds[name] = audio;
        };
        
        // Set initial sound
        this.sounds[name] = audio;
        
      } catch (error) {
        console.warn(`Error creating audio for ${name}:`, error);
        // Create a beep fallback
        this.sounds[name] = {
          play: () => this.createBeep(400),
          pause: () => {},
          currentTime: 0,
          volume: this.volume
        };
      }
    }
  }

  // Create Web Audio API beep
  createBeep(frequency = 800, duration = 0.1) {
    if (!this.enabled) return;
    
    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
      
    } catch (error) {
      console.warn('Error creating beep:', error);
    }
  }

  // Play a specific sound
  play(soundName, options = {}) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Sound not found: ${soundName}, creating fallback beep`);
      this.createBeep();
      return;
    }

    try {
      // If it's a function (Web Audio API beep), call it directly
      if (typeof sound.play === 'function' && sound.play.toString().includes('createBeep')) {
        sound.play();
        return;
      }

      // Clone the audio to allow multiple simultaneous plays
      const audioClone = sound.cloneNode ? sound.cloneNode() : sound;
      audioClone.volume = options.volume !== undefined ? options.volume : this.volume;
      
      // Reset to beginning
      audioClone.currentTime = 0;
      
      // Play the sound
      const playPromise = audioClone.play();
      
      // Handle play promise (required for newer browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Error playing sound ${soundName}:`, error);
          // Fallback to beep
          this.createBeep();
        });
      }
      
      return audioClone;
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
      // Fallback to beep
      this.createBeep();
    }
  }

  // Play move sound based on move type
  playMoveSound(moveData) {
    if (!this.enabled) return;
    
    const { type, isCheck, isCheckmate, isCastling, isPromotion, isCapture } = moveData;
    
    if (isCheckmate) {
      this.play('checkmate');
    } else if (isCheck) {
      this.play('check');
    } else if (isCastling) {
      this.play('castling');
    } else if (isPromotion) {
      this.play('promotion');
    } else if (isCapture) {
      this.play('capture');
    } else {
      this.play('move');
    }
  }

  // Play game event sounds
  playGameStart() {
    this.play('gameStart');
  }

  playGameEnd(result) {
    if (result === 'draw') {
      this.play('draw');
    } else {
      this.play('gameEnd');
    }
  }

  playNotification() {
    this.play('notification');
  }

  playChat() {
    this.play('chat');
  }

  playPremove() {
    this.play('premove');
  }

  playTick() {
    this.play('tick');
  }

  playLowTime() {
    this.play('lowTime');
  }

  // Control methods
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    
    // Update volume for all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound && typeof sound.volume !== 'undefined') {
        sound.volume = this.volume;
      }
    });
  }

  getEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }

  // Test if sounds are working
  test() {
    this.play('move');
  }

  // Initialize audio context on user interaction (required by browsers)
  unlock() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Create and export singleton instance
const soundService = new SoundService();

// Auto-unlock on first user interaction
document.addEventListener('click', () => soundService.unlock(), { once: true });
document.addEventListener('keydown', () => soundService.unlock(), { once: true });

export default soundService;
