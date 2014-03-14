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

document.body.innerHTML = 
	"<div>BOO!</div><iframe id='iframeContent' name='seesponsive' seamless='seamless' width='1280' height='800' style='overflow:auto' src='" +
	url + "'></iframe>";

// Send a message that we've added the iframe to the event page so that it will
// listen for completion of the iframe loading
chrome.runtime.sendMessage(
	{
  	action: "mainContentInjected",
  	url: url,
  	cssUrls: getStylesheetUrls()
  }
);