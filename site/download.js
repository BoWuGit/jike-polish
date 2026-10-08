(() => {
  const download = document.querySelector(".hero-download");
  if (!download) return;

  const picker = download.querySelector(".browser-picker");
  const summary = picker.querySelector("summary");
  const label = picker.querySelector("[data-browser-picker-label]");
  const recommended = download.querySelector("[data-browser-recommended]");
  const ua = navigator.userAgent || "";
  const hints = navigator.userAgentData;
  // iPadOS can use a macOS UA, but this extension's Safari app is macOS-only.
  const mobile = hints?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  function detectBrowser() {
    if (mobile) return null;
    const brands = hints?.brands || [];
    // Edge's UA also contains Chrome and Safari; check its own brand first.
    if (brands.some(({ brand }) => brand === "Microsoft Edge") || /Edg\//.test(ua)) return "edge";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/OPR\/|Opera|Vivaldi|YaBrowser|SamsungBrowser/.test(ua)) return null;
    if (brands.some(({ brand }) => brand === "Google Chrome") || /Chrome\//.test(ua)) return "chrome";
    if (/Macintosh/.test(ua) && /Version\/.+Safari\//.test(ua)) return "safari";
    return null;
  }

  const browser = detectBrowser();
  const card = browser && picker.querySelector(`[data-browser="${browser}"]`);
  if (!card) {
    if (mobile) {
      label.textContent = "选择桌面浏览器";
      download.querySelector("[data-download-note]").hidden = false;
    }
    return;
  }

  const primary = card.cloneNode(true);
  primary.classList.add("browser-card-primary");
  const name = primary.querySelector("strong");
  name.textContent = `添加到 ${name.textContent}`;
  recommended.append(primary);
  recommended.hidden = false;
  card.hidden = true;
  label.textContent = "其他浏览器";
  picker.open = false;
  download.dataset.browser = browser;

  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && picker.open) {
      const focusInside = picker.contains(document.activeElement);
      picker.open = false;
      if (focusInside) summary.focus();
    }
  });
  picker.addEventListener("focusout", (event) => {
    if (!picker.contains(event.relatedTarget)) picker.open = false;
  });
})();
