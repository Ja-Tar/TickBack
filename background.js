// Background script

browser.runtime.onInstalled.addListener(function() {
    console.log("TickBack extension installed");
    browser.storage.local.get('token').then((result) => {
        if (!result.token) {
            browser.runtime.openOptionsPage();
        }
    });
});