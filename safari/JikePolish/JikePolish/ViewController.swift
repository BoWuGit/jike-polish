import Cocoa
import SafariServices
import WebKit

private let extensionBundleIdentifier = "com.bowugit.jikepolish.Extension"
private let websiteURL = URL(
    string: "https://jikepolish.com/?utm_source=macos_about&utm_medium=product&utm_campaign=website_link"
)!

final class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")

        guard
            let pageURL = Bundle.main.url(forResource: "Main", withExtension: "html"),
            let resourceURL = Bundle.main.resourceURL
        else {
            return
        }
        webView.loadFileURL(pageURL, allowingReadAccessTo: resourceURL)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, _ in
            let enabled = state.map { String($0.isEnabled) } ?? "null"
            DispatchQueue.main.async {
                webView.evaluateJavaScript("show(\(enabled))")
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let action = message.body as? String else {
            return
        }
        if action == "open-website" {
            NSWorkspace.shared.open(websiteURL)
            return
        }
        guard action == "open-preferences" else {
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                if let error {
                    let alert = NSAlert()
                    alert.alertStyle = .warning
                    alert.messageText = "无法打开 Safari 扩展设置"
                    alert.informativeText = error.localizedDescription
                    if let window = self.view.window {
                        alert.beginSheetModal(for: window)
                    } else {
                        alert.runModal()
                    }
                    return
                }
                NSApplication.shared.terminate(nil)
            }
        }
    }
}
