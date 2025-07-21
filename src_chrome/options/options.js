const tokenStatusText = {
    0: "Token is not set",
    1: "Saved token is invalid",
    2: "Rate limit reached",
    99: "Saved token is valid"
};

// Check token status
chrome.storage.local.get('tokenStatus').then((data) => {
    const tokenStatus = data.tokenStatus ?? 0;
    if (tokenStatus !== 99) {
        showMessage(1, tokenStatusText[tokenStatus], 0);
    }
});

// Save token to storage
document.getElementById("save-token").addEventListener("click", () => {
    const token = document.getElementById("token").value;
    if (token) {
        chrome.storage.local.set({ token, tokenStatus: 99, rateLimitRemaining: 5000 }, () => {
            showMessage(0, "Token saved successfully.", 0);
        });
    } else {
        showMessage(1, "Please enter a valid token.");
    }
});

document.getElementById("get-token").addEventListener("click", () => {
    // open new tab to github token page
    chrome.tabs.create({
        url: "https://github.com/settings/tokens/new?description=TickBack&scopes=repo&default_expires_at=none"
    });
});

// Show message function
function showMessage(type, message, duration = 3000) {
    if (!message) return;
    const messageElement = document.getElementById("message");
    const oldMessage = duration ? messageElement.textContent : "";
    const oldClass = duration ? messageElement.className : "";
    messageElement.textContent = message;
    messageElement.className = type === 0 ? "success" : "error";
    if (duration && duration > 0) {
        setTimeout(() => {
            messageElement.textContent = oldMessage;
            messageElement.className = oldClass;
        }, duration);
    }
}

// Customization options

document.getElementById("incomplete-icon-checkbox").addEventListener("change", function() {
    const isChecked = this.checked;
    chrome.storage.local.set({ incompleteIcon: isChecked });
});

document.getElementById("completed-icon-checkbox").addEventListener("change", function() {
    const isChecked = this.checked;
    chrome.storage.local.set({ completedIcon: isChecked });
});

document.getElementById("reset-customization").addEventListener("click", () => {
    chrome.storage.local.set({
        incompleteIcon: true,
        completedIcon: true
    }).then(() => {
        document.getElementById("incomplete-icon-checkbox").checked = true;
        document.getElementById("completed-icon-checkbox").checked = true;
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Load customization options
    chrome.storage.local.get(["incompleteIcon", "completedIcon"]).then((data) => {
        document.getElementById("incomplete-icon-checkbox").checked = data.incompleteIcon !== undefined ? data.incompleteIcon : true;
        document.getElementById("completed-icon-checkbox").checked = data.completedIcon !== undefined ? data.completedIcon : true;
    });
});