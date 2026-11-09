import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";

/**
 * Open external links in the user's default browser.
 *
 * The webview cannot open <a target="_blank"> links by itself: on Linux,
 * Wails does not handle WebKitGTK's "create" signal (new window request), so
 * the click is silently dropped; on Windows, WebView2 opens its own popup
 * window instead of the user's browser. Clicks on http(s) links pointing
 * outside the app are therefore intercepted and sent to Wails'
 * BrowserOpenURL (xdg-open on Linux).
 *
 * Only http and https URLs are forwarded, so a link can never make the system
 * open a local file or another URL scheme.
 */
export function initExternalLinks(): void {
    document.addEventListener("click", (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0) return;

        const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!link) return;

        let url: URL;
        try {
            url = new URL(link.href, window.location.href);
        } catch {
            return;
        }

        const isExternal = (url.protocol === "http:" || url.protocol === "https:")
            && url.origin !== window.location.origin;
        if (!isExternal) return;

        event.preventDefault();
        BrowserOpenURL(url.href);
    });
}
