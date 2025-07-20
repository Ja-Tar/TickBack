// Background script

chrome.runtime.onInstalled.addListener(() => {
    console.info("TickBack extension installed");
    chrome.storage.local.get('tokenStatus').then((result) => {
        if (result.tokenStatus !== 0) { // token is not valid
            chrome.runtime.openOptionsPage();
        }
    });
});