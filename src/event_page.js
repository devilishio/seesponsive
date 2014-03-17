function sendMessageToTab(msg) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	  chrome.tabs.sendMessage(tabs[0].id, msg);
	});
}

/*
 * Utility method. Joins a set of results from parsing media 
 * query descriptors from stylesheets.
 */
function joinResults(curr, next) {
	return curr.concat(next);
}

/*
 * Find any media queries in stylesheets loaded from the document's domain.
 */
function findMediaQueriesInDocument() {

	var queries = [];

	var sheets = document.styleSheets;
	if(sheets != null) {
		for (var i = 0; i < sheets.length; i += 1) {	
			var sheet = sheets[i];	
	    var results = findMediaQueriesInStyleSheet(sheet);
	    queries = joinResults(queries, results);
	  }
	}

	return queries;
}

/*
 * Returns any media queries in the given stylesheet and any
 * imported stylesheets.
 */
function findMediaQueriesInStyleSheet(stylesheet) {
	var queries = [];

	if(stylesheet.cssRules != null) {

  	// This stylesheet has some rules so we need to extract
  	// out any media queries from this list
  	var results = findMediaQueriesInCssRules(stylesheet.href, stylesheet.cssRules);
  	queries = joinResults(queries, results);

  } else if(stylesheet.href != null){
  	console.error("Could not extract CSS rules for stylesheet: " + stylesheet.href);
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
	var queries = [];

	for(var i=0; i < rules.length; i++) {

		// Identify the type of rule from the object constructor.
		// We're interested in either media rules or CSS import rules which
		// indicate a stylesheet import that we'll have to dive
		// down into to extract any queries
		var ruleType = rules[i].constructor;

		if(ruleType === CSSMediaRule) {
			queries.push(queryDescriptor(href, rules[i].media.mediaText));
		} else if(ruleType === CSSImportRule) {
			var importedSheet = rules[i].styleSheet;
			var results = findMediaQueriesInStyleSheet(importedSheet);

			queries = joinResults(queries, results);
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

/*
 * Load a list of stylesheets by inserting link tags for them
 * into the event pages for resolution.
 * This way we can resolve cross-domain stylesheets as our
 * extension's event script has cross-domain privileges
 */
function loadStylesheets(urls, response) {
	// bind our handler to the list of URLs so it
	// can know when we're done
	var ctx = {
		urls: urls,
		response: response
	};
	var handler = handleSheetLoad.bind(ctx);

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

	// remove from list
	var urls = this.urls;
	var i = urls.indexOf(url);
	urls.splice(i,1);

	if(urls.length == 0) {
		console.debug("All stylesheets loaded - extracting queries.");
		var queries = findMediaQueriesInDocument();

		// Remove the link elements after use
		$("link").remove();

		// Send back the query details to the content page
		console.debug("Found " + queries.length + " queries to send back to the content script.");
		
		this.response(queries);
			
	}
}

/*
 * Injects the content script intended for the iframe we've
 * added to the page to embed the site contents in.
 *
 * KNOWN ISSUE - the content script intermittently fails to inject into
 * either the main frame or the iframe. No result code returned. Possible timing issue.
 */
function injectFrameScript(mediaQueries) {
	chrome.tabs.executeScript(null, {
			file: "frame_content_script.js",
			// Without this the script will only be injected into the main window.
			// The script will begin its processing if it determines that it is running in the
			// injected iframe
			allFrames: true,
			runAt: 'document_end'
		}, function(results) {
			var num = results ? results.length : 0;
			console.debug("Frame script was injected into " + num + " frames");
			if(num == 0) {				
				// could not inject frame content script. Timeout on main content script
				// will handle this by showing the user an error message
				console.error("Could not inject the frame content script!");
			} else {

				// content script has been loaded into iframe. now send it the media queries
				sendMessageToTab({
			  	action: "mediaQueriesLoaded",
			  	mediaQueries: mediaQueries
				});
			}
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
// and perform initialisation of the iframe content script when ready
chrome.runtime.onMessage.addListener(
  function(request, sender) {
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
	chrome.tabs.insertCSS(null, { file: 'main_content.css' }, function() {
		chrome.tabs.executeScript(null, { file: "jquery-2.1.0.min.js" }, function() {
	    chrome.tabs.executeScript(null, { file: "main_content_script.js" }, function() {
	    	console.debug("Scripts were injected into the active page");
	    });
		});
	});
});
