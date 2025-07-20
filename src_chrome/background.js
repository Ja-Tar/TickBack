// Background script

chrome.runtime.onInstalled.addListener(() => {
    console.info("TickBack extension installed");
    chrome.storage.local.get('token').then((result) => {
        if (!result.token) {
            chrome.runtime.openOptionsPage();
        }
    });
});