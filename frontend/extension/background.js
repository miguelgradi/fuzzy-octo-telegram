chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  fetch("http://localhost:8000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: msg.url })
  })
    .then(res => {
      return res.json();
    })
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });
  return true;
});
