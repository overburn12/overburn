
var chatHistories = [{ title: "Default Chat", messages: [] }];
var currentChatIndex = null;

window.addEventListener('load', function () {
  currentChatIndex = 0;
  populateOldChats();
  renderChatHistory(currentChatIndex);
});

function renderChatHistory() {
  var chatHistoryContainer = document.getElementById('chat_history');
  let htmlString = '';

  if (currentChatIndex !== null && chatHistories[currentChatIndex].messages) {
    chatHistories[currentChatIndex].messages.forEach(function (message) {
      htmlString += renderSingleMessage(message);
    });
  }

  chatHistoryContainer.innerHTML = htmlString;
}

function renameCurrentChat() {
  var newName = prompt("Enter the new name for the current chat:", chatHistories[currentChatIndex].title);
  
  if (newName === null) {
    // User cancelled the prompt
    return;
  }
  
  if (newName === "") {
    alert("Chat name cannot be empty.");
    return;
  }

  chatHistories[currentChatIndex].title = newName;
  localStorage.setItem('oldChats', JSON.stringify(chatHistories)); // Update local storage
  populateOldChats();  // Refresh the list of old chats
}

function addNewChat() {
  currentChatIndex = chatHistories.length;
  chatHistories.push({ title: "New Chat", messages: [] });

  localStorage.setItem('oldChats', JSON.stringify(chatHistories));
  
  populateOldChats();
  renderChatHistory(currentChatIndex);
}

function highlightSelectedChat() {
  // Remove highlighting from all old chats
  document.querySelectorAll('.old-chat-title').forEach(function(chatTitle) {
    chatTitle.classList.remove('highlighted-chat');
  });

  // Add highlighting to the selected chat
  document.querySelectorAll('.old-chat-title')[currentChatIndex].classList.add('highlighted-chat');
}

function populateOldChats() {
  var oldChatsString = localStorage.getItem('oldChats');
  chatHistories = oldChatsString ? JSON.parse(oldChatsString) : [];

  var oldChatsContainer = document.getElementById('old_chats_list');
  oldChatsContainer.innerHTML = '<h3>Old Chats</h3>';

  chatHistories.forEach(function (chat, index) {
    var chatContainer = document.createElement('div');
    var chatTitle = document.createElement('div');
    chatTitle.classList.add('old-chat-title');
    chatTitle.textContent = chat.title;
    chatTitle.onclick = function () {
      loadOldChat(index);
    };

    chatContainer.appendChild(chatTitle);
    oldChatsContainer.appendChild(chatContainer);
  });

  // Add management buttons
  var newChatButton = document.createElement('button');
  newChatButton.id = 'reset_button';
  newChatButton.textContent = 'New Chat';
  newChatButton.onclick = addNewChat;

  var deleteChatButton = document.createElement('button');
  deleteChatButton.id = 'delete_button';
  deleteChatButton.textContent = 'Delete Current Chat';
  deleteChatButton.onclick = deleteCurrentChat;

  var renameChatButton = document.createElement('button');
  renameChatButton.id = 'rename_button';
  renameChatButton.textContent = 'Rename Current Chat';
  renameChatButton.onclick = renameCurrentChat;

  oldChatsContainer.appendChild(newChatButton);
  oldChatsContainer.appendChild(deleteChatButton);
  oldChatsContainer.appendChild(renameChatButton);

  highlightSelectedChat();
}

function deleteCurrentChat() {
  if (chatHistories.length <= 1) {
    alert("You can't delete the last chat.");
    return;
  }
  
  chatHistories.splice(currentChatIndex, 1);  // Remove the chat at the current index
  currentChatIndex = 0;  // Reset to the first chat
  localStorage.setItem('oldChats', JSON.stringify(chatHistories));  // Update local storage
  populateOldChats();  // Refresh the list of old chats
  loadOldChat(currentChatIndex);  // Load the first chat
}


function loadOldChat(index) {
  currentChatIndex = index; // Update the index to the newly loaded old chat
  renderChatHistory();
  highlightSelectedChat();
}


function render_codeblocks(input_message) {
  var regex = /```([\s\S]*?)```/g;
  var parts = input_message.split(regex);

  var output_message = parts.map(function (part, index) {
    if (index % 2 === 1) {
      var escapedCode = part.replace(/</g, "<").replace(/>/g, ">");
      return '<pre><code>' + escapedCode + '</code></pre>';
    } else {
      return part.replace(/\n/g, '<br>');
    }
  }).join('');

  return output_message;
}

function renderSingleMessage(message) {
  var roleName = message.role === 'user' ? 'User' : 'Bot';
  var className = message.role === 'user' ? 'user-name' : 'bot-name';
  var renderedContent = render_codeblocks(message.content);
  return `<p><span class="${className}">${roleName}:</span> ${renderedContent}</p>`;
}

async function sendMessage() {
  var userMessageContent = document.getElementById('user_message').value;
  var userMessage = { role: 'user', content: userMessageContent };

  // Append to the existing chat
  chatHistories[currentChatIndex].messages.push(userMessage); 
  
  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: chatHistories[currentChatIndex].messages })
    });

    const data = await response.json();

    if (data.bot_message.error) {
      alert(data.bot_message.error);
    } else {
      const botMessage = { role: 'assistant', content: data.bot_message.content };
      chatHistories[currentChatIndex].messages.push(botMessage);
      localStorage.setItem('oldChats', JSON.stringify(chatHistories));
      renderChatHistory();
    }

  } catch (error) {
    console.error(error);
  }

  document.getElementById('user_message').value = '';
}

