/*
 * Only intialise if we're in the iframe we've created to house the site.
 * It's named after the extension
 */
if(window.name == 'seesponsive') {

	function getLocalMediaQueries() {
		var mediaQueries = [];
		var sheets = document.styleSheets;
		if(sheets != null) {
			for(var i=0; i < sheets.length; i++) {
				var rules = sheets[i].cssRules;
				if(rules != null && sheets[i].href == null) {
					console.debug("Found internal stylesheet. Looking for media queries");
					for(var j=0; j < rules.length; j++) {
						if(rules[j].constructor === CSSMediaRule) {
							mediaQueries.push({
								url: 'LOCAL',
								text: rules[j].media.mediaText
							});
						}
					}
				}
			}
		}
		console.debug("Returning " + mediaQueries.length + " internally declared media queries");
		return mediaQueries;
	}

	function listenForMediaQueryChanges(mediaQueries) {
		for(var i=0; i < mediaQueries.length; i++) {
			
			var mql = window.matchMedia(mediaQueries[i].text);
      mql.addListener(function(q) {
      	console.debug("Media query triggered: " + q.media);
      	if(q.matches) {
      		console.debug("... condition was met");
      	} else {
      		console.debug("... condition was not met");
      	}
      });
		}
	}

	// Listen for the event page giving us our media queries
	chrome.runtime.onMessage.addListener(function listener(request) {
		if(request.action == 'mediaQueriesLoaded') {
			var mediaQueries = request.mediaQueries;			
			chrome.runtime.onMessage.removeListener(listener);

			// we have media queries from external stylesheets. Now merge in any from styletags
			// in the page
			mediaQueries = mediaQueries.concat(getLocalMediaQueries());			
			console.debug(mediaQueries.length + " media queries were found for the site");
			console.dir(mediaQueries);

			// setup listeners for each of the queries being met
			listenForMediaQueryChanges(mediaQueries);
		}
	});

	console.debug("Frame content script loaded into iframe!");
}