(() => {
  const storageKey = "yueshang-theme";
  const modes = ["auto", "light", "dark"];
  const modeNames = { auto: "自动（跟随系统）", light: "浅色", dark: "深色" };
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let selectedMode = "auto";

  try {
    const storedMode = localStorage.getItem(storageKey);
    if (storedMode === "light" || storedMode === "dark") selectedMode = storedMode;
  } catch {
    // Storage may be unavailable in privacy-focused browser modes.
  }

  function systemTheme() {
    return media.matches ? "dark" : "light";
  }

  function nextMode(mode) {
    return modes[(modes.indexOf(mode) + 1) % modes.length];
  }

  function updateButton(button) {
    if (!button) return;
    const next = nextMode(selectedMode);
    const label = `显示模式：${modeNames[selectedMode]}；切换到${modeNames[next]}模式`;
    button.dataset.themeMode = selectedMode;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function applyMode(mode, persist = false, button = null) {
    selectedMode = mode;
    const theme = mode === "auto" ? systemTheme() : mode;
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.style.colorScheme = theme;
    if (themeColor) themeColor.content = theme === "dark" ? "#0b1020" : "#172b78";

    if (persist) {
      try {
        if (mode === "auto") localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, mode);
      } catch {
        // The visual switch still works when storage is unavailable.
      }
    }

    updateButton(button);
  }

  root.classList.add("js");
  applyMode(selectedMode);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;

    updateButton(button);
    button.addEventListener("click", () => {
      applyMode(nextMode(selectedMode), true, button);
    });
  });

  media.addEventListener("change", () => {
    if (selectedMode === "auto") applyMode("auto");
  });
})();
