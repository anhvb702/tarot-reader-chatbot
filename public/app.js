import { tarotCards } from './tarot-data.js';

// --- Application State ---
let state = {
  question: '',
  situation: '',
  slots: [], // Array of slots: { index, positionName, card: null }
  activeSlotIndex: null,
  mode: 'physical', // 'physical' or 'digital'
  chatHistory: [],
  isInitialSubmitted: false,
};

// --- DOM Elements ---
const questionInput = document.getElementById('question');
const situationInput = document.getElementById('situation');
const btnSubmitInitial = document.getElementById('btnSubmitInitial');
const consoleBody = document.getElementById('consoleBody');
const initialFormContainer = document.getElementById('initialFormContainer');

const cardsPanel = document.getElementById('cardsPanel');
const cardsLayout = document.getElementById('cardsLayout');
const cardSelectorContainer = document.getElementById('cardSelectorContainer');
const cardSearchInput = document.getElementById('cardSearchInput');
const searchResults = document.getElementById('searchResults');
const orientationToggle = document.getElementById('orientationToggle');
const btnAddCardToSlot = document.getElementById('btnAddCardToSlot');
const activeSlotNameSpan = document.getElementById('activeSlotName');
const cardsPanelFooter = document.getElementById('cardsPanelFooter');
const btnDecodeSpread = document.getElementById('btnDecodeSpread');

const btnPhysicalMode = document.getElementById('btnPhysicalMode');
const btnDigitalMode = document.getElementById('btnDigitalMode');
const apiKeyModal = document.getElementById('apiKeyModal');
const btnDismissModal = document.getElementById('btnDismissModal');

// --- Helper Functions ---

