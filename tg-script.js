// ==UserScript==
// @name         Telegram ultimate h@xx0r script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Some mad boi
// @match        https://web.telegram.org/
// @grant        none
// ==/UserScript==

function init() {
	'use strict';
	const channelId = 1436808299;
	const triggerRegex = /\$([a-zA-Z0-9]+)/g;

	const rootScope = angular.element(document.body).injector().get('$rootScope');

	let triggerEnabled = false;

	function trigger(message) {
		console.log("Triggering coin magic for message", message);

		const parse = triggerRegex.exec(message);
		if (!parse) {
			console.error("No coin found in the message.", message);
			toggleError();
			return;
		}

		//try second time in case of bamboozle
		const secondParse = triggerRegex.exec(message);
		if (secondParse) {
			console.error("Multiple coin candidates found in the message. Backing off.");
			toggleError();
			return;
		}

		const coin = parse[1];

		fetch('http://localhost:1337/tgmsg', {
			method: 'POST',
			body: coin
		});

		toggleSuccess();
	}

	rootScope.$on("apiUpdate", (e, t) => {
		console.debug("on api update", t);

		if (t._ == "updateNewChannelMessage") {
			if (t.message.peerID == -channelId) {
				console.log("new message for my channel", t.message);

				if (triggerEnabled) {
					trigger(t.message.message);
				}
			}
		}
	});

	const exclamationDiv = document.createElement('div');
	exclamationDiv.style = "position: absolute; left: 45px; top: 30px; font-size: 600px; line-height: 600px; color: yellow; background-color: black; text-align: center; vertical-align: middle";
	exclamationDiv.textContent = "!";
	exclamationDiv.style.display = "none";

	const toggleButt = document.createElement('button');
	toggleButt.style = "position: absolute; left: 20px; bottom: 50px; font-size: 32px; height:40px";
	toggleButt.textContent = "Enable trigger";
	toggleButt.onclick = toggleTrigger;

	document.body.appendChild(exclamationDiv);
	document.body.appendChild(toggleButt);

	function toggleTrigger() {
		if (triggerEnabled) {
			triggerEnabled = false;
			toggleButt.textContent = "Enable trigger";
			exclamationDiv.style.display = "none";
		} else {
			triggerEnabled = true;
			toggleButt.textContent = "Disable trigger";
			exclamationDiv.style.display = "block";
		}
	}

	function toggleSuccess() {
		triggerEnabled = false;
		exclamationDiv.style.color = "green";
		toggleButt.textContent = "Ack success";
		toggleButt.onclick = resetState;

		triggerRegex.lastIndex = 0;
	}

	function toggleError() {
		triggerEnabled = false;
		exclamationDiv.style.color = "red";
		toggleButt.textContent = "Clear error";
		toggleButt.onclick = resetState;

		triggerRegex.lastIndex = 0;
	}

	function resetState() {
		exclamationDiv.style.color = "yellow";
		exclamationDiv.style.display = "none";
		toggleButt.textContent = "Enable trigger";
		toggleButt.onclick = toggleTrigger;
	}
}

setTimeout(init, 1000);
