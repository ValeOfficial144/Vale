<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { Send } from '@lucide/vue';
import { initializeChatSocket } from '@/js/socket.js';

const VORTEX_ORIGIN = 'https://vtx.chat';
const VORTEX_CLIENT_ID = import.meta.env.VITE_VORTEX_CLIENT_ID ?? 'vtx_your_client_id';
const VORTEX_LOGO = `${VORTEX_ORIGIN}/img/vortex_noglow.png`;

let cleanupChatSocket: (() => void) | undefined;

const vortexActive = ref(false);
const vortexSignedIn = ref(false);
const vortexSiteAllowed = ref(true);
const vortexCanSend = ref(false);
const vortexStatus = ref('');
const vortexMessages = ref<any[]>([]);
const vortexListEl = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLInputElement | null>(null);

let vortex: any = null;
let scriptPromise: Promise<void> | null = null;

function loadVortexScript(): Promise<void> {
    if ((window as any).Vortex) return Promise.resolve();
    scriptPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${VORTEX_ORIGIN}/sdk/v1/vortex.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Could Not Load'));
        document.head.appendChild(script);
    });
    return scriptPromise;
}

function scrollVortexToBottom() {
    nextTick(() => {
        const el = vortexListEl.value;
        if (el) el.scrollTop = el.scrollHeight;
    });
}

function onVortexMessage(msg: any) {
    vortexMessages.value.push(msg);
    vortexStatus.value = '';
    scrollVortexToBottom();
}

function onVortexEdit(msg: any) {
    const index = vortexMessages.value.findIndex((m) => m.id === msg.id);
    if (index !== -1) vortexMessages.value[index] = msg;
}

function onVortexDelete({ id }: { id: string }) {
    vortexMessages.value = vortexMessages.value.filter((m) => m.id !== id);
}

function onVortexLogout() {
    vortexSignedIn.value = false;
    vortexMessages.value = [];
}

async function startVortexSession() {
    vortexSignedIn.value = true;
    const channel = vortex.channels.find((c: any) => c.id === vortex.channel);
    vortexCanSend.value = !!channel?.canSend;
    try {
        const { messages } = await vortex.history();
        vortexMessages.value = messages;
        vortexStatus.value = '';
        scrollVortexToBottom();
    } catch (err: any) {
        vortexStatus.value = err.message;
    }
}

async function setupVortex() {
    try {
        await loadVortexScript();
        const w = window as any;
        vortex = w.__vortexClient ??= w.Vortex.init({ clientId: VORTEX_CLIENT_ID });
        vortex.on('message', onVortexMessage);
        vortex.on('edit', onVortexEdit);
        vortex.on('delete', onVortexDelete);
        vortex.on('logout', onVortexLogout);

        await vortex.ready;
        if (!vortex.site.allowed) {
            vortexSiteAllowed.value = false;
            vortexStatus.value = vortex.site.reason;
            return;
        }
        if (vortex.user) await startVortexSession();
    } catch (err: any) {
        vortexStatus.value = err.message;
    }
}

async function loginVortex() {
    if (!vortex) return;
    try {
        await vortex.login({ popup: true });
        await startVortexSession();
    } catch (err: any) {
        vortexStatus.value = err.message;
    }
}

function toggleVortex() {
    vortexActive.value = !vortexActive.value;
    if (vortexActive.value) scrollVortexToBottom();
    nextTick(() => messageInput.value?.focus());
}

async function onSubmitCapture(event: Event) {
    if (!vortexActive.value) return;
    event.preventDefault();
    event.stopPropagation();

    if (!vortex || !vortexSignedIn.value) {
        vortexStatus.value = 'Log In With Vortex To Chat.';
        return;
    }
    if (!vortexCanSend.value) {
        vortexStatus.value = "You Dont Have Permission To Chat Here.";
        return;
    }
    const input = messageInput.value;
    const text = input?.value.trim();
    if (!input || !text) return;
    try {
        await vortex.send(text);
        input.value = '';
        vortexStatus.value = '';
    } catch (err: any) {
        vortexStatus.value = err.message;
    }
}

function onTyping() {
    if (vortexActive.value && vortexSignedIn.value) vortex?.typing();
}