// Simple Markdown to HTML Parser
function renderMarkdown(text) {
  // Replace carriage returns
  let cleanText = text.replace(/\r/g, '');
  
  // Split into lines for block processing
  const lines = cleanText.split('\n');
  let inList = false;
  let result = [];

  for (let line of lines) {
    // Trim whitespace for checking but preserve spaces inside line
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h3>${trimmed.substring(4)}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h2>${trimmed.substring(3)}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h1>${trimmed.substring(2)}</h1>`);
      continue;
    }

    // Bullet Lists
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) { result.push('<ul>'); inList = true; }
      // Inline formatting for the list item
      let content = parseInlineMarkdown(trimmed.substring(2));
      result.push(`<li>${content}</li>`);
      continue;
    }

    // Empty lines
    if (trimmed === '') {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push('<br>');
      continue;
    }

    // Regular paragraphs (if we were in a list, close it)
    if (inList) { result.push('</ul>'); inList = false; }
    
    let content = parseInlineMarkdown(line);
    result.push(`<p>${content}</p>`);
  }

  if (inList) { result.push('</ul>'); }

  return result.join('\n');
}

function parseInlineMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Inline Code `code`
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  return html;
}

// Write system message to console
function appendSystemMessage(id = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message system-msg';
  if (id) msgDiv.id = id;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  msgDiv.appendChild(contentDiv);
  
  consoleBody.appendChild(msgDiv);
  consoleBody.scrollTop = consoleBody.scrollHeight;
  return contentDiv;
}

// Write user message to console
function appendUserMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message user-msg';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  contentDiv.innerHTML = renderMarkdown(text);
  
  msgDiv.appendChild(contentDiv);
  consoleBody.appendChild(msgDiv);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

// Parse recommended spread count and slot positions from Reader's text
function parseSpreadRecommendation(text) {
  let count = 3; // default
  // Look for patterns like "3 lá", "trải bài 3 lá", "rút 4 lá", etc.
  const match = text.match(/(\d+)\s*(lá|quẻ|thiệp|cây)/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (parsed >= 1 && parsed <= 10) count = parsed;
  }
  
  // Propose positions
  let positions = [];
  if (count === 3) {
    positions = ["Quá khứ", "Hiện tại", "Tương lai"];
  } else if (count === 1) {
    positions = ["Tổng quan / Cốt lõi"];
  } else if (count === 2) {
    positions = ["Vấn đề hiện tại", "Trở ngại / Giải pháp"];
  } else if (count === 4) {
    positions = ["Hiện tại", "Trở ngại", "Lời khuyên", "Kết quả"];
  } else if (count === 5) {
    positions = ["Nguồn gốc", "Hiện tại", "Trở ngại", "Lời khuyên", "Kết quả"];
  } else {
    for (let i = 1; i <= count; i++) {
      positions.push(`Lá bài ${i}`);
    }
  }
  return { count, positions };
}

// Stream data from Express SSE API
async function streamChatResponse(payload, targetContainer, onCompleteCallback) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Lỗi kết nối vũ trụ.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // SSE format: data: {...}\n\n
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (dataStr === '[DONE]') {
            continue;
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.text) {
              accumulatedText += data.text;
              targetContainer.innerHTML = renderMarkdown(accumulatedText);
              consoleBody.scrollTop = consoleBody.scrollHeight;
            }
          } catch (e) {
            // Parsing or format errors
          }
        }
      }
    }

    if (onCompleteCallback) {
      onCompleteCallback(accumulatedText);
    }

  } catch (error) {
    console.error("Stream error:", error);
    targetContainer.innerHTML = `<p style="color: var(--crimson)"><strong>Cảnh báo từ vũ trụ:</strong> ${error.message}</p>`;
    // Show configuration warning if API Key error
    if (error.message.includes("API Key")) {
      apiKeyModal.classList.remove('hidden');
    }
  }
}

// --- Application Logic ---

// Submit initial Question & Context
async function handleInitialSubmit() {
  const question = questionInput.value.trim();
  const situation = situationInput.value.trim();

  if (!question || !situation) {
    alert("Hãy cung cấp đầy đủ câu hỏi và hoàn cảnh thực tế để Kẻ Dẫn Đường nhìn thấu.");
    return;
  }

  state.question = question;
  state.situation = situation;

  // Visual state updates
  questionInput.disabled = true;
  situationInput.disabled = true;
  btnSubmitInitial.disabled = true;
  initialFormContainer.classList.add('hidden');

  // Append user message
  appendUserMessage(`**Câu hỏi:** ${question}\n\n**Hoàn cảnh:** ${situation}`);

  // Create typing slot for chatbot
  const responseBubble = appendSystemMessage();
  responseBubble.innerHTML = `<span class="pulse-dot"></span> *Kẻ Dẫn Đường đang nhập định...*`;

  // Request proposal
  await streamChatResponse(
    { question, situation, isInitial: true },
    responseBubble,
    (fullText) => {
      // Parse suggested layout size
      const { count, positions } = parseSpreadRecommendation(fullText);
      setupCardSlots(count, positions);
      
      // Enable cards panel
      cardsPanel.classList.remove('disabled');
      state.isInitialSubmitted = true;
    }
  );
}

// Setup visual slots for cards based on count & position names
function setupCardSlots(count, positions) {
  cardsLayout.innerHTML = '';
  state.slots = [];
  
  for (let i = 0; i < count; i++) {
    const positionName = positions[i] || `Vị trí ${i + 1}`;
    const slot = {
      index: i,
      positionName: positionName,
      card: null
    };
    state.slots.push(slot);

    const slotDiv = document.createElement('div');
    slotDiv.className = 'card-slot';
    slotDiv.dataset.index = i;
    slotDiv.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <div class="slot-inner">
        <span class="slot-add-icon">+</span>
        <div class="slot-label">${positionName}</div>
        <div class="slot-desc">Chưa chọn bài</div>
      </div>
    `;

    slotDiv.addEventListener('click', () => selectSlot(i));
    cardsLayout.appendChild(slotDiv);
  }

  // Update Selector Mode UI
  updateSelectorMode();
}

