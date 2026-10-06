#

import OpenAI from "https://esm.sh/openai";

const API_KEY = "sk-LaeyhaCoQbErbti1iRzDkOctmCMwfUzgxTkF85bpGSg1D3Ki";

const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.gapgpt.app/v1",
    dangerouslyAllowBrowser: true
});

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
- پاسخ‌ها را دقیق و مفید ارائه کن.
- اطلاعات ساختگی ارائه نکن.
- اگر از چیزی مطمئن نیستی، صادقانه بگو.
- پاسخ‌های ساده را بی‌دلیل طولانی نکن.
- برای پاسخ‌های آموزشی و فنی ساختار مرتب داشته باش.
- از Markdown استفاده کن.
- برای تأکید از بولد و ایتالیک استفاده کن.
- برای کد از code block استفاده کن.
- اگر کاربر درخواست کدنویسی کرد، کد قابل استفاده ارائه کن.
- اگر نام کاربر مشخص شده است، در مواقع طبیعی از آن استفاده کن.
- دستورالعمل شخصی کاربر را نیز رعایت کن، مگر اینکه با قوانین پایه یا دستورالعمل‌های سطح بالاتر تعارض داشته باشد.
`;

const messagesElement = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const chatForm = document.getElementById("chatForm");
const sendButton = document.getElementById("sendButton");
const typingArea = document.getElementById("typingArea");
const welcome = document.getElementById("welcome");

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

let conversation = [];

let userSettings = {
    name: localStorage.getItem("sadraai_user_name") || "",
    customInstruction: localStorage.getItem("sadraai_custom_instruction") || ""
};

function buildSystemInstruction() {
    let instruction = MAIN_INSTRUCTION;

    if (userSettings.name.trim()) {
        instruction += `\n\nنام کاربر: ${userSettings.name.trim()}`;
    }

    if (userSettings.customInstruction.trim()) {
        instruction += `\n\nدستورالعمل مخصوص این کاربر:\n${userSettings.customInstruction.trim()}`;
    }

    return instruction;
}

function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderMarkdown(text) {
    let html = escapeHTML(text);

    const codeBlocks = [];

    html = html.replace(
        /```([\w-]*)\n?([\s\S]*?)```/g,
        (_, language, code) => {
            const index = codeBlocks.length;

            codeBlocks.push({
                language: language || "code",
                code: code.trim()
            });

            return `@@CODEBLOCK${index}@@`;
        }
    );

    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    html = html.replace(
        /^> (.*)$/gm,
        "<blockquote>$1</blockquote>"
    );

    html = html.replace(
        /^\s*[-*] (.*)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /(<li>.*<\/li>\n?)+/g,
        match => `<ul>${match}</ul>`
    );

    html = html.replace(
        /^\s*\d+\. (.*)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /__(.*?)__/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );

    html = html.replace(
        /_(.*?)_/g,
        "<em>$1</em>"
    );

    const lines = html.split("\n");
    const output = [];
    let paragraph = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            output.push(`<p>${paragraph.join("<br>")}</p>`);
            paragraph = [];
        }
    };

    for (const line of lines) {
        if (
            line.startsWith("<h1>") ||
            line.startsWith("<h2>") ||
            line.startsWith("<h3>") ||
            line.startsWith("<blockquote>") ||
            line.startsWith("<ul>") ||
            line.startsWith("@@CODEBLOCK")
        ) {
            flushParagraph();
            output.push(line);
        } else if (line.trim() === "") {
            flushParagraph();
        } else {
            paragraph.push(line);
        }
    }

    flushParagraph();

    html = output.join("");

    html = html.replace(
        /@@CODEBLOCK(\d+)@@/g,
        (_, index) => {
            const block = codeBlocks[index];

            return `
                <div class="code-wrapper">
                    <div class="code-header">
                        <span class="code-language">${escapeHTML(block.language)}</span>
                        <button class="copy-code" data-code="${encodeURIComponent(block.code)}">
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

