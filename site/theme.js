(() => {
  const storageKey = "yueshang-theme";
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let selectedTheme = null;

  try {
    const storedTheme = localStorage.getItem(storageKey);
    if (storedTheme === "light" || storedTheme === "dark") selectedTheme = storedTheme;
  } catch {
    // Storage may be unavailable in privacy-focused browser modes.
  }

  function systemTheme() {
    return media.matches ? "dark" : "light";
  }

  function updateButton(button, theme) {
    if (!button) return;
    const isDark = theme === "dark";
    const label = isDark ? "切换到浅色模式" : "切换到深色模式";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("title", label);
  }

  function applyTheme(theme, persist = false, button = null) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (themeColor) themeColor.content = theme === "dark" ? "#0b1020" : "#172b78";

    if (persist) {
      selectedTheme = theme;
      try {
        localStorage.setItem(storageKey, theme);
      } catch {
        // The visual switch still works when storage is unavailable.
      }
    }

    updateButton(button, theme);
  }

  root.classList.add("js");
  applyTheme(selectedTheme ?? systemTheme());

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;

    updateButton(button, root.dataset.theme);
    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true, button);
    });
  });

  media.addEventListener("change", () => {
    if (selectedTheme === null) applyTheme(systemTheme());
  });
})();
