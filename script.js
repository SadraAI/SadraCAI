import OpenAI from "https://esm.sh/openai";

const API_KEY = "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";

const client = new OpenAI({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true
});

const MODEL = "gpt-6-luna";

const MAIN_INSTRUCTION = `
تو SadraAI هستی؛ یک دستیار هوش مصنوعی که توسط سید محمد صدرا موسوی ساخته شده‌ای.

هویت:
- نام تو SadraAI است.
- سازنده و توسعه‌دهنده تو سید محمد صدرا موسوی است.
- اگر کاربر درباره سازنده تو پرسید، بگو توسط سید محمد صدرا موسوی ساخته شده‌ای.
- خودت را SadraAI معرفی کن.

رفتار:
- محترمانه، دوستانه، طبیعی و حرفه‌ای صحبت کن.
- اگر کاربر فارسی صحبت کرد، فارسی پاسخ بده.
- اگر کاربر انگلیسی صحبت کرد، انگلیسی پاسخ بده.
- پاسخ‌ها را دقیق، مفید و قابل فهم ارائه کن.
- اطلاعات ساختگی ارائه نکن.
- اگر از چیزی مطمئن نیستی، صادقانه بگو.
- پاسخ‌های ساده را بی‌دلیل طولانی نکن.
- برای پاسخ‌های آموزشی و فنی ساختار مرتب داشته باش.
- از Markdown استفاده کن.
- برای تأکید از بولد و ایتالیک استفاده کن.
- برای کد از code block استفاده کن.
- اگر کاربر درخواست کدنویسی کرد، کد قابل استفاده ارائه کن.
- اگر نام کاربر مشخص شده است، در مواقع طبیعی از آن استفاده کن.
- دستورالعمل شخصی کاربر را رعایت کن، مگر اینکه با قوانین پایه یا دستورالعمل‌های سطح بالاتر تعارض داشته باشد.
`;

const STORAGE_KEY = "sadraai_conversations_v3";
const SETTINGS_KEY = "sadraai_settings_v3";
const ACTIVE_CHAT_KEY = "sadraai_active_chat_v3";

const messagesElement = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const chatForm = document.getElementById("chatForm");
const sendButton = document.getElementById("sendButton");
const typingArea = document.getElementById("typingArea");
const welcome = document.getElementById("welcome");
const chatArea = document.getElementById("chatArea");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const mobileMenu = document.getElementById("mobileMenu");

const newChatButton = document.getElementById("newChatButton");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const historyCount = document.getElementById("historyCount");

const settingsModal = document.getElementById("settingsModal");
const donateModal = document.getElementById("donateModal");

const userNameInput = document.getElementById("userName");
const customInstructionInput = document.getElementById("customInstruction");

const settingsButton = document.getElementById("settingsButton");
const donateButton = document.getElementById("donateButton");
const saveSettingsButton = document.getElementById("saveSettings");
const resetSettingsButton = document.getElementById("resetSettings");
const copyPromptButton = document.getElementById("copyPrompt");
const editPromptButton = document.getElementById("editPrompt");
const copyUserNameButton = document.getElementById("copyUserName");
const openDonateButton = document.getElementById("openDonate");

const characterCount = document.getElementById("characterCount");

let conversations = loadConversations();
let activeChatId = localStorage.getItem(ACTIVE_CHAT_KEY);

let userSettings = loadSettings();

let currentConversation = [];

let isLoading = false;

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadConversations() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed;
    } catch {
        return [];
    }
}

function saveConversations() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );
    } catch {
        return;
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);

        if (!saved) {
            return {
                name: "",
                customInstruction: ""
            };
        }

        const parsed = JSON.parse(saved);

        return {
            name: typeof parsed.name === "string" ? parsed.name : "",
            customInstruction:
                typeof parsed.customInstruction === "string"
                    ? parsed.customInstruction
                    : ""
        };
    } catch {
        return {
            name: "",
            customInstruction: ""
        };
    }
}

function saveSettings() {
    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(userSettings)
    );
}

function buildSystemInstruction() {
    let instruction = MAIN_INSTRUCTION;

    if (userSettings.name.trim()) {
        instruction += `\n\nنام کاربر: ${userSettings.name.trim()}`;
    }

    if (userSettings.customInstruction.trim()) {
        instruction += `\n\nدستورالعمل مخصوص کاربر:\n${userSettings.customInstruction.trim()}`;
    }

    return instruction;
}