// Select a slot to manually input a card
function selectSlot(index) {
  if (state.mode !== 'physical') return; // Cannot select slot manually in digital draw mode
  
  // Remove active styling from previous active slot
  const previousActive = cardsLayout.querySelector('.card-slot.active');
  if (previousActive) previousActive.classList.remove('active');

  state.activeSlotIndex = index;
  const slot = state.slots[index];
  
  // Highlight new slot
  const slotDiv = cardsLayout.querySelector(`.card-slot[data-index="${index}"]`);
  if (slotDiv) slotDiv.classList.add('active');

  // Update selector UI
  activeSlotNameSpan.textContent = `${index + 1} (${slot.positionName})`;
  cardSelectorContainer.classList.remove('hidden');
  cardSearchInput.value = slot.card ? slot.card.nameVi : '';
  orientationToggle.checked = slot.card ? slot.card.orientation === 'reversed' : false;
  cardSearchInput.focus();
}

// Update Search Results dropdown
function filterCards(query) {
  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filtered = tarotCards.filter(card => {
    const cardName = card.name.toLowerCase();
    const cardViNormalized = card.nameVi.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cardKeywords = (card.upright + ' ' + card.reversed).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return cardName.includes(cleanQuery) || 
           cardViNormalized.includes(cleanQuery) || 
           cardKeywords.includes(cleanQuery);
  }).slice(0, 5); // Limit to top 5 results

  if (filtered.length === 0) {
    searchResults.innerHTML = '<div class="search-item"><span class="search-item-vi">Không tìm thấy lá bài</span></div>';
  } else {
    searchResults.innerHTML = filtered.map(card => `
      <div class="search-item" data-id="${card.id}">
        <span class="search-item-vi">${card.nameVi}</span>
        <span class="search-item-en">${card.name}</span>
      </div>
    `).join('');

    // Attach click events
    searchResults.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const cardId = item.dataset.id;
        const selectedCard = tarotCards.find(c => c.id === cardId);
        if (selectedCard) {
          cardSearchInput.value = selectedCard.nameVi;
          cardSearchInput.dataset.selectedId = selectedCard.id;
          searchResults.classList.add('hidden');
        }
      });
    });
  }

  searchResults.classList.remove('hidden');
}

// Add selected card to the active slot
function placeCardInActiveSlot() {
  const activeIndex = state.activeSlotIndex;
  if (activeIndex === null) return;

  const cardId = cardSearchInput.dataset.selectedId;
  const cardObj = tarotCards.find(c => c.id === cardId);

  if (!cardObj) {
    alert("Vui lòng tìm và chọn một lá bài hợp lệ trong danh sách.");
    return;
  }

  const orientation = orientationToggle.checked ? 'reversed' : 'upright';
  
  // Set card in state
  state.slots[activeIndex].card = {
    ...cardObj,
    orientation: orientation
  };

  // Update visual slot element
  const slotDiv = cardsLayout.querySelector(`.card-slot[data-index="${activeIndex}"]`);
  slotDiv.className = 'card-slot placed';
  slotDiv.innerHTML = `
    <div class="slot-num">${activeIndex + 1}</div>
    <div class="slot-inner">
      <div class="slot-label">${state.slots[activeIndex].positionName}</div>
      <div class="card-title-vi">${cardObj.nameVi.split(' ')[0]}</div>
      <div class="card-title-en">${cardObj.name}</div>
      <div class="card-badge ${orientation}">${orientation === 'upright' ? 'Xuôi' : 'Ngược'}</div>
    </div>
  `;

  // Hide selector
  cardSelectorContainer.classList.add('hidden');
  state.activeSlotIndex = null;

  // Validate if all slots filled
  validateFormReadiness();
}

