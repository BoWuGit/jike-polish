import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const officialWebsite = "https://jikepolish.com/";
const extensionWebsite = `${officialWebsite}?utm_source=extension_popup&utm_medium=product&utm_campaign=website_link`;
const macWebsite = `${officialWebsite}?utm_source=macos_about&utm_medium=product&utm_campaign=website_link`;

test("browser extensions expose the official website as their About destination", async () => {
  const [manifestSource, launcher] = await Promise.all([
    source("manifest.json"),
    source("edge/demo/launcher.html"),
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.homepage_url, officialWebsite);
  assert.ok(launcher.indexOf('class="about-footer"') > launcher.indexOf('class="hint"'));
  assert.ok(launcher.includes(extensionWebsite.replaceAll("&", "&amp;")));
  assert.match(launcher, /target="_blank" rel="noopener noreferrer"/);
});

test("the macOS container links to the website from its home and About views", async () => {
  const [mainHtml, script, viewController, appDelegate, storyboard] = await Promise.all([
    source("safari/JikePolish/JikePolish/Resources/Base.lproj/Main.html"),
    source("safari/JikePolish/JikePolish/Resources/Script.js"),
    source("safari/JikePolish/JikePolish/ViewController.swift"),
    source("safari/JikePolish/JikePolish/AppDelegate.swift"),
    source("safari/JikePolish/JikePolish/Base.lproj/Main.storyboard"),
  ]);

  assert.match(mainHtml, /class="open-website about-link"/);
  assert.ok(script.includes('postMessage("open-website")'));
  assert.ok(viewController.includes(macWebsite));
  assert.ok(appDelegate.includes(macWebsite));
  assert.ok(appDelegate.includes("orderFrontStandardAboutPanel"));
  assert.ok(storyboard.includes('selector="showAboutPanel:"'));
});

test("the website navigation reaches the author Jike and X accounts", async () => {
  const homepage = await source("site/index.html");

  assert.match(homepage, /<a class="nav-contact" href="#contact">联系<\/a>/);
  assert.match(homepage, /<footer id="contact">/);
  assert.ok(homepage.includes("https://m.okjike.com/users/0e9b4dba-9e57-45f5-91b8-8ce80b0cce84"));
  assert.ok(homepage.includes("https://x.com/xawubo/"));
  assert.equal((homepage.match(/rel="me noopener noreferrer"/g) ?? []).length, 2);
});
