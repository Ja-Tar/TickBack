// Background script

browser.runtime.onInstalled.addListener(function() {
    return // REMOVE
    console.log("TickBack extension installed");
    browser.runtime.openOptionsPage();
});