// ==================== DOM 元素 ====================
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewGrid = document.getElementById('previewGrid');
const clearBtn = document.getElementById('clearBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const resultsGrid = document.getElementById('resultsGrid');

// ==================== 状态管理 ====================
let selectedFiles = [];
let uploadedImages = []; // 存储 base64 图片

// ==================== 事件监听 ====================
// 点击上传
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// 文件选择
fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

// 清除按钮
clearBtn.addEventListener('click', clearAll);

// 分析按钮
analyzeBtn.addEventListener('click', analyzeImages);

// ==================== 文件处理 ====================
function handleFiles(files) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxFiles = 5;
  const maxSize = 10 * 1024 * 1024; // 10MB

  Array.from(files).forEach((file, index) => {
    if (selectedFiles.length >= maxFiles) {
      showToast('最多只能上传 5 张照片');
      return;
    }

    if (!validTypes.includes(file.type)) {
      showToast('请上传图片文件 (JPG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > maxSize) {
      showToast('单张图片大小不能超过 10MB');
      return;
    }

    // 读取文件为 base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;

      // 检查是否重复上传
      if (uploadedImages.includes(base64Data)) {
        showToast('这张照片已经添加过了');
        return;
      }

      selectedFiles.push(file);
      uploadedImages.push(base64Data);
      renderPreview(base64Data, selectedFiles.length - 1);
      updateUI();
    };
    reader.readAsDataURL(file);
  });
}

function renderPreview(base64Data, index) {
  const previewItem = document.createElement('div');
  previewItem.className = 'preview-item';
  previewItem.style.animationDelay = `${index * 0.1}s`;
  previewItem.innerHTML = `
    <img src="${base64Data}" alt="预览图片 ${index + 1}">
    <button class="remove-btn" data-index="${index}">&times;</button>
  `;

  previewItem.querySelector('.remove-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    removeImage(index);
  });

  previewGrid.appendChild(previewItem);
}

function removeImage(index) {
  selectedFiles.splice(index, 1);
  uploadedImages.splice(index, 1);
  renderAllPreviews();
  updateUI();
}

function renderAllPreviews() {
  previewGrid.innerHTML = '';
  uploadedImages.forEach((base64Data, index) => {
    renderPreview(base64Data, index);
  });
}

function clearAll() {
  selectedFiles = [];
  uploadedImages = [];
  previewGrid.innerHTML = '';
  clearBtn.hidden = true;
  updateUI();
}

function updateUI() {
  const hasFiles = selectedFiles.length > 0;
  analyzeBtn.disabled = !hasFiles;
  clearBtn.hidden = !hasFiles;
  previewContainer.hidden = !hasFiles;
  resultSection.hidden = true;
  loadingSection.hidden = true;
}

// ==================== API 调用 ====================
async function analyzeImages() {
  if (uploadedImages.length === 0) {
    showToast('请先上传照片');
    return;
  }

  // 显示加载状态
  analyzeBtn.disabled = true;
  loadingSection.hidden = false;
  resultSection.hidden = true;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: uploadedImages,
        prompt: '分析这张照片中人物的特点，找出最相似的甄嬛传角色'
      })
    });

    const text = await response.text();
    console.log('Raw response:', text.substring(0, 500));

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`服务器错误 (${response.status}): ${text.substring(0, 100)}`);
    }

    // 检查是否返回了 HTML（错误页面）
    if (text.trim().startsWith('<') || !text.trim().startsWith('{')) {
      console.error('Non-JSON response:', text);
      throw new Error('服务器返回了错误页面，请检查部署配置');
    }

    const data = JSON.parse(text);

    console.log('API response:', data);

    // 显示结果 - 使用 data.characters
    displayResults(data.characters || data);

  } catch (error) {
    console.error('分析失败:', error);
    showError(error.message);
  } finally {
    analyzeBtn.disabled = false;
    loadingSection.hidden = true;
  }
}

function displayResults(data) {
  resultSection.hidden = false;
  resultsGrid.innerHTML = '';

  const characters = data.characters || [];

  if (characters.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128533;</div>
        <p>AI 暂时没找到相似的人物</p>
        <p>也许你比甄嬛还特别！</p>
      </div>
    `;
    return;
  }

  // 限制最多显示 5 个结果
  const topCharacters = characters.slice(0, 5);

  topCharacters.forEach((char, index) => {
    const rank = index + 1;
    const card = createResultCard(char, rank);
    resultsGrid.appendChild(card);

    // 触发进度条动画
    setTimeout(() => {
      const progressFill = card.querySelector('.progress-fill');
      const progressNumber = card.querySelector('.progress-number');
      progressFill.style.width = `${char.similarity}%`;
      progressNumber.textContent = `${char.similarity}%`;
    }, 300 + index * 200);
  });

  // 滚动到结果区域
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createResultCard(char, rank) {
  const card = document.createElement('div');
  card.className = `result-card rank-${rank}`;

  const tagsHtml = (char.tags || [])
    .slice(0, 3)
    .map(tag => `<span class="tag">#${tag}</span>`)
    .join('');

  const rankEmoji = rank === 1 ? '&#127941;' : rank === 2 ? '&#129352;' : '&#129353;';
  const rankText = rank === 1 ? '冠军' : rank === 2 ? '亚军' : '季军';

  // 使用占位头像（因为实际角色图片可能不存在）
  const avatarHtml = char.avatar
    ? `<img class="avatar" src="${char.avatar}" alt="${char.name}" onerror="this.outerHTML='<div class=\\'avatar-placeholder\\'>${char.name[0]}</div>'">`
    : `<div class="avatar-placeholder">${char.name[0]}</div>`;

  card.innerHTML = `
    <div class="card-header">
      <div class="rank-badge">${rank}</div>
      <div class="avatar-container">
        ${avatarHtml}
      </div>
      <div class="info">
        <div class="name">${char.name}</div>
        <div class="similarity">${rankEmoji} ${rankText}</div>
      </div>
    </div>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill"></div>
        <span class="progress-number">0%</span>
      </div>
    </div>

    <div class="card-body">
      <div class="tags">${tagsHtml}</div>
      <div class="comments">
        <div class="funny-comment">"${char.funny_comment || char.funnyComment || '这题你会！'}"</div>
        <div class="reason">${char.reason || '分析与理由'}</div>
      </div>
    </div>
  `;

  return card;
}

function showError(message) {
  resultsGrid.innerHTML = `
    <div class="error-message">
      <p>&#10060; 分析失败</p>
      <p>${message}</p>
      <p style="margin-top: 10px; font-size: 0.9rem;">请稍后重试，或联系管理员</p>
    </div>
  `;
  resultSection.hidden = false;
}

// ==================== 提示信息 ====================
function showToast(message) {
  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
    color: white;
    padding: 15px 30px;
    border-radius: 30px;
    font-size: 0.95rem;
    z-index: 10000;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease forwards;
    max-width: 80%;
    text-align: center;
  `;
  toast.textContent = message;

  // 添加动画样式
  if (!document.getElementById('toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes toastOut {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // 3秒后自动消失
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('甄嬛传人物相似度检测已就绪');
  updateUI();
});