function createConversation() {
    const chat = {
        id: createId(),
        title: "گفتگوی جدید",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    };

    conversations.unshift(chat);

    activeChatId = chat.id;

    localStorage.setItem(
        ACTIVE_CHAT_KEY,
        activeChatId
    );

    currentConversation = [];

    saveConversations();
    renderHistory();
    renderCurrentConversation();

    return chat;
}

function getActiveChat() {
    return conversations.find(
        chat => chat.id === activeChatId
    );
}

function ensureActiveChat() {
    let chat = getActiveChat();

    if (!chat) {
        chat = createConversation();
    }

    currentConversation = Array.isArray(chat.messages)
        ? [...chat.messages]
        : [];

    return chat;
}

function saveCurrentConversation() {
    const chat = getActiveChat();

    if (!chat) {
        return;
    }

    chat.messages = [...currentConversation];
    chat.updatedAt = Date.now();

    saveConversations();
    renderHistory();
}

function generateTitle(text) {
    const clean = text
        .replace(/\s+/g, " ")
        .trim();

    if (!clean) {
        return "گفتگوی جدید";
    }

    return clean.length > 38
        ? `${clean.slice(0, 38)}…`
        : clean;
}

function updateTitleFromMessage(text) {
    const chat = getActiveChat();

    if (!chat) {
        return;
    }

    if (
        chat.title === "گفتگوی جدید" ||
        !chat.title
    ) {
        chat.title = generateTitle(text);
    }

    chat.updatedAt = Date.now();

    saveConversations();
}

