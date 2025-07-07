document.getElementById("addMetadataBtn").addEventListener("click", async () => {
    console.log('Button clicked, sending message...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(
        tab.id,
        { action: "modifyJSON" },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError.message);
            } else if (response) {
                console.log('Response from content script:', response);
            } else {
                console.error('No response from content script.');
            }
        }
    );
});