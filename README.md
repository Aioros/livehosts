# LiveHosts

LiveHosts is a Chrome extension that aims at providing a working (even if sub-obtimal) solution to a common nuisance that many web developers have to deal with every day. If you have multiple versions of your websites sharing the same host names on multiple environments, you often need to switch the assignments in your OS hosts file.

Other extensions (like the life-saving [HostAdmin](https://chrome.google.com/webstore/detail/hostadmin-app/mfoaclfeiefiehgaojbmncmefhdnikeg)) can help with the cumbersomeness, but changes to the hosts file usually take an inconvenient amount of time to actually affect the browser.

Unfortunately, there is no way to make Chrome direct requests for a hostname to a specific IP without a standard redirect - you could [set up a smart HTTP proxy](https://superuser.com/a/343632), but it's often not possible or not convenient.

This extension settles for a sub-obtimal approach: requests to the indicated hostnames are redirected to the chosen IPs with an additional `Host` header. The browser's address bar reflects this behaviour showing the hostname right after the IP (e.g. `http://127.0.0.1/www.example.com/`). The extension also tries to take care of all requests to either the IP or the hostname in a consistent way.

You can directly install the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/livehosts/nofghomgbilhbjilibckkephmkbkcfen).

## Issues

After the redirect, the user is effectively in a different domain that the one they expected. They may notice some functional differences:

 * depending on the server, parts of a web page referring to the site URL (like `href` and `src` attributes) could be different from the original
 * `window.location` has a different value that can potentially throw off JavaScript snippets
 * **most Cross-Origin request won't work**

## License

LiveHosts is released under the [GPLv3](https://www.gnu.org/licenses/gpl.txt) license.