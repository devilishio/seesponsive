console.log("Running inside the page!");
var url = location.href;
console.log("Page Url is: " + url);
console.log("Running JQUERY version " + $.fn.jquery);
window.isTop = true;

document.body.innerHTML = 
	"<div>BOO!</div><iframe id='iframeContent' name='seesponsive' seamless='seamless' width='1280' height='800' style='overflow:auto' src='" +
	url + "'></iframe>";

$( "#iframeContent" ).load(function() {
  chrome.runtime.sendMessage(
  	{
	  	action: "iframeLoaded"
	  }, function(response) {
		  console.log("got response");
		}
	);
});