// Switch between physical/digital mode
function updateSelectorMode() {
  if (state.mode === 'physical') {
    btnPhysicalMode.classList.add('active');
    btnDigitalMode.classList.remove('active');
    cardSelectorContainer.classList.add('hidden');
    cardsPanelFooter.classList.remove('hidden');
    // Clear slots
    state.slots.forEach((s, idx) => {
      s.card = null;
      const slotDiv = cardsLayout.querySelector(`.card-slot[data-index="${idx}"]`);
      if (slotDiv) {
        slotDiv.className = 'card-slot';
        slotDiv.innerHTML = `
          <div class="slot-num">${idx + 1}</div>
          <div class="slot-inner">
            <span class="slot-add-icon">+</span>
            <div class="slot-label">${s.positionName}</div>
            <div class="slot-desc">Chưa chọn bài</div>
          </div>
        `;
      }
    });
  } else {
    btnPhysicalMode.classList.remove('active');
    btnDigitalMode.classList.add('active');
    cardSelectorContainer.classList.add('hidden');
    cardsPanelFooter.classList.remove('hidden');
    
    // Replace layout with a single Draw Button + visual list of blank slots
    cardsLayout.innerHTML = `
      <div class="w-full flex-col align-center" style="display:flex; flex-direction:column; align-items:center; gap: 1.5rem;">
        <button class="btn btn-glow" id="btnDigitalDraw" style="background: linear-gradient(135deg, var(--violet) 0%, #a83279 100%); color: #fff;">
          <span>Rút Bài Ngẫu Nhiên</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </button>
        <div class="flex-row" style="display:flex; justify-content:center; gap: 1rem; flex-wrap: wrap;" id="digitalSlotsContainer">
          ${state.slots.map((s, idx) => `
            <div class="card-slot" style="pointer-events: none;" data-index="${idx}">
              <div class="slot-num">${idx + 1}</div>
              <div class="slot-inner">
                <div class="slot-label">${s.positionName}</div>
                <div class="slot-desc">Đợi rút bài...</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btnDigitalDraw').addEventListener('click', handleDigitalDraw);
  }
  validateFormReadiness();
}

// Draw cards digitally & randomly
function handleDigitalDraw() {
  const digitalSlotsContainer = document.getElementById('digitalSlotsContainer');
  let shuffled = [...tarotCards].sort(() => 0.5 - Math.random());
  
  state.slots.forEach((slot, idx) => {
    const card = shuffled[idx];
    const orientation = Math.random() > 0.5 ? 'upright' : 'reversed';
    
    slot.card = {
      ...card,
      orientation: orientation
    };

    const slotDiv = digitalSlotsContainer.querySelector(`.card-slot[data-index="${idx}"]`);
    if (slotDiv) {
      slotDiv.className = 'card-slot placed';
      slotDiv.innerHTML = `
        <div class="slot-num">${idx + 1}</div>
        <div class="slot-inner">
          <div class="slot-label">${slot.positionName}</div>
          <div class="card-title-vi">${card.nameVi.split(' ')[0]}</div>
          <div class="card-title-en">${card.name}</div>
          <div class="card-badge ${orientation}">${orientation === 'upright' ? 'Xuôi' : 'Ngược'}</div>
        </div>
      `;
    }
  });

  validateFormReadiness();
}

// Enable or disable the final Decode button based on slot states
function validateFormReadiness() {
  const allFilled = state.slots.length > 0 && state.slots.every(s => s.card !== null);
  btnDecodeSpread.disabled = !allFilled;
}

