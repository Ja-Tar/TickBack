// Background script

browser.runtime.onInstalled.addListener(() => {
    console.info("TickBack extension installed");
    browser.storage.local.get('token').then((result) => {
        if (!result.token) {
            browser.runtime.openOptionsPage();
        }
    });
});