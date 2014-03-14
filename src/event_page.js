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

function sendResults(queries) {
	chrome.tabs.query({active: true, currentWindow: true},
		function(tabs) {
		  chrome.tabs.sendMessage(
		  	tabs[0].id,
		  	{
		  		action: "mediaQueriesFetched",
		  		queries: queries
		  	}
		  );
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
				sendResults(found);
			} else {
				console.debug("No queries found in resolved stylesheets");
			}
		} else {
			console.error("There were " + numUnresolved + " unresolved stylesheets. This should not happen!");
		}		
	}
}

/*
 * Injects the content script intended for the iframe we've
 * added to the page to embed the site contents in.
 *
 * TODO - this fails to inject some times - maybe a timing issue. Need to fix this.
 */
function injectFrameScript() {
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
		}
	);
}

// Adds a listener for messages from this extension's content scripts
// TODO - make sure the message came from our extension only
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(sender.tab) {
    	if(request.action == 'iframeLoaded') {
	    	// The iframe has loaded so we need to inject our inner content script
	    	// intended for just that iframe
	    	console.debug("Injecting inner frame content script");
	    	injectFrameScript();
	    } else if(request.action == 'getMediaQueries') {
	   		console.log("received a request to load and process " + request.urls.length + " stylesheets");
	    	loadStylesheets(request.urls, sendResponse);
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