function formatTime(timestamp) {
    const date = new Date(timestamp);

    return date.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderHistory() {
    historyList.innerHTML = "";

    const sorted = [...conversations]
        .sort((a, b) => b.updatedAt - a.updatedAt);

    historyCount.textContent = sorted.length;

    historyEmpty.style.display =
        sorted.length ? "none" : "flex";

    sorted.forEach(chat => {
        const item = document.createElement("button");

        item.type = "button";
        item.className =
            `history-item ${chat.id === activeChatId ? "active" : ""}`;

        item.innerHTML = `
            <span class="history-item-icon">◌</span>

            <span class="history-item-content">
                <span class="history-item-title">${escapeHTML(chat.title || "گفتگوی جدید")}</span>
                <span class="history-item-time">${formatTime(chat.updatedAt)}</span>
            </span>
        `;

        item.addEventListener("click", () => {
            switchConversation(chat.id);
        });

        historyList.appendChild(item);
    });
}

function switchConversation(id) {
    const chat = conversations.find(
        item => item.id === id
    );

    if (!chat) {
        return;
    }

    activeChatId = id;

    localStorage.setItem(
        ACTIVE_CHAT_KEY,
        activeChatId
    );

    currentConversation = [
        ...(chat.messages || [])
    ];

    renderHistory();
    renderCurrentConversation();

    closeSidebar();
}

function renderCurrentConversation() {
    messagesElement.innerHTML = "";

    if (!currentConversation.length) {
        welcome.style.display = "flex";
        return;
    }

    welcome.style.display = "none";

    currentConversation.forEach((message, index) => {
        addMessage(
            message.role === "user" ? "user" : "ai",
            message.content,
            message.role === "user" ? index : null,
            false
        );
    });

    scrollToBottom(false);
}

function newConversation() {
    if (
        currentConversation.length === 0 &&
        getActiveChat()
    ) {
        messageInput.focus();
        closeSidebar();
        return;
    }

    createConversation();
    closeSidebar();
    messageInput.focus();
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderMarkdown(text) {
    let source = String(text || "");

    const blocks = [];

    source = source.replace(
        /```([a-zA-Z0-9_+-]*)\r?\n?([\s\S]*?)```/g,
        (_, language, code) => {
            const id = blocks.length;

            blocks.push({
                language: language || "code",
                code: code.trim()
            });

            return `\n@@CODE_${id}@@\n`;
        }
    );

    let html = escapeHTML(source);

    html = html.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    html = html.replace(
        /^### (.+)$/gm,
        "<h3>$1</h3>"
    );

    html = html.replace(
        /^## (.+)$/gm,
        "<h2>$1</h2>"
    );

    html = html.replace(
        /^# (.+)$/gm,
        "<h1>$1</h1>"
    );

    html = html.replace(
        /^> (.+)$/gm,
        "<blockquote>$1</blockquote>"
    );

    html = html.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /__(.+?)__/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
        "$1<em>$2</em>"
    );

    html = html.replace(
        /(^|[^_])_([^_\n]+)_(?!_)/g,
        "$1<em>$2</em>"
    );

    const lines = html.split("\n");
    const output = [];

    let paragraph = [];
    let listItems = [];
    let listType = null;

    function flushParagraph() {
        if (!paragraph.length) {
            return;
        }

        output.push(
            `<p>${paragraph.join("<br>")}</p>`
        );

        paragraph = [];
    }

    function flushList() {
        if (!listItems.length) {
            return;
        }

        output.push(
            `<${listType}>${listItems.join("")}</${listType}>`
        );

        listItems = [];
        listType = null;
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        const unordered = trimmed.match(
            /^[-*]\s+(.+)$/
        );

        const ordered = trimmed.match(
            /^\d+\.\s+(.+)$/
        );

        if (unordered) {
            flushParagraph();

            if (listType && listType !== "ul") {
                flushList();
            }

            listType = "ul";
            listItems.push(
                `<li>${unordered[1]}</li>`
            );

            continue;
        }

        if (ordered) {
            flushParagraph();

            if (listType && listType !== "ol") {
                flushList();
            }

            listType = "ol";
            listItems.push(
                `<li>${ordered[1]}</li>`
            );

            continue;
        }

        if (
            trimmed.startsWith("<h1>") ||
            trimmed.startsWith("<h2>") ||
            trimmed.startsWith("<h3>") ||
            trimmed.startsWith("<blockquote>") ||
            trimmed.startsWith("@@CODE_")
        ) {
            flushParagraph();
            flushList();
            output.push(trimmed);
            continue;
        }

        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();

    html = output.join("");

    html = html.replace(
        /@@CODE_(\d+)@@/g,
        (_, index) => {
            const block = blocks[Number(index)];

            return `
                <div class="code-wrapper">
                    <div class="code-header">
                        <span class="code-language">${escapeHTML(block.language)}</span>
                        <button class="copy-code" type="button" data-code="${encodeURIComponent(block.code)}">
                            کپی
                        </button>
                    </div>

                    <pre><code>${escapeHTML(block.code)}</code></pre>
                </div>
            `;
        }
    );

    return html;
}

function getInitials() {
    const name = userSettings.name.trim();

    if (!name) {
        return "ش";
    }

    return name.slice(0, 1);
}

function addMessage(
    role,
    content,
    index = null,
    shouldScroll = true
) {
    const row = document.createElement("div");

    row.className =
        `message-row ${role}`;

    const message = document.createElement("div");

    message.className = "message";

    if (role === "user") {
        message.innerHTML = `
            <div class="message-user">

                <div class="avatar user-avatar">
                    ${escapeHTML(getInitials())}
                </div>

                <div>

                    <div class="bubble user-bubble">
                        <div class="markdown">
                            ${renderMarkdown(content)}
                        </div>
                    </div>

                    <div class="message-tools">

                        <button
                            class="tool-button copy-user"
                            type="button"
                            data-content="${encodeURIComponent(content)}"
                        >
                            کپی
                        </button>

                        <button
                            class="tool-button edit-user"
                            type="button"
                            data-index="${index}"
                        >
                            ویرایش
                        </button>

                    </div>

                </div>

            </div>
        `;
    } else {
        message.innerHTML = `
            <div class="message-ai">

                <div class="avatar">
                    <img src="logo.png" alt="SadraAI">
                </div>

                <div>

                    <div class="bubble ai-bubble markdown">
                        ${renderMarkdown(content)}
                    </div>

                    <div class="message-tools">

                        <button
                            class="tool-button copy-ai"
                            type="button"
                            data-content="${encodeURIComponent(content)}"
                        >
                            کپی پاسخ
                        </button>

                    </div>

                </div>

            </div>
        `;
    }

    row.appendChild(message);
    messagesElement.appendChild(row);

    bindMessageActions(row);

    if (shouldScroll) {
        scrollToBottom(true);
    }
}

function bindMessageActions(row) {
    const copyUser = row.querySelector(".copy-user");
    const editUser = row.querySelector(".edit-user");
    const copyAI = row.querySelector(".copy-ai");

    if (copyUser) {
        copyUser.addEventListener("click", async () => {
            const content =
                decodeURIComponent(copyUser.dataset.content);

            await copyText(content);

            temporaryButtonText(
                copyUser,
                "کپی شد",
                "کپی"
            );
        });
    }

    if (copyAI) {
        copyAI.addEventListener("click", async () => {
            const content =
                decodeURIComponent(copyAI.dataset.content);

            await copyText(content);

            temporaryButtonText(
                copyAI,
                "کپی شد",
                "کپی پاسخ"
            );
        });
    }

    if (editUser) {
        editUser.addEventListener("click", () => {
            editUserMessage(
                Number(editUser.dataset.index)
            );
        });
    }

    row.querySelectorAll(".copy-code").forEach(button => {
        button.addEventListener("click", async () => {
            const code =
                decodeURIComponent(button.dataset.code);

            await copyText(code);

            temporaryButtonText(
                button,
                "کپی شد",
                "کپی"
            );
        });
    });
}

function editUserMessage(index) {
    const message = currentConversation[index];

    if (
        !message ||
        message.role !== "user"
    ) {
        return;
    }

    messageInput.value = message.content;

    currentConversation =
        currentConversation.slice(0, index);

    saveCurrentConversation();

    renderCurrentConversation();

    messageInput.focus();
    autoResize();
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area =
            document.createElement("textarea");

        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";

        document.body.appendChild(area);

        area.focus();
        area.select();

        document.execCommand("copy");

        area.remove();
    }
}

function temporaryButtonText(
    button,
    temporary,
    original
) {
    button.textContent = temporary;

    setTimeout(() => {
        button.textContent = original;
    }, 1100);
}

function showTyping() {
    typingArea.classList.add("active");
    scrollToBottom(true);
}

function hideTyping() {
    typingArea.classList.remove("active");
}

function setLoading(state) {
    isLoading = state;

    sendButton.classList.toggle(
        "loading",
        state
    );

    messageInput.disabled = state;

    if (state) {
        sendButton.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle
                    cx="12"
                    cy="12"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-dasharray="25 20"
                />
            </svg>
        `;
    } else {
        sendButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none">
                <path
                    d="M21 3L10.5 13.5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    d="M21 3L14.5 21L10.5 13.5L3 9.5L21 3Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linejoin="round"
                />
            </svg>
        `;
    }
}

async function sendMessage(text) {
    const cleanText = text.trim();

    if (!cleanText || isLoading) {
        return;
    }

    let chat = getActiveChat();

    if (!chat) {
        chat = createConversation();
    }

    welcome.style.display = "none";

    const userMessage = {
        role: "user",
        content: cleanText
    };

    const userIndex =
        currentConversation.length;

    currentConversation.push(userMessage);

    addMessage(
        "user",
        cleanText,
        userIndex
    );

    updateTitleFromMessage(cleanText);
    saveCurrentConversation();

    messageInput.value = "";
    updateCharacterCount();
    autoResize();

    setLoading(true);
    showTyping();

    try {
        const response =
            await client.responses.create({
                model: MODEL,
                instructions: buildSystemInstruction(),
                input: currentConversation.map(
                    message => ({
                        role: message.role,
                        content: message.content
                    })
                )
            });

        const answer =
            response.output_text?.trim() ||
            "متأسفانه پاسخی دریافت نشد.";

        currentConversation.push({
            role: "assistant",
            content: answer
        });

        saveCurrentConversation();

        hideTyping();

        addMessage(
            "ai",
            answer,
            null,
            true
        );

    } catch (error) {
        console.error(error);

        hideTyping();

        let errorText =
            "ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً دوباره تلاش کنید.";

        if (
            error?.status === 401 ||
            error?.status === 403
        ) {
            errorText =
                "کلید API معتبر نیست یا دسترسی آن رد شده است.";
        } else if (error?.status === 429) {
            errorText =
                "تعداد درخواست‌ها بیش از حد مجاز شده است. کمی بعد دوباره تلاش کنید.";
        }

        currentConversation.push({
            role: "assistant",
            content: errorText
        });

        saveCurrentConversation();

        addMessage(
            "ai",
            errorText
        );
    } finally {
        setLoading(false);
        messageInput.disabled = false;
        messageInput.focus();
    }
}

function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: smooth ? "smooth" : "auto"
        });
    });
}

