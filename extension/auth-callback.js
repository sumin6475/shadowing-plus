const token = new URLSearchParams(location.hash.slice(1)).get("access_token");
if (token) {
  chrome.runtime.sendMessage({ type: "sp:auth-callback", accessToken: token }, () => window.close());
} else {
  document.body.textContent = "연결 토큰을 받지 못했습니다. 다시 시도해 주세요.";
}
