/*!
	Copyright (C) 2014 Matthew D. Mower

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

document.addEventListener('DOMContentLoaded', function () {
	getLocalMessages();
	getUrlVariables();
	restoreOptions();
	prepareColorPickers();
	startListeners();
}, false);

function startListeners() {
	/*
	 * qrSizeInput can fire onChange events frequently. debounce it to only run
	 * once per 750ms so Chrome Sync doesn't get too many sync requests.
	 */
	var dbSaveOptions = _.debounce(saveOptions, 750);

	$("#doiForm").submit(function () {
		formSubmitHandler();
		return false;
	});
	$("#qrBgTrans").on("click", saveOptions);
	$("#qrFetchTitle").on("click", setCrossrefPermission);
	$(".numeric").keyup(function () {
		this.value = this.value.replace(/[^0-9]/g,'');
	});
	$("#qrSizeInput").on("change", dbSaveOptions);
	$("#qrManualTitle").on("click", toggleTitleFetch);
}

// Read a page's GET URL variables and return them as an associative array.
// http://jquery-howto.blogspot.com/2009/09/get-url-parameters-values-with-jquery.html
function getUrlVariables() {
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for(var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}

	var initDOI = vars["doi"];
	if(initDOI) {
		$("#doiInput").val(initDOI);
	}
}

function syncOptions() {
	chrome.runtime.sendMessage({cmd: "sync_opts"});
}

function restoreOptions() {
	var qrSize = localStorage["qr_size"];
	if(isNaN(qrSize)) {
		$("#qrSizeInput").val(300);
	} else {
		$("#qrSizeInput").val(qrSize);
	}
	if(localStorage["qr_title"] == "true") {
		$("#qrFetchTitle").prop("checked", true);
	}
	if(localStorage["qr_bgtrans"] == "true") {
		$("#qrBgTrans").prop("checked", true);
		$("#bgColorDiv").css("display", "none");
	}
}

function isHexColor(code) {
	return /^#[0-9A-F]{6}$/i.test(code);
}

function prepareColorPickers() {
	var qrFgColor = "#000000";
	var storedQrFgColor = localStorage["qr_fgcolor"];
	if(isHexColor(storedQrFgColor)) {
		qrFgColor = storedQrFgColor;
	}
	$("#qrFgColorInput").val(qrFgColor);

	var qrBgColor = "#ffffff";
	var storedQrBgColor = localStorage["qr_bgcolor"];
	if(isHexColor(storedQrBgColor)) {
		qrBgColor = storedQrBgColor;
	}
	$("#qrBgColorInput").val(qrBgColor);

	$("#qrFgColorInput").spectrum({
		color: qrFgColor,
		preferredFormat: "hex",
		showInput: true,
		clickoutFiresChange: true,
		replacerClassName: "qrColorReplacerClass",
		containerClassName: "qrColorContainerClass",
		change: function(color) {
			saveOptions()
		}
	});

	$("#qrBgColorInput").spectrum({
		color: qrBgColor,
		preferredFormat: "hex",
		showInput: true,
		clickoutFiresChange: true,
		replacerClassName: "qrColorReplacerClass",
		containerClassName: "qrColorContainerClass",
		change: function(color) {
			saveOptions()
		}
	});
}

function saveOptions() {
	if($("#qrFetchTitle").is(":checked")) {
		localStorage["qr_title"] = true;
	} else {
		localStorage["qr_title"] = false;
	}
	if($("#qrBgTrans").is(":checked")) {
		localStorage["qr_bgtrans"] = true;
		$("#bgColorDiv").css("display", "none");
	} else {
		localStorage["qr_bgtrans"] = false;
		$("#bgColorDiv").css("display", "block");
	}
	localStorage["qr_size"] = $("#qrSizeInput").val();
	localStorage["qr_fgcolor"] = $("#qrFgColorInput").val();
	localStorage["qr_bgcolor"] = $("#qrBgColorInput").val();
	syncOptions();
}

