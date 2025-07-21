const tokenStatusText = {
    0: "GitHub token is NOT set",
    1: "GitHub token is invalid",
    2: "Rate limit reached",
    99: "Token is valid"
};

// observe the progress bar for changes
const progressBar = document.getElementById('rateLimit');
const observer = new MutationObserver(() => {
    const value = parseInt(progressBar.value, 10);
    setProgressBarColor(value);
});
observer.observe(progressBar, { attributes: true });

// Check value of rateLimit than set the color of the progress bar
function setProgressBarColor(value) {
    let style = document.getElementById('progressBarStyle');
    if (!style) {
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
    chrome.storage.local.get(['rateLimitRemaining', 'rateLimitReset', 'tokenStatus']).then((data) => {
        const resetDiv = document.getElementById('rateLimitResetDiv');
        const infoDiv = document.getElementById('infoDiv');
        const tokenStatus = data.tokenStatus ?? 0;
        let rateLimitRemaining = data.rateLimitRemaining;
        const rateLimitReset = data.rateLimitReset;

        if (tokenStatus !== 99) {
            resetDiv.style.color = 'transparent';
            progressBar.value = 0;
            document.getElementById('rateLimitValue').textContent = '0%';
            infoDiv.innerHTML = `<p>${tokenStatusText[tokenStatus]}</p>`;
            infoDiv.style.display = 'block';
            return;
        }

        if (rateLimitRemaining === undefined) {
            rateLimitRemaining = 5000; // Default value if not set
            chrome.storage.local.set({ rateLimitRemaining: 5000 });
            resetDiv.style.color = 'transparent';
        }

        const percentageSpan = document.getElementById('rateLimitValue');
        const limitRemaining = Math.round((rateLimitRemaining / 5000) * 100);
        progressBar.value = rateLimitRemaining;
        percentageSpan.textContent = `${limitRemaining}%`;

        if (rateLimitReset !== undefined && rateLimitRemaining !== undefined) {
            const resetSpan = document.getElementById('rateLimitReset');
            const resetTime = new Date(rateLimitReset * 1000);
            const now = new Date();
            if (resetTime < now) {
                resetDiv.style.color = 'transparent';
                chrome.storage.local.set({ rateLimitRemaining: 5000, rateLimitReset: undefined });
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
}, 5000); // 5 s