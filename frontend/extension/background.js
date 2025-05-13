// frontend/extension/background.js

console.log("Background worker started");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background received message:", msg);

  fetch("http://localhost:8000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: msg.url })
  })
    .then(res => {
      console.log("Background: fetch status", res.status);
      return res.json();
    })
    .then(data => {
      console.log("Background: analyze data", data);
      sendResponse({ success: true, data });
    })
    .catch(err => {
      console.error("Background: fetch error", err);
      sendResponse({ success: false, error: err.message });
    });

  return true;
});
