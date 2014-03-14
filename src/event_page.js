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

function loadStylesheets(urls, response) {
	// bind our handler to the list of URLs so it
	// can know when we're done
	var ctx = {
		urls: urls,
		response: response
	};
	var handler = handleSheetLoad.bind(ctx);

	console.debug("Loading stylesheets into document");
	$(urls).each(function(i, url) {
		console.debug("Loading stylesheet #" + i + ": " + url);
		$( "<link></link>", {
		  "href": url,
		  "rel": "stylesheet",
		  on: {
		    load: handler
		  }
		}).appendTo( "body" );
	});
}

/*
 * Handler for a stylesheet being loaded into the event page
 * 
 */
function handleSheetLoad(event) {
	var url = event.target.href;
	console.debug("Stylesheet " + url + " has loaded");

	// remove from list
	var urls = this.urls;
	var i = urls.indexOf(url);
	urls.splice(i,1);

	if(urls.length == 0) {
		console.debug("Loaded all stylesheets - now finding queries in them");
		var queries = findMediaQueriesInDocument();

		// Remove the link elements after use
		$("link").remove();

		var numUnresolved = queries.unresolved.length;
		if(numUnresolved == 0) {
			// Send back the details to the content page if we have queries
			var found = queries.found;
			if(found.length > 0) {
				console.debug("Sending " + found.length + " queries back to the content script");
			} else {
				console.debug("No media queries found in stylesheets");
			}
			this.response(found);
		} else {
			console.error("There were " + numUnresolved + " unresolved stylesheets. This should not happen!");
		}		
	}
}

function sendMediaQueriesToIframe(mediaQueries) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	  chrome.tabs.sendMessage(tabs[0].id,
	  	{
		  	action: "mediaQueriesLoaded",
		  	mediaQueries: mediaQueries
	  	}
	  );
	});
}

/*
 * Injects the content script intended for the iframe we've
 * added to the page to embed the site contents in.
 */
function injectFrameScript(mediaQueries) {
	chrome.tabs.executeScript(null, {
			file: "frame_content_script.js",
			// Without this the script will only be injected into the main window.
			// The script will begin its processing if it determines that it is running in the
			// injected iframe
			allFrames: true,
			runAt: 'document_end'
		}, function(results){
			var num = results ? results.length : 0;
			console.log("Frame script was injected into " + num + " frames");
			if(num == 0) {
				console.error("Could not inject the frame content script!");
			}

			// content script has been loaded into iframe. now send it the media queries
			sendMediaQueriesToIframe(mediaQueries);
		}
	);
}

/*
 * Wait for the iframe to be fully loaded and then
 * extract a list of media queries from each CSS sheet in the site
 * before finally loading the frame content script into the iframe
 * and passing it the list of media queries.
 */
function setupIframeContentScript(details) {
	var url = details.url;
	var cssUrls = details.cssUrls;
	console.debug("Main content injected into " + url + ". Waiting for iframe loading to complete");
	console.debug("Found " + cssUrls.length + " stylesheets to parse for media queries");
	
	// add a navigation listener to see when iframe is loaded
	chrome.webNavigation.onCompleted.addListener(function completionListener(details) {
		if(details.url == url) {			
			// iframe has loaded - load stylesheets, parse media queries and
			// finally inject the content script for the iframe.
			console.debug("iframe for URL: " + url + " has completed loading.");
			console.debug("Injecting frame content script");
			chrome.webNavigation.onCompleted.removeListener(completionListener);

			loadStylesheets(cssUrls, function(mediaQueries) {
				console.debug("Load stylesheets returned " + mediaQueries.length + " media queries");
				injectFrameScript(mediaQueries);
			});
		}
	});
}

// Adds a listener for messages from this extension's content scripts
// TODO - make sure the message came from our extension only
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(sender.tab) {
    	if(request.action == 'mainContentInjected') {
    		setupIframeContentScript(request);
    	} 
		}
 });

// Called when the user clicks our extension's toolbar button
chrome.browserAction.onClicked.addListener(function() {

	// Inject the main content script into the active tab
	// Note this script depends on JQuery so we need to inject that first
	// Injection is asynchronous so it's a bit messy!
	chrome.tabs.executeScript(null, { file: "jquery-2.1.0.min.js" }, function() {
    chrome.tabs.executeScript(null, { file: "main_content_script.js" }, function() {
    	console.log("JQuery and main script were injected into the active tab");
    });
	});

});
