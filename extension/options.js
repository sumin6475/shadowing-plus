const input = document.querySelector("#app-url");
const status = document.querySelector("#status");
chrome.storage.local.get(["appUrl", "accessToken", "accountEmail"]).then(({ appUrl, accessToken, accountEmail }) => {
  input.value = appUrl || "http://localhost:3000";
  status.textContent = accessToken ? `Connected as ${accountEmail || "your account"}.` : "No account connected.";
});
document.querySelector("#save").addEventListener("click", async () => {
  const appUrl = input.value.trim().replace(/\/$/, "");
  try { new URL(appUrl); } catch { status.textContent = "올바른 앱 주소를 입력해 주세요."; return; }
  await chrome.storage.local.set({ appUrl }); status.textContent = "저장했습니다.";
});
document.querySelector("#connect").addEventListener("click", async () => {
  const appUrl = input.value.trim().replace(/\/$/, "");
  try { new URL(appUrl); } catch { status.textContent = "먼저 올바른 앱 주소를 저장해 주세요."; return; }
  await chrome.storage.local.set({ appUrl });
  status.textContent = "로그인 창에서 계정 연결을 완료해 주세요…";
  chrome.runtime.sendMessage({ type: "sp:connect", appUrl }, (result) => {
    if (chrome.runtime.lastError) { status.textContent = chrome.runtime.lastError.message; return; }
    status.textContent = result?.ok ? "Account connected. You can close this page." : (result?.error || "계정 연결에 실패했습니다.");
  });
});
