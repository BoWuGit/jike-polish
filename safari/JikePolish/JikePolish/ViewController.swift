import Cocoa
import SafariServices
import WebKit

private let extensionBundleIdentifier = "com.bowugit.jikepolish.Extension"

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
        guard message.body as? String == "open-preferences" else {
            return
        }

        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { _ in
            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }
}
