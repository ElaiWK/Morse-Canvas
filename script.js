        const morseCodeMap = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
            '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
            '9': '----.', '0': '-----', ' ': '/'
        };

        // --- DOM Elements ---
        const inputScreen = document.getElementById('input-screen');
        const resultScreen = document.getElementById('result-screen');
        const textInput = document.getElementById('text-input');
        const translateButton = document.getElementById('translate-button');
        const backButton = document.getElementById('back-button');
        const copyButton = document.getElementById('copy-button');
        const playButton = document.getElementById('play-button');
        const stopButton = document.getElementById('stop-button');
        const originalTextDisplay = document.getElementById('original-text-display');
        const morseCodeDisplay = document.getElementById('morse-code-display');

        // --- Canvas & Audio Setup ---
        const canvas = document.getElementById('morseCanvas');
        const ctx = canvas.getContext('2d');
        let audioContext;
        let isPlaying = false;
        let visualSignals = [];
        let currentOscillator = null;

        // --- Sizing and resizing the canvas ---
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // --- Background Animation ---
        let particles = [];
        function createParticles() {
            particles = [];
            const particleCount = Math.floor((canvas.width * canvas.height) / 20000);
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 2 + 1,
                });
            }
        }
        resizeCanvas();
        createParticles();
        window.addEventListener('resize', () => {
            resizeCanvas();
            createParticles();
        });

        // --- Main Animation Loop ---
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(3, 218, 198, 0.2)';
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            visualSignals.forEach((signal, index) => {
                signal.opacity -= 0.02;
                if (signal.opacity <= 0) {
                    visualSignals.splice(index, 1);
                } else {
                    signal.draw();
                }
            });
            requestAnimationFrame(animate);
        }
        animate();

        // --- Audio, Visual & Control Logic ---
        function initAudio() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        function playTone(duration, frequency = 600) {
            return new Promise(resolve => {
                if (!audioContext || !isPlaying) { resolve(); return; }
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration/1000);
                currentOscillator = oscillator;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + duration/1000);
                oscillator.onended = resolve;
            });
        }
        
        const sleep = ms => new Promise(res => setTimeout(res, ms));

        function drawDot() {
            visualSignals.push({ opacity: 1.0, draw: function() { ctx.fillStyle = `rgba(3, 218, 198, ${this.opacity})`; ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 15, 0, Math.PI * 2); ctx.fill(); } });
        }
        function drawDash() {
            visualSignals.push({ opacity: 1.0, draw: function() { ctx.fillStyle = `rgba(3, 218, 198, ${this.opacity})`; ctx.fillRect(canvas.width / 2 - 40, canvas.height / 2 - 7.5, 80, 15); } });
        }
        
        async function playMorseSequence(morseCode) {
            if (isPlaying) return;
            isPlaying = true;
            playButton.classList.add('hidden');
            stopButton.classList.remove('hidden');
            backButton.disabled = true;
            copyButton.disabled = true;
            const dotDuration = 150;
            const dashDuration = dotDuration * 3;
            const symbolGap = dotDuration;
            const letterGap = dotDuration * 3;
            const wordGap = dotDuration * 7;
            for (const symbol of morseCode) {
                if (!isPlaying) break;
                switch (symbol) {
                    case '.': drawDot(); await playTone(dotDuration); await sleep(symbolGap); break;
                    case '-': drawDash(); await playTone(dashDuration); await sleep(symbolGap); break;
                    case ' ': await sleep(letterGap - symbolGap); break;
                    case '/': await sleep(wordGap - letterGap); break;
                }
            }
            if (isPlaying) { stopPlayback(); }
        }

        function stopPlayback() {
            isPlaying = false;
            if(currentOscillator) { try { currentOscillator.stop(); } catch(e) {} currentOscillator = null; }
            playButton.classList.remove('hidden');
            stopButton.classList.add('hidden');
            backButton.disabled = false;
            copyButton.disabled = false;
        }

        // --- Event Listeners & Screen Navigation ---
        translateButton.addEventListener('click', () => {
            initAudio(); 
            const originalText = textInput.value;
            if (!originalText.trim()) return;
            const morseCode = originalText.toUpperCase().split('').map(char => morseCodeMap[char] || '').join(' ');
            originalTextDisplay.textContent = originalText;
            morseCodeDisplay.textContent = morseCode;
            inputScreen.classList.add('hidden');
            resultScreen.classList.remove('hidden');
        });

        backButton.addEventListener('click', () => { if (!isPlaying) { resultScreen.classList.add('hidden'); inputScreen.classList.remove('hidden'); textInput.value = ''; } });
        playButton.addEventListener('click', () => { playMorseSequence(morseCodeDisplay.textContent); });
        stopButton.addEventListener('click', stopPlayback);

        // --- FIXED Copy Button Logic ---
        copyButton.addEventListener('click', () => {
            if (copyButton.disabled) return;
            
            // Create a temporary textarea element to hold the text
            const textArea = document.createElement("textarea");
            textArea.value = morseCodeDisplay.textContent;
            textArea.style.position = "fixed"; // Prevent scrolling to bottom of page
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.opacity = "0"; // Make it invisible
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }

            document.body.removeChild(textArea);

            // Provide user feedback
            copyButton.textContent = success ? 'Copied!' : 'Error!';
            copyButton.disabled = true;

            setTimeout(() => {
                copyButton.textContent = 'Copy';
                if (!isPlaying) {
                    copyButton.disabled = false;
                }
            }, 2000);
        });

