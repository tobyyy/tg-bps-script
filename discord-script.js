// ==UserScript==
// @name         Pump discord trigger
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Helps to detect coin announcements in pump groups and triggers events
// @author       Tobyyy
// @match        https://discord.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

const stylesheet = `
#yyycpt-overlay-menu {
	position:absolute;
	top: 10px;
	right: -70px;
	z-index: 99999;
	
	width: 80px;
	height: 30px;
	
    background-color: black;
	
	font-size:40px;
	line-height: 10px;
	text-align: center;
	vertical-align: middle;
}

#yyycpt-overlay-menu[hidden] {
	display: none;
}

#yyycpt-overlay-menu:hover {
	right: 0px;
}

#yyycpt-overlay-dialog {
	position: absolute;
	top: 80px;
	right: 20px;
	z-index: 99999;
	
	width: 180px;
	height: 60px;
	
	background-color: black;

	line-height: 10px;
	vertical-align: middle;
}

#yyycpt-overlay-dialog[hidden] {
	display: none;
}

#yyycpt-dialog-controls {
	font-size: 20px;
	margin: 10px;
	text-align: right;
}

#yyycpt-dialog-icon {
	margin-right: 20px;
}

#yyycpt-dialog-icon::after {
	width: 50px;
}

#yyycpt-dialog-icon[state="idle"]::after {
	color: lightgrey;
	content: "⏻"
}

#yyycpt-dialog-icon[state="attention"]::after {
	color: yellow;
	content: "⚠"
}

#yyycpt-dialog-icon[state="error"]::after {
	color: red;
	content: "❌"
}

#yyycpt-dialog-icon[state="ok"]::after {
	color: green;
	content: "✓"
}

#yyycpt-dialog-trigger-toggle {
	width: 55px;
}

#yyycpt-dialog-info {
	font-size: 13px;
	margin: 5px;
}

#yyycpt-dialog-info[state="idle"] {
	color: lightgrey;
}

#yyycpt-dialog-info[state="attention"] {
	color: yellow;
}

#yyycpt-dialog-info[state="error"] {
	color: red;
}

#yyycpt-dialog-info[state="ok"] {
	color: green;
}

`;

const overlay = `
<div id="yyycpt-overlay-menu">
	<button id="yyycpt-overlay-toggle">Overlay</button>
</div>

<div id="yyycpt-overlay-dialog" hidden>
	<div id="yyycpt-dialog-controls">
		<span id="yyycpt-dialog-icon" state="idle"></span>
		<button id="yyycpt-dialog-trigger-toggle">Enable</button>
		<button id="yyycpt-dialog-close">Close</button>
	</div>
	<div id="yyycpt-dialog-info" state="idle">
	</div>
</div>
`;

const triggerRegex = /\$([a-zA-Z0-9]+)/g;

let state = "idle";
let observer;

function trigger(coin) {

}

function handlePlainMessage(text) {
	console.debug("Looking for coin in msg", text);

	const parse = triggerRegex.exec(text);
	if (!parse) {
		error("No coin found in the message.", text);
		return;
	}

	//try second time in case of bamboozle
	const secondParse = triggerRegex.exec(text);
	if (secondParse) {
		error("Multiple coin candidates found in the message. Backing off.");
		return;
	}

	const coin = parse[1];

	console.log("Extracted coin", coin);

	fetch('http://localhost:1337/tgmsg', {
		method: 'POST',
		body: coin
	}).catch(e => {
		error("Error in request. Coin may have ben reported: " + coin, e);
	});

	//GM_setValue("yyycpt", coin);

	ok(coin);
}

function onMessageAdd(nodeList) {
	if (nodeList.length > 1) {
		error("Multiple mutations in node list. I am not ready for this.", nodeList);
		return;
	}

	const msgDiv = nodeList[0];
	console.debug("msg div", msgDiv);
	console.debug("msg div list", msgDiv.children);

	try {
		const contentDiv = msgDiv.children[0].children[1];
		console.debug("Extracted content div", contentDiv);
		handlePlainMessage(contentDiv.innerText);
	} catch (e) {
		error("Could not extract message", e);
	}
}

