if(window.name == 'seesponsive') {
	// we're in the iFrame! Look for media queries
	console.log("Finding media queries in site ...");
	var sheets = document.styleSheets;
	console.log("Found " + sheets.length + " stylesheets");
	for (var i = 0; i < sheets.length; i += 1) {		
    searchStylesheet(sheets[i]);
  }
}

function searchStylesheet(sheet) {
	console.log("--> Looking at '" + sheet.href + "'");
	var rules = sheet.cssRules;
  if(rules != null) {
  	console.log(" ... has " + rules.length + " cssRules");
    for (var j = 0; j < rules.length; j += 1) {
    	var ruleType = rules[j].constructor;
    	if (ruleType === CSSMediaRule) {
    		console.log("Found a CSS Media Query rule: " + rules[j].media.mediaText);
    	} else if(ruleType === CSSImportRule) {
    		var importedSheet = rules[j].styleSheet;
    		console.log("Found an imported stylesheet: " + importedSheet);
    		searchStylesheet(importedSheet);
    	}
    }
  } else {
  	console.log(" ... has no cssRules!");
  }
}