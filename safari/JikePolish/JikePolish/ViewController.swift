import Cocoa
import SafariServices
import WebKit
import OSLog

private let extensionBundleIdentifier = "com.bowugit.jikepolish.Extension"
private let websiteURL = URL(
    string: "https://jikepolish.com/?utm_source=macos_about&utm_medium=product&utm_campaign=website_link"
)!

final class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet private var webView: WKWebView!
    private let logger = Logger(subsystem: "com.bowugit.jikepolish", category: "Container")
    private let statusLabel = NSTextField(wrappingLabelWithString: "正在载入应用首页…")
    private let statusView = NSStackView()
    private var recoveryAttempts = 0

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")
        configureStatusView()
        loadHomePage()
    }

    private func configureStatusView() {
        let title = NSTextField(labelWithString: "阅赏")
        title.font = .boldSystemFont(ofSize: 24)
        statusLabel.alignment = .center
        statusView.orientation = .vertical
        statusView.alignment = .centerX
        statusView.spacing = 18
        statusView.addArrangedSubview(title)
        statusView.addArrangedSubview(statusLabel)
        statusView.addArrangedSubview(NSButton(title: "重新载入", target: self, action: #selector(retryLoading)))
        statusView.addArrangedSubview(NSButton(
            title: "打开 Safari 扩展设置…", target: self, action: #selector(openPreferences)
        ))
        statusView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusView)
        NSLayoutConstraint.activate([
            statusView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statusView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            statusView.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -48),
        ])
    }

    @objc private func retryLoading() {
        recoveryAttempts = 0
        loadHomePage()
    }

    private func showStatus(_ message: String) {
        statusLabel.stringValue = message
        statusView.isHidden = false
        webView.isHidden = true
    }

    private func loadHomePage() {
        showStatus("正在载入应用首页…")

        guard
            let pageURL = Bundle.main.url(forResource: "Main", withExtension: "html"),
            let resourceURL = Bundle.main.resourceURL
        else {
            logger.error("Bundled home page or resource directory is missing")
            showStatus("应用资源不完整，请重新安装阅赏。")
            return
        }
        webView.loadFileURL(pageURL, allowingReadAccessTo: resourceURL)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.isHidden = false
        statusView.isHidden = true
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, _ in
            let enabled = state.map { String($0.isEnabled) } ?? "null"
            DispatchQueue.main.async {
                webView.evaluateJavaScript("show(\(enabled))")
            }
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleLoadFailure(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleLoadFailure(error)
    }

    private func handleLoadFailure(_ error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled else { return }
        logger.error("Home page load failed: \(error.localizedDescription, privacy: .public)")
        showStatus("未能打开应用首页，请重新载入。")
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        logger.error("Home page web content process terminated")
        guard recoveryAttempts == 0 else {
            showStatus("应用首页暂时无法显示，请重新载入。")
            return
        }
        recoveryAttempts += 1
        loadHomePage()
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
        openPreferences()
    }

    @objc private func openPreferences() {
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