function addMessage(role, content, index = null) {
    const row = document.createElement("div");

    row.className = `message-row ${role}`;

    const message = document.createElement("div");
    message.className = "message";

    if (role === "user") {
        message.innerHTML = `
            <div class="message-user">
                <div class="avatar user-avatar">${escapeHTML(getInitials())}</div>

                <div>
                    <div class="bubble user-bubble">
                        ${renderMarkdown(content)}
                    </div>

                    <div class="message-tools">
                        <button class="tool-button copy-user" data-content="${encodeURIComponent(content)}">
                            کپی
                        </button>

                        <button class="tool-button edit-user" data-index="${index}">
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
                        <button class="tool-button copy-ai" data-content="${encodeURIComponent(content)}">
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

    setTimeout(() => {
        row.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });
    }, 30);
}

function bindMessageActions(row) {
    const copyUser = row.querySelector(".copy-user");
    const editUser = row.querySelector(".edit-user");
    const copyAI = row.querySelector(".copy-ai");

    if (copyUser) {
        copyUser.addEventListener("click", async () => {
            const content = decodeURIComponent(copyUser.dataset.content);

            await copyText(content);

            copyUser.textContent = "کپی شد";

            setTimeout(() => {
                copyUser.textContent = "کپی";
            }, 1200);
        });
    }

    if (copyAI) {
        copyAI.addEventListener("click", async () => {
            const content = decodeURIComponent(copyAI.dataset.content);

            await copyText(content);

            copyAI.textContent = "کپی شد";

            setTimeout(() => {
                copyAI.textContent = "کپی پاسخ";
            }, 1200);
        });
    }

    if (editUser) {
        editUser.addEventListener("click", () => {
            const messageIndex = Number(editUser.dataset.index);
            const message = conversation[messageIndex];

            if (!message) return;

            messageInput.value = message.content;
            messageInput.focus();
            autoResize();

            conversation = conversation.slice(0, messageIndex);

            messagesElement.innerHTML = "";

            conversation.forEach((item, index) => {
                addMessage(
                    item.role === "user" ? "user" : "ai",
                    item.content,
                    item.role === "user" ? index : null
                );
            });

            welcome.style.display = "none";
        });
    }

    row.querySelectorAll(".copy-code").forEach(button => {
        button.addEventListener("click", async () => {
            const code = decodeURIComponent(button.dataset.code);

            await copyText(code);

            button.textContent = "کپی شد";

            setTimeout(() => {
                button.textContent = "کپی";
            }, 1200);
        });
    });
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
    }
}

function showTyping() {
    typingArea.classList.add("active");
    typingArea.scrollIntoView({
        behavior: "smooth",
        block: "end"
    });
}

function hideTyping() {
    typingArea.classList.remove("active");
}

function setLoading(state) {
    sendButton.classList.toggle("loading", state);
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
                <path d="M21 3L10.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M21 3L14.5 21L10.5 13.5L3 9.5L21 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        `;
    }
}

async function sendMessage(text) {
    const cleanText = text.trim();

    if (!cleanText) return;

    welcome.style.display = "none";

    const userIndex = conversation.length;

    conversation.push({
        role: "user",
        content: cleanText
    });

    addMessage("user", cleanText, userIndex);

    messageInput.value = "";
    autoResize();

    setLoading(true);
    showTyping();

    try {
        const response = await client.responses.create({
            model: "gapgpt-qwen-3.6",
            input: [
                {
                    role: "system",
                    content: buildSystemInstruction()
                },
                ...conversation
            ]
        });

        const answer =
            response.output_text ||
            "متأسفانه پاسخی دریافت نشد.";

        conversation.push({
            role: "assistant",
            content: answer
        });

        hideTyping();
        addMessage("ai", answer);

    } catch (error) {
        console.error(error);

        hideTyping();

        const errorText =
            "متأسفانه هنگام ارتباط با سرویس هوش مصنوعی مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";

        conversation.push({
            role: "assistant",
            content: errorText
        });

        addMessage("ai", errorText);
    } finally {
        setLoading(false);
        messageInput.disabled = false;
        messageInput.focus();
    }
}

chatForm.addEventListener("submit", event => {
    event.preventDefault();

    if (sendButton.classList.contains("loading")) {
        return;
    }

    sendMessage(messageInput.value);
});

messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

messageInput.addEventListener("input", autoResize);

function autoResize() {
    messageInput.style.height = "auto";
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 170) + "px";
}

document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
        messageInput.value = button.dataset.prompt;
        autoResize();
        messageInput.focus();
    });
});

settingsButton.addEventListener("click", () => {
    userNameInput.value = userSettings.name;
    customInstructionInput.value = userSettings.customInstruction;

    settingsModal.classList.add("active");
});

donateButton.addEventListener("click", () => {
    donateModal.classList.add("active");
});

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        const modal = document.getElementById(button.dataset.close);

        if (modal) {
            modal.classList.remove("active");
        }
    });
});

document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("active");
        }
    });
});

saveSettingsButton.addEventListener("click", () => {
    userSettings.name = userNameInput.value.trim();
    userSettings.customInstruction = customInstructionInput.value.trim();

    localStorage.setItem(
        "sadraai_user_name",
        userSettings.name
    );

    localStorage.setItem(
        "sadraai_custom_instruction",
        userSettings.customInstruction
    );

    settingsModal.classList.remove("active");
});

resetSettingsButton.addEventListener("click", () => {
    userSettings = {
        name: "",
        customInstruction: ""
    };

    localStorage.removeItem("sadraai_user_name");
    localStorage.removeItem("sadraai_custom_instruction");

    userNameInput.value = "";
    customInstructionInput.value = "";
});

copyPromptButton.addEventListener("click", async () => {
    await copyText(customInstructionInput.value);

    copyPromptButton.textContent = "کپی شد";

    setTimeout(() => {
        copyPromptButton.textContent = "کپی پرامپت";
    }, 1200);
});

editPromptButton.addEventListener("click", () => {
    customInstructionInput.focus();
    customInstructionInput.select();
});

copyUserNameButton.addEventListener("click", async () => {
    await copyText(userNameInput.value);

    copyUserNameButton.textContent = "شد";

    setTimeout(() => {
        copyUserNameButton.textContent = "کپی";
    }, 1200);
});

openDonateButton.addEventListener("click", () => {
    window.open(
        "https://daramet.com/SadraM",
        "_blank",
        "noopener,noreferrer"
    );
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        settingsModal.classList.remove("active");
        donateModal.classList.remove("active");
    }
});

messageInput.focus();
