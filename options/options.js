// Save token to storage
document.getElementById("save-token").addEventListener("click", function() {
    const token = document.getElementById("token").value;
    if (token) {
        browser.storage.local.set({ token: token }, function() {
            showMessage(0, "Token saved successfully.");
        });
    } else {
        showMessage(1, "Please enter a valid token.");
    }
});

document.getElementById("get-token").addEventListener("click", function() {
    // open new tab to github token page
    browser.tabs.create({
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