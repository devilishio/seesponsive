/*
 * Only try and parse queries if we're in the embedded iframe.
 * We could also be injected into another frame on the tab
 * or have been loaded as part of event_page.html
 */
if(window.name == 'seesponsive') {
	// we're in the iFrame! Look for media queries
	console.log("Finding media queries in site: " + location.href);

	var queries = findMediaQueriesInDocument();	

	var numUnresolved = queries.unresolved.length;
	console.log("Found " + queries.found.length + " media queries. " + numUnresolved +
		" stylesheets could not be resolved.");

	console.dir(queries);

	if(numUnresolved > 0) {
		console.log("Sending " + numUnresolved + " unresolved URLs to the event page for resolution");

		// Listen for the message with our resolved queries
		chrome.runtime.onMessage.addListener(function(response) {
			console.debug("URLs were resolved:");
			console.dir(response.queries);
		});

		chrome.runtime.sendMessage(
	  	{
		  	action: "getMediaQueries",
		  	urls: queries.unresolved
		  }
		);
	}
}

/*
 * Checks whether the URL is on the same domain
 * as the window's domain
 */
function isCrossDomainUrl(url) {
	var thisHost = location.host;
	var thatHost = hostname(url);
	return (thisHost !== thatHost);
}

/*
 * Finds the host component of a URL
 */
function hostname(url) {	
	var a = document.createElement('a');
	a.href = url;
	return a.host;
}

/*
 * Utility method. Merges a set of results from parsing media 
 * query descriptors from stylesheets.
 */
function mergeResults(curr, next) {
	return {
		found: curr.found.concat(next.found),
		unresolved: curr.unresolved.concat(next.unresolved)
	};
}

/*
 * Find any media queries in stylesheets loaded from the document's domain.
 */
function findMediaQueriesInDocument() {
	console.debug("Finding media queries in the document for window: " + window.name);

	var queries = {
		found: [],
		unresolved: []
	};

	var sheets = document.styleSheets;
	if(sheets != null) {
		for (var i = 0; i < sheets.length; i += 1) {	
			var sheet = sheets[i];	
	    var results = findMediaQueriesInStyleSheet(sheet);
	    queries = mergeResults(queries, results);
	  }
	}

	return queries;
}

/*
 * Returns any media queries in the given stylesheet and any
 * imported stylesheets. If the sheet or its imported sheets
 * are cross-domain we return them in an "unresolved" list
 * to be sent for processing by the event page.
 */
function findMediaQueriesInStyleSheet(stylesheet) {
	var queries = {
		found: [],
		unresolved: []
	};

	if(stylesheet.cssRules != null) {

  	// This stylesheet has some rules so we need to extract
  	// out any media queries from this list
  	var results = findMediaQueriesInCssRules(stylesheet.href, stylesheet.cssRules);
  	queries = mergeResults(queries, results);

  } else if(stylesheet.href && isCrossDomainUrl(stylesheet.href)) {

  	// Cross domain restriction prevents access to the rules.
  	// Push the URL for the stylesheet on to a list that we'll
  	// pass back to the event page to retrieve and parse.
  	queries.unresolved.push(stylesheet.href);
  }

  return queries;
}

/*
 * Given a list of CSS rules from a stylesheet object,
 * extract any that are media queries and return a list
 * of descriptors that represent them. Also returns a list
 * of any imported stylesheets that cannot be resolved
 * due to cross-domain restrictions.
 */
function findMediaQueriesInCssRules(href, rules) {
	var queries = {
		found: [],
		unresolved: []
	};

	for(var i=0; i < rules.length; i++) {

		// Identify the type of rule from the object constructor.
		// We're interested in either media rules or CSS import rules which
		// indicate a stylesheet import that we'll have to dive
		// down into to extract any queries
		var ruleType = rules[i].constructor;

		if(ruleType === CSSMediaRule) {
			queries.found.push(queryDescriptor(href, rules[i].media.mediaText));
		} else if(ruleType === CSSImportRule) {
			var importedSheet = rules[i].styleSheet;
			var results = findMediaQueriesInStyleSheet(importedSheet);

			queries = mergeResults(queries, results);
		}
	}

	return queries;
}

/* Makes a query descriptor object out of its parts */
function queryDescriptor(url, text) {
	return {
		url: url,
		text: text
	}
}