const isOwn = (msg: any) => !!vortex?.user && msg.author?.id === vortex.user.id;
const nameColor = (msg: any) => msg.author?.color?.match?.(/#[0-9a-f]{3,8}/i)?.[0];
const formatTime = (date: string | Date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

onMounted(() => {
    cleanupChatSocket = initializeChatSocket();
    setupVortex();
});

onUnmounted(() => {
    cleanupChatSocket?.();
    vortex?.off('message', onVortexMessage);
    vortex?.off('edit', onVortexEdit);
    vortex?.off('delete', onVortexDelete);
    vortex?.off('logout', onVortexLogout);
});
</script>
<template>
    <div class="chatPage" data-chat-root>
        <section class="chatRoom" id="chatRoom" inert @submit.capture="onSubmitCapture">
            <div class="chatMessage" id="chatMessages" role="log" aria-live="polite" v-show="!vortexActive">
                <p class="chatEmpty" id="chatEmpty">JOIN IN</p>
            </div>
            <div class="chatMessage vortexMessages" ref="vortexListEl" role="log" aria-live="polite" v-show="vortexActive">
                <div v-if="!vortexSignedIn" class="vortexGate">
                    <p class="vortexGateText">{{ vortexStatus || 'Log In With Vortex To Chat' }}</p>
                    <button
                        v-if="vortexSiteAllowed"
                        class="chatJoinButton"
                        type="button"
                        @click="loginVortex"
                    >Log In With Vortex</button>
                </div>
                <template v-else>
                    <p v-if="!vortexMessages.length && !vortexStatus" class="vortexGateText">No Messages Yet. Say Hi!</p>
                    <p v-if="vortexStatus" class="chatError" role="alert">{{ vortexStatus }}</p>
                    <div
                        v-for="msg in vortexMessages"
                        :key="msg.id"
                        class="message vortexMessage"
                        :class="isOwn(msg) ? 'user' : 'bot'"
                    >
                        <img v-if="msg.author?.avatar" class="vortexAvatar" :src="msg.author.avatar" alt="">
                        <div class="messageContent">
                            <div class="messageMeta">
                                <span class="messageName" :style="{ color: nameColor(msg) }">{{ msg.author?.username }}</span>
                                <span class="messageSeparator">·</span>
                                <span class="messageTime">{{ formatTime(msg.createdAt) }}</span>
                            </div>
                            <div class="messageBubble" v-html="msg.html"></div>
                        </div>
                    </div>
                </template>
            </div>
            <p class="chatError roomError" id="chatRoomError" role="alert" hidden></p>
            <form class="chatInputArea" id="chatMessageForm" hidden>
                <input
                    ref="messageInput"
                    class="chatMessageInput"
                    id="chatMessage"
                    name="message"
                    type="text"
                    maxlength="500"
                    :placeholder="vortexActive ? 'Message In Vortex...' : 'Message In Chat...'"
                    required
                    @input="onTyping"
                >
                <button
                    class="chatVortexButton"
                    :class="{ active: vortexActive }"
                    id="chatVortexButton"
                    type="button"
                    :aria-pressed="vortexActive"
                    :title="vortexActive ? 'Switch To Chat' : 'Switch To Vortex'"
                    aria-label="Vortex chat"
                    @click="toggleVortex"
                >
                    <img class="vortexLogo" :src="VORTEX_LOGO" alt="" draggable="false">
                </button>
                <button class="chatSendButton" id="chatSendButton" type="submit" aria-label="Send a message">
                    <Send class="sendIcon"/>
                </button>
            </form>
        </section>
        <section class="chatJoinPanel" id="chatJoinPanel">
            <div class="chatJoinCard">
                <h1 class="joinCardTitle" id="joinCardTitle">Join The Chat</h1>
                <p class="joinCardSubtitle">Create a Username & Password To Chat!</p>
                <form class="joinForm" id="chatJoinForm">
                    <span class="joinCardUsername" id="usernameText">Username</span>
                    <input
                        class="joinCardInput"
                        id="chatName"
                        name="username"
                        type="text"
                        maxlength="24"
                        autocomplete="username"
                        aria-labelledby="usernameText"
                        placeholder="User1234"
                        required
                        autofocus
                    >
                    <span class="joinCardUsername" id="passwordText">Password</span>
                    <input
                        class="joinCardInput"
                        id="chatPassword"
                        name="password"
                        type="password"
                        maxlength="64"
                        autocomplete="current-password"
                        aria-labelledby="passwordText"
                        placeholder="Password900"
                        required
                    >
                    <p class="chatError joinError" id="chatJoinError" role="alert"></p>
                    <button class="chatJoinButton" id="chatJoinButton" type="submit">Continue</button>
                </form>
            </div>
        </section>
    </div>
</template>
<style scoped>
  .chatPage{
    position:relative;
    display:flex;
    flex:1;
    min-height:0;
    min-width:0;
    width:100%;
    box-sizing:border-box;
  }
  
 .chatJoinButton{
    min-height:44px;
    padding:10px 14px;
   border:1px solid var(--sg-border);
    border-radius:6px;
   background:var(--sg-accent);
   color:var(--sg-text);
    font:inherit;
    font-weight:700;
    cursor:pointer;
    transition:filter 0.15s ease, opacity 0.15s ease;
  }
  .chatRoom{
    display:flex;
    flex:1;
    flex-direction:column;
    min-height:0;
    width:100%;
    color:var(--sg-text);
  }
  .chatError{
    color:var(--sg-text-muted);
    font-size:0.85rem;
  }
  .chatJoinPanel[hidden],
  .chatInputArea[hidden]{
    display:none;
  }
  :deep(.chatEmpty){
    margin:auto;
    color:var(--sg-text-muted);
    text-align:center;
  }
   .joinCardInput{
    min-width:0;
    padding:12px 14px;
    border:1px solid var(--sg-border);
    border-radius:10px;
    outline:none;
    background:var(--sg-surface-raised);
    color:var(--sg-text);
    font:inherit;
  }

  .joinCardInput::placeholder{
    color:var(--sg-text-muted);
  }

  .joinCardInput:focus{
    border-color:var(--sg-accent-soft);
    box-shadow:0 0 0 3px color-mix(in srgb, var(--sg-accent) 20%, transparent);
  }

  .chatInputArea{
    display:flex;
    gap:10px;
    align-items:center;
    flex-shrink:0;
    width:100%;
    box-sizing:border-box;
    padding:0 clamp(14px, 3vw, 32px) 20px;
    animation: fadeIn 200ms ease-out 200ms both;
  }
   .chatMessageInput{
    flex:1;
    min-width:0;
    resize:none;
    padding:12px 16px;
    border:2px solid var(--sg-border);
    border-radius:6px;
    background:var(--sg-surface);
    color:var(--sg-text);
    font-size:1rem;
    font-family:inherit;
    height:50px;
    max-height:50px;
    width:100%;
    overflow:hidden;
    box-sizing:border-box;
    line-height:26px;
  }

  .chatMessageInput:focus{
    outline:none;
  }

  .chatMessageInput::placeholder{
    color:var(--sg-text-muted);
    opacity:1;
  }

 .messageInput{
    min-width:0;
    padding:12px 14px;
    border:1px solid var(--sg-border);
    border-radius:10px;
    outline:none;
    background:var(--sg-surface-raised);
    color:var(--sg-text);
    font:inherit;
  }
  .messageInput::placeholder{
    color:var(--sg-text-muted);
  }
  .joinCardUsername{
    color:var(--sg-accent-light);
    font-size:0.9rem;
    font-weight:600;
  }
  .chatSendButton{
    display:flex;
    flex-shrink:0;
    align-items:center;
    justify-content:center;
    width:50px;
    height:50px;
    padding:0;
    box-sizing:border-box;
    border:2px solid var(--sg-border);
    border-radius:6px;
    background:var(--sg-surface);
    color:var(--sg-accent-soft);
    font-size:1.1rem;
    cursor:pointer;
    transition:all 0.2s;
  }
  
  .chatSendButton .sendIcon{
    color:var(--sg-text-muted);
  }

  .chatVortexButton{
    display:flex;
    flex-shrink:0;
    align-items:center;
    justify-content:center;
    width:50px;
    height:50px;
    padding:0;
    box-sizing:border-box;
    border:2px solid var(--sg-border);
    border-radius:6px;
    background:var(--sg-surface);
    color:var(--sg-text-muted);
    cursor:pointer;
    transition:all 0.2s;
  }

  .chatVortexButton:hover{
    border-color:var(--sg-accent-soft);
  }

  .chatVortexButton.active{
    border-color:var(--sg-accent-soft);
    background:color-mix(in srgb, var(--sg-accent) 25%, var(--sg-surface));
  }

  .chatVortexButton:focus-visible{
    outline:2px solid var(--sg-accent-soft);
    outline-offset:2px;
  }

  .vortexLogo{
    width:32px;
    height:32px;
    object-fit:contain;
    opacity:0.75;
    transition:opacity 0.2s;
    user-select:none;
  }

  .chatVortexButton:hover .vortexLogo,
  .chatVortexButton.active .vortexLogo{
    opacity:1;
  }

  .vortexGate{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:14px;
    margin:auto;
  }

  .vortexGateText{
    margin:0;
    color:var(--sg-text-muted);
    text-align:center;
  }

  .vortexAvatar{
    width:32px;
    height:32px;
    flex-shrink:0;
    border-radius:50%;
    object-fit:cover;
  }

  .vortexMessage .messageContent{
    min-width:0;
    max-width:100%;
  }

  .vortexMessage.user{
    flex-direction:row-reverse;
  }

  :deep(.vortex-mention){
    color:var(--sg-accent-light);
    font-weight:600;
  }

  :deep(.vortex-emote){
    height:1.4em;
    vertical-align:middle;
  }

  :deep(.messageBubble pre code){
    display:block;
    padding:8px;
    background:var(--sg-surface);
  }
  
  .joinCardTitle{
    margin:0 0 8px;
    font-size:1.35rem;
    font-weight:700;
    text-align:center;
  }
  .joinCardSubtitle{
    margin:0 0 22px;
    color:var(--sg-text-muted);
    line-height:1.55;
    text-align:center;
  }
  .joinForm{
    display:grid;
    gap:10px;
    width:100%;
    text-align:left;
  }
   .chatJoinCard{
    width:min(420px, 100%);
    box-sizing:border-box;
    padding:28px;
    border:1px solid var(--sg-border);
    border-radius:10px;
    background:var(--sg-surface);
    box-shadow:0 18px 48px var(--sg-shadow-strong);
    color:var(--sg-text);
    animation: fadeIn 200ms ease-out 400ms both;
  }
   .chatJoinPanel{
    position:absolute;
    inset:0;
    z-index:10;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:24px;
    box-sizing:border-box;
  }
  .chatMessage{
    display:flex;
    flex:1;
    flex-direction:column;
    gap:14px;
    min-height:0;
    overflow-y:auto;
    padding:24px clamp(14px, 3vw, 32px);
    scrollbar-color:color-mix(in srgb, var(--sg-accent-soft) 42%, transparent) transparent;
    scrollbar-width:thin;
    animation: fadeIn 200ms ease-out both;
  }
  .chatMessage[style*="display: none"]{
    flex:0;
  }
  .chatMessage::-webkit-scrollbar{
    width:8px;
  }
  .chatMessage::-webkit-scrollbar-thumb{
    border-radius: 4px;
    background:color-mix(in srgb, var(--sg-accent-soft) 38%, transparent);
  }
  .chatMessage::-webkit-scrollbar-thumb:hover{
    background:color-mix(in srgb, var(--sg-accent-light) 58%, transparent);
  }


  :deep(.message){
    display:flex;
    gap:12px;
    align-items:flex-end;
    max-width:min(78%, 760px);
  }
  
  :deep(.messageBubble){
    width:fit-content;
    max-width:100%;
    padding:12px 16px;
    border:1px solid var(--sg-border);
    border-radius:16px;
    word-wrap:break-word;
    white-space:pre-wrap;
    line-height:1.55;
    position:relative;
    background:var(--sg-surface-raised);
    box-shadow:0 1px 3px var(--sg-shadow-soft);
    color:var(--sg-text);
    user-select:text;
    -webkit-user-select:text;
    -moz-user-select:text;
    -ms-user-select:text;
    overflow-wrap:anywhere;
  }
  
  @media (max-width: 600px){
    .chatJoinPanel{
      padding:12px;
    }

    .chatJoinCard{
      padding:24px 20px;
    }

    .chatMessage{
      gap:11px;
      padding:16px 10px;
    }
    
    :deep(.messageBubble){
      padding:10px 14px;
      font-size:0.95rem;
    }

    .chatInputArea{
      gap:8px;
      padding:0 10px 12px;
    }

  }


  :deep(.message.user){
    margin-left:auto;
  }

  :deep(.message.bot){
    margin-right:auto;
  }

  :deep(.messageContent){
    min-width:0;
    max-width:100%;
  }

  :deep(.messageMeta){
    display:flex;
    align-items:baseline;
    gap:8px;
    margin:0 4px 5px;
    color:var(--sg-text-muted);
    font-size:0.78rem;
  }

  :deep(.messageName){
    color:var(--sg-text-muted);
    font-weight:600;
  }

  :deep(.messageTime){
    color:var(--sg-text-muted);
    font-size:0.75rem;
  }

  :deep(.messageSeparator){
    color:var(--sg-text-muted);
  }

  :deep(.message.user .messageMeta){
    justify-content:flex-end;
  }

  :deep(.message.user .messageBubble){
    margin-left:auto;
  }

  .chatSendButton:disabled{
    cursor:not-allowed;
    opacity:0.55;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chatMessage,
    .chatInputArea,
    .chatJoinCard {
      animation: none;
    }
  }
</style>
