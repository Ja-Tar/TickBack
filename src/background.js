// Background script

browser.runtime.onInstalled.addListener(() => {
    if (browser.storage.local.get('installed')) {
        console.info("TickBack extension installed");
        browser.storage.local.get('tokenStatus').then((result) => {
            if (result.tokenStatus === 0) { // 0 -> token not set
                browser.runtime.openOptionsPage();
            }
        browser.storage.local.set({ installed: true });
        });
    }
});