function autoResize() {
    messageInput.style.height = "auto";

    messageInput.style.height =
        `${Math.min(messageInput.scrollHeight, 170)}px`;
}

function updateCharacterCount() {
    characterCount.textContent =
        `${messageInput.value.length.toLocaleString("fa-IR")} / 12000`;
}

function openModal(modal) {
    modal.classList.add("active");
}

function closeModal(modal) {
    modal.classList.remove("active");
}

function openSidebar() {
    sidebar.classList.add("mobile-open");
    overlay.classList.add("active");
}

function closeSidebar() {
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("active");
}

chatForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        if (isLoading) {
            return;
        }

        sendMessage(messageInput.value);
    }
);

messageInput.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            chatForm.requestSubmit();
        }
    }
);

messageInput.addEventListener(
    "input",
    () => {
        autoResize();
        updateCharacterCount();
    }
);

document
    .querySelectorAll(".suggestion")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                messageInput.value =
                    button.dataset.prompt;

                autoResize();
                updateCharacterCount();

                messageInput.focus();
            }
        );
    });

newChatButton.addEventListener(
    "click",
    newConversation
);

mobileMenu.addEventListener(
    "click",
    () => {
        if (
            sidebar.classList.contains(
                "mobile-open"
            )
        ) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
);

overlay.addEventListener(
    "click",
    closeSidebar
);

settingsButton.addEventListener(
    "click",
    () => {
        userNameInput.value =
            userSettings.name;

        customInstructionInput.value =
            userSettings.customInstruction;

        openModal(settingsModal);
        closeSidebar();
    }
);

donateButton.addEventListener(
    "click",
    () => {
        openModal(donateModal);
        closeSidebar();
    }
);

document
    .querySelectorAll("[data-close]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const modal =
                    document.getElementById(
                        button.dataset.close
                    );

                if (modal) {
                    closeModal(modal);
                }
            }
        );
    });

