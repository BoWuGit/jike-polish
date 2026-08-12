import { log } from "./shared/debug.js";
import { installLayoutEnhancements, scheduleLayoutSync } from "./content/layout.js";
import { installLightboxZoom } from "./content/lightbox.js";
import { installProfileCards } from "./content/profile-card.js";
import { injectPageBridge, injectUserStyle } from "./content/runtime.js";
import { installScrollEnhancements } from "./content/scroll.js";
import { installContentStyles } from "./content/styles.js";

function boot() {
  installContentStyles();
  injectPageBridge();
  setTimeout(() => injectPageBridge({ force: true }), 1800);
  installLayoutEnhancements();
  void injectUserStyle().then(scheduleLayoutSync);
  installLightboxZoom();
  installScrollEnhancements();
  installProfileCards();
  log("ready");
}

boot();
