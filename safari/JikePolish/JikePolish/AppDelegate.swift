//
//  AppDelegate.swift
//  JikePolish
//
//  Created by Bo Wu on 2026/7/24.
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    private let websiteURL = URL(
        string: "https://jikepolish.com/?utm_source=macos_about&utm_medium=product&utm_campaign=website_link"
    )!

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Override point for customization after application launch.
    }

    @IBAction func showAboutPanel(_ sender: Any?) {
        let website = NSMutableAttributedString(string: "jikepolish.com ↗")
        website.addAttributes(
            [
                .link: websiteURL,
                .foregroundColor: NSColor.linkColor,
            ],
            range: NSRange(location: 0, length: website.length)
        )
        NSApp.orderFrontStandardAboutPanel(options: [.credits: website])
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

}
