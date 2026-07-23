// Runs in YouTube's page world, where the player response (and its signed
// caption-track URLs) is available. It intentionally returns only metadata;
// the content script fetches the selected transcript itself.
(() => {
  const SOURCE = "shadowing-plus-caption-bridge";
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== SOURCE || event.data?.type !== "request") return;
    const nonce = event.data.nonce;
    try {
      const player = document.getElementById("movie_player");
      const response = player?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
      const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      window.postMessage({ source: SOURCE, type: "response", nonce, tracks: tracks.map((track) => ({ baseUrl: track.baseUrl, languageCode: track.languageCode, kind: track.kind })) }, location.origin);
    } catch {
      window.postMessage({ source: SOURCE, type: "response", nonce, tracks: [] }, location.origin);
    }
  });
})();
