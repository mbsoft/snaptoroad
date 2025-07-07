chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getUserInfo") {
    chrome.identity.getProfileUserInfo((userInfo) => {
      if (userInfo && userInfo.email) {
        sendResponse({ email: userInfo.email });
      } else {
        sendResponse({ email: null });
      }
    });
    return true; // Keep the message channel open for asynchronous response
  }
});