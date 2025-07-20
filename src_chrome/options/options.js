// Save token to storage
document.getElementById("save-token").addEventListener("click", () => {
    const token = document.getElementById("token").value;
    if (token) {
        chrome.storage.local.set({ token, wrongToken: false, rateLimitRemaining: 5000 }, () => {
            showMessage(0, "Token saved successfully.");
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
function showMessage(type, message) {
    const messageElement = document.getElementById("message");
    messageElement.textContent = message;
    messageElement.className = type === 0 ? "success" : "error";
    setTimeout(() => {
        messageElement.textContent = "";
        messageElement.className = "";
    }, 3000);
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