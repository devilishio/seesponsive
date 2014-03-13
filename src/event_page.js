chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(sender.tab) {
    	console.log("got message that iframe has loaded. Injecting frame content");

    	chrome.tabs.executeScript(null, {
    			file: "frame_content_script.js",
    			allFrames: true,
    			runAt: 'document_end'
    		}, function(results){
					console.log("Frame script was injected into tab");
					console.log("Number of exections:" + results.length);
				}
			);
    }
  });

chrome.browserAction.onClicked.addListener(function() {
	console.log("Browser action for seesponsive clicked!");

	chrome.tabs.executeScript(null, { file: "jquery-2.1.0.min.js" }, function() {
    console.log("JQuery was injected!");
    chrome.tabs.executeScript(null, { file: "main_content_script.js" }, function() {
    	console.log("Main script was injected into tab");
    });
	});

	console.log("EventPage loaded!");

});