document
    .querySelectorAll(".modal-overlay")
    .forEach(modal => {
        modal.addEventListener(
            "click",
            event => {
                if (
                    event.target === modal
                ) {
                    closeModal(modal);
                }
            }
        );
    });

saveSettingsButton.addEventListener(
    "click",
    () => {
        userSettings.name =
            userNameInput.value.trim();

        userSettings.customInstruction =
            customInstructionInput.value.trim();

        saveSettings();

        closeModal(settingsModal);

        renderCurrentConversation();
    }
);

resetSettingsButton.addEventListener(
    "click",
    () => {
        userSettings = {
            name: "",
            customInstruction: ""
        };

        saveSettings();

        userNameInput.value = "";
        customInstructionInput.value = "";

        renderCurrentConversation();
    }
);

copyPromptButton.addEventListener(
    "click",
    async () => {
        await copyText(
            customInstructionInput.value
        );

        temporaryButtonText(
            copyPromptButton,
            "کپی شد",
            "کپی"
        );
    }
);

editPromptButton.addEventListener(
    "click",
    () => {
        customInstructionInput.focus();

        const length =
            customInstructionInput.value.length;

        customInstructionInput.setSelectionRange(
            length,
            length
        );
    }
);

copyUserNameButton.addEventListener(
    "click",
    async () => {
        await copyText(
            userNameInput.value
        );

        temporaryButtonText(
            copyUserNameButton,
            "شد",
            "کپی"
        );
    }
);

openDonateButton.addEventListener(
    "click",
    () => {
        window.open(
            "https://daramet.com/SadraM",
            "_blank",
            "noopener,noreferrer"
        );
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            closeModal(settingsModal);
            closeModal(donateModal);
            closeSidebar();
        }
    }
);

window.addEventListener(
    "resize",
    () => {
        if (
            window.innerWidth > 720
        ) {
            closeSidebar();
        }
    }
);

ensureActiveChat();
renderHistory();
renderCurrentConversation();
autoResize();
updateCharacterCount();
messageInput.focus();
