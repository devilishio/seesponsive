function getStylesheetUrls() {
	var cssUrls = [];
	var sheets = document.styleSheets;

	if(sheets != null) {
		for(var i=0; i < sheets.length; i++) {
			if(sheets[i].href != null) {
				cssUrls.push(sheets[i].href);
			}
		}
	}

	return cssUrls;
}

// chrome.runtime.onMessage.addListener(function (request, sender) {
// 	console.debug("got message!!");
// 	console.dir(request);
// 	if(request.action === 'errorOccurred') {
// 		$(document.body).append("<div id='errorMsg'></div>")
// 		$('#errorMsg').text(request.msg);
// 	}
// });

var url = location.href;
var stylesheets = getStylesheetUrls();

// Remove any styling from the main document so our own takes control
$('link').remove();

document.body.innerHTML = 
	"<div id='command-bar'><span id='loadingMsg'>Loading ... please wait</span>" + 
	"<ul id='actions' class='hidden'>" + 
	"<li><a href='#' id='shrink-button'>Shrink</a></li>" +
	"<li><a href='#' id='grow-button'>Grow</a></li>" +
	"<li id='queryMsg'><span id='queryMsg-status'></span><span id='queryMsg-query'></span></li>" +
	"</ul></div>" +
	"<iframe id='iframeContent' name='seesponsive' seamless='seamless' style='overflow:auto' src='" +
	url + "'></iframe>";

// empty the query message status
function clearStatusMsg() {
	$('#queryMsg-status').empty();
	$('#queryMsg-status').removeClass();
	$('#queryMsg-query').empty();
}

// handle shrink and grow actions
$('#shrink-button').click(function() {
	$('#iframeContent').animate({ width: '340px'}, 15000, 'linear', function() {
		clearStatusMsg();
	});
	return false;
});

$('#grow-button').click(function() {
	var maxWidth = document.body.clientWidth + 'px';
	$('#iframeContent').animate({ width: maxWidth}, 15000, 'linear', function() {
		clearStatusMsg();
	});
	return false;
});

// Send a message that we've added the iframe to the event page so that it will
// listen for completion of the iframe loading
chrome.runtime.sendMessage(
	{
  	action: "mainContentInjected",
  	url: url,
  	cssUrls: stylesheets
  }
);

// This timeout handles the intermittent case where the frame content script is
// not successfully injected. In this case we timeout showing an error message to the user.
// Reloading the page and trying again normally fixes this.
setTimeout(function() {
	if(document.body.getAttribute("data-seesponsive-loaded") !== "yes") {
		$(document.body).append("<div id='errorMsg'></div>")
		$('#errorMsg').text('Oh snap! Something seems to have gone wrong here. Please reload the page and try again');
	}
}, 12000);