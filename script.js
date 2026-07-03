const messageInput = document.getElementById("input_message");
const sendButton = document.querySelector(".send-btn");

function autoResizeTextarea(textarea) {
	if (!textarea) {
		return;
	}

	const maxHeight = 220;
	textarea.style.height = "auto";
	textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
	textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function syncSendButtonState() {
	if (!messageInput || !sendButton) {
		return;
	}

	sendButton.disabled = messageInput.value.trim().length === 0;
}

if (messageInput) {
	autoResizeTextarea(messageInput);
	syncSendButtonState();
	messageInput.addEventListener("input", () => {
		autoResizeTextarea(messageInput);
		syncSendButtonState();
	});
}
