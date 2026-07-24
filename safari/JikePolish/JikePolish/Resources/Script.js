function show(enabled) {
    document.body.classList.toggle("state-on", enabled === true);
    document.body.classList.toggle("state-off", enabled === false);
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
