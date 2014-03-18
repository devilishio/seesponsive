Seesponsive
===========

Seesponsive is a simple Google Chrome extension that allows you to see how a website's layout and design adjust responsively as the available screen width changes. It also lets you see the media queries that are being progressively matched or unmatched, driving these changes.

This is a pretty simple Chrome extension but it does illustrate a number of techniques that you might find useful when writing your own extension. These include:

- Programmatically injecting extension content scripts into a page, including injecting it into child frames on the page.
- Programmatically injecting CSS into a page.
- Sending a message from a content script to the extension's event or background script and vice versa.
- Using the ``chrome.webRequest`` API to be alerted when content has loaded.
- Injecting multiple content script in sequence (e.g. injecting JQuery as a dependency of the main script).

The extension also demonstrates some useful techniques for accessing stylesheet information such as:

- How to iterate over the list of stylesheets in a document.
- How to identify media query rules in a stylesheet.
- How to identify and handle imported stylesheets.
- How to identify and handle cross-domain stylesheets or stylesheets local to the page.
- How to detect when a media query is matched or unmatched.

_Note:_ Special thanks to Tyler Gaw whose article on [detecting media query changes](http://tylergaw.com/articles/reacting-to-media-queries-in-javascript) was very helpful.

Using It
--------

Install the extension from the [Chrome store](https://chrome.google.com/webstore/detail/seesponsive/pplnkpfppfjanjgpbdfkbeeafjplcegi)

To use the extension, just browse to a website that uses media queries. Then click the extension's action button in the toolbar. After a few seconds a black action bar will appear at the top of the page with two buttons - Shrink and Grow.

Clicking these will shrink and grow the width of the website to simulate the device width changing. As this occurs the action bar will indicate which media queries are being matched/unmatched at a particular width.

To see some examples of sites that use media queries to adapt responsively visit [Media Queries](http://mediaqueri.es/).

How It Works
------------

When you click the extension's action button it injects a content script into the page that replaces the current page content with the action bar and an iFrame containing the site you were on. It also injects a content script into this iFrame that listens for media query changes using the ``window.matchMedia`` event listener API.

The extension's event script is used to extract the list of media queries for the site. It does this by loading the stylesheets into the event page and then accessing their contents via the DOM.

This is required because some websites load cross-domain stylesheets (e.g. from a content distribution network). The content script cannot access styles provided by those stylesheets since it has the same cross-domain access restrictions as other scripts running in the page. Scripts on the background event page can however access those styles because it has cross-domain privileges granted to it in the extension's manifest.

That's the basics of it but the implementation is a little trickier. The code is well commented so dive in and take a look if you're interested.

Developing/Testing
------------------

If you just want to try out the extension you can install it from the Chrome Store as detailed above.

Alternatively, you can clone the Github repository and load the exploded extension source folder in developer mode. To enable this:

1. Check the ``Developer mode`` checkbox at the top of the Extensions page.
2. Click the ``Load unpacked extension...`` button and choose the project's ``src`` folder from the file dialog.

If you make changes to the extension source code you can reload the extension from the Extensions page by clicking the ``Reload`` link beneath its description.

Building/Packaging
------------------

If you want to package the code up as a CRX file for installation, see [Google's Packaging Guide](http://developer.chrome.com/extensions/packaging).


Known Issues
------------

Intermittently when you click the action button the required setup for the page will fail to complete. This happens reasonably infrequently but enough to be annoying. There's a timeout that will trigger an error message if the setup does not complete successfully within 12 seconds. If this happens, refreshing the page and triggering the extension again normally fixes it.

Technically there are two variants of the problem:

1. The inner content script for the iFrame fails to be injected
2. The message from the event script passing the list of media queries back to the content script fails to be received.

I suspect that both of these are due to some sort of timing issue or race condition. It seems to happen more on sites that load slowly or whose content is not cached.

Contributing
------------
Pull requests are welcome!
