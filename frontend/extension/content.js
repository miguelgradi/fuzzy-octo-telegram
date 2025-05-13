console.log("Content script loaded on", window.location.href);

const btn = document.createElement("button");
btn.textContent = "Analyze Reviews";
btn.style.position = "fixed";
btn.style.top = "10px";
btn.style.right = "10px";
btn.style.zIndex = 1000;
document.body.appendChild(btn);

btn.addEventListener("click", () => {
  const url = window.location.href;
  console.log("Content → background:", msg);
  chrome.runtime.sendMessage(
    { type: "ANALYZE_REVIEWS", url },
    (response) => {
      if (response.success) {
        window.postMessage({ type: "REVIEWS_DATA", payload: response.data });
      } else {
        console.error("Analysis error:", response.error);
      }
    }
  );
});