function activateTrigger() {
	//find the scroller
	const divsColl = document.getElementsByTagName('div');
	const scrollers = [...divsColl].filter(d => d.className.startsWith("scrollerInner"));

	if (!scrollers.length) {
		error("No messages found. Check if in room.")
		return;
	}

	if (scrollers.length > 1) {
		error("Multiple scrollers. Very wrong. Call Toby.");
		return;
	}

	const scroller = scrollers[0];

	//create observer
	const observerConfig = {childList: true};
	const callback = function (mutationList, observer) {
		for (const mutation of mutationList) {
			console.debug("Mutation", mutation);

			if (mutation.addedNodes && mutation.addedNodes.length > 0) {
				onMessageAdd(mutation.addedNodes);
			}
		}
	}

	observer = new MutationObserver(callback);
	observer.observe(scroller, observerConfig);

	setState("attention");
	setText("Awaiting coin in next message. Stay in the room!");
}

function deactivateTrigger() {
	if (observer) {
		observer.disconnect();
	}

	clear();
}

function clear() {
	setState("idle");
	setText("");
	triggerRegex.lastIndex = 0;
}

function ok(coin) {
	if (observer) {
		observer.disconnect();
	}

	setState("ok");
	if (coin) {
		setText("Triggered for coin " + coin);
	} else {
		setText("");
	}
}

function error(text, ...more) {
	console.log(text, more);
	setState("error");
	setText(text);

	if (observer) {
		observer.disconnect();
	}
}

function elm(id) {
	return document.getElementById(id);
}

function toggleOverlay(open) {
	const menu = elm("yyycpt-overlay-menu");
	const dialog = elm("yyycpt-overlay-dialog");

	if (open) {
		menu.setAttribute("hidden", "");
		dialog.removeAttribute("hidden");
	} else{
		menu.removeAttribute("hidden");
		dialog.setAttribute("hidden", "");
		deactivateTrigger();
	}
}

function setState(newState) {
	console.debug("setting state", newState);

	let buttonTxt;
	switch (newState) {
		case "idle":
			buttonTxt = "Enable";
			break;
		case "attention":
			buttonTxt = "Disable";
			break;
		case "error":
			buttonTxt = "Clear";
			break;
		case "ok":
			buttonTxt = "Ack";
			break;
		default:
			console.error("Illegal state");
			return;
	}

	state = newState;

	elm("yyycpt-dialog-icon").setAttribute("state", newState);
	elm("yyycpt-dialog-info").setAttribute("state", newState);
	elm("yyycpt-dialog-trigger-toggle").innerText = buttonTxt;
}

function setText(text) {
	elm("yyycpt-dialog-info").innerText = text;
}

function toggleTrigger() {
	console.debug("toggle state", state);

	switch (state) {
		case "idle":
			activateTrigger();
			break;
		case "attention":
			deactivateTrigger();
			break;
		case "error":
		case "ok":
			clear();
			break;
		default:
			console.error("You messed the states");
			return;
	}
}

function loadStylesheet() {
	const style = document.createElement('style');
	style.id = "yyycpt-stylesheet";
	style.innerText = stylesheet;
	document.head.appendChild(style);

	console.debug("[yyycpt] stylesheet loaded");
}

function loadOverlay() {
	const container = document.createElement('div');
	container.id = "yyycpt-overlay";
	container.innerHTML = overlay;
	document.body.appendChild(container);

	console.debug("[yyycpt] overlay loaded");
}

function attachEventHandlers() {
	elm("yyycpt-overlay-toggle").onclick = () => toggleOverlay(true);
	elm("yyycpt-dialog-close").onclick = () => toggleOverlay(false);
	elm("yyycpt-dialog-trigger-toggle").onclick = () => toggleTrigger();

	console.debug("[yyycpt] event handlers attached");
}

function init() {
	loadStylesheet();
	loadOverlay();
	//attach event handlers after elements are added to the dom
	setTimeout(attachEventHandlers);
}

//add initialization at the end of the event loop
setTimeout(init);
