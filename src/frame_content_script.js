/*
 * Only intialise if we're in the iframe we've created to house the site.
 * It's named after the extension
 */
if(window.name == 'seesponsive') {

	console.debug("Frame content script loaded into iframe!");

	// Listen for the event page giving us our media queries
	chrome.runtime.onMessage.addListener(function listener(request) {
		if(request.action == 'mediaQueriesLoaded') {
			var mediaQueries = request.mediaQueries;
			console.debug(mediaQueries.length + " media queries were found for the site");
			console.dir(mediaQueries);
			chrome.runtime.onMessage.removeListener(listener);
		}
	});
}