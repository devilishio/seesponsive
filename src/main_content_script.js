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

var url = location.href;
var stylesheets = getStylesheetUrls();

// Remove any styling from the main document so our own takes control
$('link').remove();

document.body.innerHTML = 
	"<div id='command-bar'><ul><li><a href='#' id='shrink-button'>Shrink</a></li><li><a href='#' id='grow-button'>Grow</a></li></ul></div>" +
	"<iframe id='iframeContent' name='seesponsive' seamless='seamless' width='100%' height='100%' style='overflow:auto' src='" +
	url + "'></iframe>";

// handle shrink and grow actions
$('#shrink-button').click(function() {
	$('#iframeContent').animate({ width: '340px'}, 15000, 'linear');
	return false;
});

$('#grow-button').click(function() {
	$('#iframeContent').animate({ width: '1200px'}, 15000, 'linear');
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