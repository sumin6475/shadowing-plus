const DEFAULT_APP_URL = "http://localhost:3000";

async function config() {
  const stored = await chrome.storage.local.get(["appUrl", "accessToken", "refreshToken", "accountEmail"]);
  return {
    appUrl: (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, ""),
    accessToken: stored.accessToken || null,
    refreshToken: stored.refreshToken || null,
    accountEmail: stored.accountEmail || null,
  };
}

async function refreshAccessToken(appUrl, refreshToken) {
  if (!refreshToken) throw new Error("Connect your Shadowing Plus account.");
  const response = await fetch(`${appUrl}/api/extension/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.accessToken || !json.refreshToken) {
    await chrome.storage.local.remove(["accessToken", "refreshToken", "accountEmail"]);
    throw new Error(json.error || "Connect your Shadowing Plus account.");
  }
  await chrome.storage.local.set({ accessToken: json.accessToken, refreshToken: json.refreshToken, accountEmail: json.email || null });
  return json.accessToken;
}

async function api(path, body, method = "POST", retried = false) {
  const { appUrl, accessToken, refreshToken } = await config();
  if (!accessToken) throw new Error("Shadowing Plus 계정을 연결해 주세요.");
  const response = await fetch(`${appUrl}${path}`, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), authorization: `Bearer ${accessToken}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (response.status === 401 && !retried) {
    const renewedToken = await refreshAccessToken(appUrl, refreshToken);
    // `api` reads the freshly persisted token on retry. Keeping this explicit
    // also makes the single-retry rule obvious for future API callers.
    if (renewedToken) return api(path, body, method, true);
  }
  if (!response.ok) throw new Error(json.error || "Shadowing Plus 요청에 실패했습니다.");
  return json;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "sp:toggle" }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "sp:connect") {
    (async () => {
      try {
        const appUrl = String(message.appUrl || DEFAULT_APP_URL).replace(/\/$/, "");
        const callback = chrome.identity.getRedirectURL("shadowing-plus");
        // Chrome intercepts its chromiumapp.org redirect instead of trying to
        // navigate a normal tab to a blocked chrome-extension:// URL.
        const completedUrl = await chrome.identity.launchWebAuthFlow({
          url: `${appUrl}/api/extension/session?return_to=${encodeURIComponent(callback)}`,
          interactive: true,
        });
        const params = completedUrl ? new URLSearchParams(new URL(completedUrl).hash.slice(1)) : null;
        const token = params?.get("access_token");
        const refreshToken = params?.get("refresh_token");
        if (!token || !refreshToken) throw new Error("연결 토큰을 받지 못했습니다.");
        await chrome.storage.local.set({ appUrl, accessToken: token, refreshToken, accountEmail: params?.get("email") || null });
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "계정 연결에 실패했습니다." });
      }
    })();
    return true;
  }
  if (message.type === "sp:translation") {
    api("/api/extension/translate", { text: message.text })
      .then((result) => sendResponse({ ok: true, translation: result.translation }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:dictionary") {
    api(`/api/extension/dictionary?word=${encodeURIComponent(message.word || "")}`, null, "GET")
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:save-phrase") {
    api("/api/extension/phrases", message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:phrases") {
    api("/api/extension/phrases", null, "GET")
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:prepare") {
    api("/api/extension/prepare", { url: message.url, targetLang: "Korean", captionBody: message.captionBody || null })
      .then((result) => {
        if (!result.cached && result.jobId) api(`/api/extension/jobs/${result.jobId}`, {}).catch(() => {});
        sendResponse({ ok: true, ...result });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:job") {
    api(`/api/extension/jobs/${encodeURIComponent(message.jobId)}`, null, "GET")
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:load-prepared") {
    api(`/api/extension/videos/${encodeURIComponent(message.youtubeId)}`, null, "GET")
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:save") {
    api("/api/extension/bookmarks", message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "sp:open-options") {
    chrome.runtime.openOptionsPage();
  }
  if (message.type === "sp:connection") {
    config().then(({ accountEmail, accessToken }) => sendResponse({ connected: !!accessToken, email: accountEmail }));
    return true;
  }
  if (message.type === "sp:open-app") {
    config().then(({ appUrl }) => chrome.tabs.create({ url: `${appUrl}/app` }));
  }
  if (message.type === "sp:open-phrases") {
    config().then(({ appUrl }) => chrome.tabs.create({ url: `${appUrl}/phrases` }));
  }
});
