// observe the progress bar for changes
const progressBar = document.getElementById('lastRateLimit');
const observer = new MutationObserver(() => {
    const value = parseInt(progressBar.value, 10);
    setProgressBarColor(value);
});
observer.observe(progressBar, { attributes: true });

// Check value of lastRateLimit than set the color of the progress bar
function setProgressBarColor(value) {
    const findStyle = document.getElementById('progressBarStyle');
    let style;
    if (findStyle) {
        style = findStyle;
    } else {
        style = document.createElement('style');
        style.id = 'progressBarStyle';
        document.head.appendChild(style);
    }

    if (value >= 70) {
        style.innerHTML = `progress::-webkit-progress-value {background-color: #4caf50 !important;}
                progress::-moz-progress-bar {background-color: #4caf50 !important;}
                progress {color: #4caf50; }`;
    } else if (value >= 30) {
        style.innerHTML = `progress::-webkit-progress-value {background-color: #ff9800 !important;}
                progress::-moz-progress-bar {background-color: #ff9800 !important;}
                progress {color: #ff9800; }`;
    } else {
        style.innerHTML = `progress::-webkit-progress-value {background-color: #f44336 !important;}
                progress::-moz-progress-bar {background-color: #f44336 !important;}
                progress {color: #f44336; }`;
    }
}

function updateProgressBar() {
    browser.storage.local.get(['lastRateLimitRemaining', 'lastRateLimitReset', 'token']).then((data) => {
        const resetDiv = document.getElementById('lastRateLimitResetDiv');
        const infoDiv = document.getElementById('infoDiv');
        const token = data.token;
        if (!token) {
            resetDiv.style.color = 'transparent';
            progressBar.value = 0;
            document.getElementById('lastRateLimitValue').textContent = '0%';
            infoDiv.innerHTML = '<p>GitHub token NOT set</p>';
            infoDiv.style.display = 'block';
            
            return;
        }

        if (data.lastRateLimitRemaining === undefined) {
            data.lastRateLimitRemaining = 5000; // Default value if not set
            browser.storage.local.set({ lastRateLimitRemaining: 5000 });
            resetDiv.style.color = 'transparent';
        }

        const percentageSpan = document.getElementById('lastRateLimitValue');
        const limitRemaining = Math.round((data.lastRateLimitRemaining / 5000) * 100);
        progressBar.value = limitRemaining;
        percentageSpan.textContent = `${limitRemaining}%`;
        
        if (data.lastRateLimitReset !== undefined && data.lastRateLimitRemaining !== undefined) {
            const resetSpan = document.getElementById('lastRateLimitReset');
            const resetTime = new Date(data.lastRateLimitReset * 1000);
            const now = new Date();
            if (resetTime < now) {
                resetDiv.style.color = 'transparent';
                browser.storage.local.set({ lastRateLimitRemaining: 100 });
            } else {
                resetSpan.innerText = resetTime.toLocaleString();
                resetDiv.style.color = 'inherit';
            }
        }
    });
}

updateProgressBar();
setInterval(() => {
    updateProgressBar();
}, 1000); // 1 s