// Submit drawn cards to get final reading
async function handleDecodeSpread() {
  if (btnDecodeSpread.disabled) return;

  btnDecodeSpread.disabled = true;
  cardsPanel.classList.add('disabled'); // Disable operations during reading

  // Construct message for chat window
  const cardNames = state.slots.map(s => `- **${s.positionName}:** ${s.card.nameVi} (${s.card.orientation === 'upright' ? 'Xuôi' : 'Ngược'})`).join('\n');
  appendUserMessage(`**Các lá bài rút được:**\n${cardNames}`);

  // Create typing slot for chatbot
  const responseBubble = appendSystemMessage();
  responseBubble.innerHTML = `<span class="pulse-dot"></span> *Kẻ Dẫn Đường đang kết nối với kết giới, giải mã các thông điệp từ vũ trụ...*`;

  // Payload for final reading
  const payload = {
    question: state.question,
    situation: state.situation,
    cards: state.slots.map(s => ({
      name: s.card.name,
      nameVi: s.card.nameVi,
      orientation: s.card.orientation,
      positionName: s.positionName
    })),
    isInitial: false
  };

  await streamChatResponse(
    payload,
    responseBubble,
    (fullText) => {
      // Completed! Allow user to restart or ask another question by showing the form again
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-secondary w-full';
      resetBtn.style.marginTop = '1rem';
      resetBtn.textContent = 'Trải Quẻ Bài Khác';
      resetBtn.addEventListener('click', restartChat);
      
      responseBubble.appendChild(resetBtn);
    }
  );
}

// Reset state and forms to start over
function restartChat() {
  state = {
    question: '',
    situation: '',
    slots: [],
    activeSlotIndex: null,
    mode: 'physical',
    chatHistory: [],
    isInitialSubmitted: false,
  };

  questionInput.value = '';
  situationInput.value = '';
  questionInput.disabled = false;
  situationInput.disabled = false;
  btnSubmitInitial.disabled = false;
  
  initialFormContainer.classList.remove('hidden');
  cardsPanel.classList.add('disabled');
  cardsLayout.innerHTML = `
    <div class="empty-layout-placeholder">
      <svg viewBox="0 0 100 120" width="80" height="96" class="floating-card-icon">
        <rect x="5" y="5" width="90" height="110" rx="8" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <circle cx="50" cy="60" r="15" fill="none" stroke="var(--gold)" stroke-width="1"/>
        <path d="M50,30 L50,90 M30,60 L70,60" stroke="var(--gold)" stroke-width="1"/>
      </svg>
      <p>Hãy gửi câu hỏi trước để nhận đề xuất trải bài.</p>
    </div>
  `;
  cardSelectorContainer.classList.add('hidden');
  cardsPanelFooter.classList.add('hidden');
  
  // Clear chat except first greeting
  consoleBody.innerHTML = `
    <div class="message system-msg">
      <div class="msg-content">
        <p class="reader-intro">"Chào linh hồn đang tìm kiếm ánh sáng hoặc đối mặt với bóng tối. Ta là Kẻ Dẫn Đường. Ta không ở đây để an ủi ngươi bằng những lời dối trá ngọt ngào. Ta đọc vị tương lai và hiện tại dựa trên sự thật trần trụi của các lá bài."</p>
        <p>Hãy chia sẻ với ta <strong>Câu hỏi</strong> ngươi khao khát có lời giải đáp và <strong>Hoàn cảnh thực tế</strong> của ngươi lúc này để vũ trụ định hình năng lượng.</p>
      </div>
    </div>
  `;
}

// --- Event Listeners ---

btnSubmitInitial.addEventListener('click', handleInitialSubmit);

btnPhysicalMode.addEventListener('click', () => {
  if (state.mode === 'physical') return;
  state.mode = 'physical';
  updateSelectorMode();
});

btnDigitalMode.addEventListener('click', () => {
  if (state.mode === 'digital') return;
  state.mode = 'digital';
  updateSelectorMode();
});

cardSearchInput.addEventListener('input', (e) => {
  filterCards(e.target.value);
});

// Close search dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.add('hidden');
  }
});

btnAddCardToSlot.addEventListener('click', placeCardInActiveSlot);
btnDecodeSpread.addEventListener('click', handleDecodeSpread);

btnDismissModal.addEventListener('click', () => {
  apiKeyModal.classList.add('hidden');
});
