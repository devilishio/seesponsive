// tells timeout that we've managed to inject the inner content script
window.seesponsiveLoaded = true;

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
      	if(q.matches) {
      		displayMediaQueryAction(true, q.media);
      	} else {
      		displayMediaQueryAction(false, q.media);
      	}
      });
		}
	}

	/*
	 * Displays a message in the action bar to indicate a media
	 * query has become active/inactive
	 */
	function displayMediaQueryAction(queryActive, query) {
	  var doc = parent.document;

	  // set the matched/unmatched status and the query description
	  var statusSpan = doc.getElementById('queryMsg-status');
	  var querySpan = doc.getElementById('queryMsg-query');
	  var status = (queryActive ? 'MATCHED' : 'UNMATCHED');
	  statusSpan.className = status.toLowerCase();
	  
	  setOrReplaceText(statusSpan, status);
	  setOrReplaceText(querySpan, query);	  
	}

	function setOrReplaceText(el, text) {
		var textNode = el.ownerDocument.createTextNode(text);
		var firstChild = el.firstChild;
		if(firstChild != null) {
			el.replaceChild(textNode, firstChild);
		} else {
			el.appendChild(textNode);
		}
	}

	// Listen for the event page giving us our media queries
	chrome.runtime.onMessage.addListener(function listener(request, sender) {
		
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
}