// Background script

browser.runtime.onInstalled.addListener(() => {
    console.info("TickBack extension installed");
    browser.storage.local.get('tokenStatus').then((result) => {
        if (result.tokenStatus !== 0) { // token is (not) valid
            browser.runtime.openOptionsPage();
        }
    });
});