function toggleTitleFetch() {
	if($("#qrManualTitle").is(":checked")) {
		$("#qrFetchTitle").prop("checked", false);
		$("#qrFetchTitle").attr("disabled", "disabled");
		$("#qrManualTitleTextDiv").css("display", "flex");
		saveOptions();
	} else {
		$("#qrFetchTitle").removeAttr("disabled");
		$("#qrManualTitleTextDiv").css("display", "none");
	}
}

function trim(stringToTrim) {
	return stringToTrim.replace(/doi:|\s+|[\.!\?,]$|[\.!\?,]\s+$/g,"");
}

function checkValidDoi(doiInput) {
	if(doiInput.match(/^10\./)) {
		return true;
	} else if(doiInput.match(/^10\//)) {
		return true;
	} else {
		simpleNotification(chrome.i18n.getMessage("invalidDoiAlert"));
		return false;
	}
}

function resetSpace() {
	$("#notifyDiv").html("");
	$("#notifyDiv").css("display", "none");
	$("#qrDiv").html("");
	$("#qrDiv").css("display", "none");
}

function simpleNotification(message) {
	resetSpace();
	$("#notifyDiv").html(message);
	$("#notifyDiv").css("display", "block");
}

function advancedNotification(elms) {
	resetSpace();
	for(var i = 0; i < elms.length; i++) {
		elms[i].appendTo($("#notifyDiv"));
	}
	$("#notifyDiv").css("display", "block");
}

function setCrossrefPermission() {
	var perm = $("#qrFetchTitle").is(":checked");

	if(perm) {
		chrome.permissions.request({
			origins: [ 'http://*.doi.org/', 'http://*.crossref.org/', 'http://*.datacite.org/' ]
		}, function(granted) {
			if(granted) {
				$("#qrFetchTitle").prop("checked", true);
				saveOptions();
			} else {
				$("#qrFetchTitle").prop("checked", false);
				saveOptions();
			}
		});
	} else {
		chrome.permissions.remove({
			origins: [ 'http://*.doi.org/', 'http://*.crossref.org/', 'http://*.datacite.org/' ]
		}, function(removed) {
			if(removed) {
				$("#qrFetchTitle").prop("checked", false);
				saveOptions();
			} else {
				$("#qrFetchTitle").prop("checked", true);
				saveOptions();
			}
		});
	}
}

function htmlEscape(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function formSubmitHandler() {
	var doiInput = escape(trim($("#doiInput").val()));
	var size = parseInt(escape($("#qrSizeInput").val()));
	var fgcolor = $("#qrFgColorInput").val();
	var bgcolor = $("#qrBgColorInput").val();

	if($("#qrBgTrans").is(":checked")) {
		bgcolor = null;
	}

	if(!doiInput || !size || !checkValidDoi(doiInput)) return;
	if(size < 80) {
		simpleNotification(chrome.i18n.getMessage("invalidQrSizeAlert"));
		return;
	}

	insertQr(doiInput, size, fgcolor, bgcolor);
}

function insertQr(doiInput, size, fgcolor, bgcolor) {
	resetSpace();

	var stringToEncode = "";
	var jsonUrl = "http://dx.doi.org/" + doiInput;

	if(doiInput.match(/^10\./)) {
		stringToEncode = "http://dx.doi.org/" + doiInput;
	} else if(doiInput.match(/^10\//)) {
		stringToEncode = "http://doi.org/" + doiInput.replace(/^10\//,"");
	}

	simpleNotification("Loading...");

	var perm = $("#qrFetchTitle").is(":checked");
	if(perm) {
		chrome.permissions.request({
			origins: [ 'http://*.doi.org/', 'http://*.crossref.org/', 'http://*.datacite.org/' ]
		}, function(granted) {
			if(granted) {
				var jqxhr = $.ajax({
					url: jsonUrl,
					headers: { Accept: "application/citeproc+json" },
					dataType: "text",
					type: "GET",
					cache: false
				});
				jqxhr.done(function() {
					try {
						var doiTitle = JSON.parse(jqxhr.responseText).title;
						doiTitle = doiTitle.replace(/<subtitle>(.*)<\/subtitle>/," - $1");
						doiTitle = doiTitle.replace(/<alt-title>(.*)<\/alt-title>/,"");
						doiTitle = doiTitle.replace(/<.*>(.*)<\/.*>/,"$1");
						stringToEncode = doiTitle + "\n" + stringToEncode;
						updateMessage(stringToEncode, "found");
						createQrImage(stringToEncode, size, fgcolor, bgcolor);
					} catch(e) {
						updateMessage(stringToEncode, "missing");
						createQrImage(stringToEncode, size, fgcolor, bgcolor);
					}
				});
				jqxhr.error(function() {
					updateMessage(stringToEncode, "missing");
					createQrImage(stringToEncode, size, fgcolor, bgcolor);
				});
			} else {
				updateMessage(stringToEncode, "disabled");
				createQrImage(stringToEncode, size, fgcolor, bgcolor);
			}
		});
	} else {
		var manualTitle = $("#qrManualTitle").is(":checked");
		if(manualTitle) {
			var titleString = $("#qrManualTitleText").val();
			if(titleString != "") {
				stringToEncode = titleString + "\n" + stringToEncode;
			}
		}
		updateMessage(stringToEncode, "disabled");
		createQrImage(stringToEncode, size, fgcolor, bgcolor);
	}
}

function createQrImage(text, size, fgcolor, bgcolor) {
	$("#qrDiv").qrcode({
		text: text,
		size: size,
		fill: fgcolor,
		background: bgcolor,
		render: 'image'
	});
	linkifyQrImage();
}

function updateMessage(stringToEncode, titleRetrieval) {
	var titleNotice = "";
	var statusMessage = "";

	switch(titleRetrieval) {
	case "found":
		titleNotice = chrome.i18n.getMessage("qrTitleSuccess");
		break;
	case "missing":
		titleNotice = chrome.i18n.getMessage("qrTitleFailure");
		break;
	case "disabled":
		titleNotice = chrome.i18n.getMessage("qrDisabled");
		break;
	default:
		titleNotice = chrome.i18n.getMessage("qrDisabled");
		break;
	}

	var statusMessage = [];
	var tmp = $('<span>').attr("class", "notifyHeading");
	tmp.html(chrome.i18n.getMessage("qrTitleStatus"));
	statusMessage.push(tmp);
	tmp = $('<span>').attr("class", "notifyContent");
	tmp.html(titleNotice);
	statusMessage.push(tmp);
	tmp = $('<br>');
	statusMessage.push(tmp);
	tmp = $('<span>').attr("class", "notifyHeading");
	tmp.html(chrome.i18n.getMessage("qrMessageEncoded"));
	statusMessage.push(tmp);
	tmp = $('<span>').attr("class", "notifyContent");
	tmp.html(htmlEscape(stringToEncode));
	statusMessage.push(tmp);

	advancedNotification(statusMessage);
}

function linkifyQrImage() {
	var qrImg = $("#qrDiv img");
	if(qrImg.length > 0) {
		var saveLink = $('<a>').attr("id", "qrImageSaveLink");
		saveLink.attr("href", qrImg.attr("src"));
		saveLink.attr("download", "qrImage.png");
		qrImg.wrap(saveLink);
		$("#qrDiv").css("display", "block");
	}
}

function getLocalMessages() {
	var message = chrome.i18n.getMessage("qrHeading");
	$("#heading").html(message);
	message = chrome.i18n.getMessage("qrSubHeading");
	$("#subHeading").html(message);
	message = chrome.i18n.getMessage("qrFgColorInputLabel");
	$("#qrFgColorInputLabel").html(message);
	message = chrome.i18n.getMessage("qrBgColorInputLabel");
	$("#qrBgColorInputLabel").html(message);
	message = chrome.i18n.getMessage("qrBgTransLabel");
	$("#qrBgTransLabel").html(message);
	message = chrome.i18n.getMessage("qrSizeInputLabel");
	$("#qrSizeInputLabel").html(message);
	message = chrome.i18n.getMessage("qrManualTitleLabel");
	$("#qrManualTitleLabel").html(message);
	message = chrome.i18n.getMessage("qrManualTitleTextLabel");
	$("#qrManualTitleTextLabel").html(message);
	message = chrome.i18n.getMessage("qrFetchTitleLabel");
	$("#qrFetchTitleLabel").html(message);
}
