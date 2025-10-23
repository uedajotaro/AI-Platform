// ============================================
// Instructor Dashboard
// ============================================

let currentInstructor = null;

// Initialize dashboard
const initInstructorDashboard = async () => {
  if (!checkAuth() || !checkRole(['instructor'])) {
    return;
  }

  showLoading('ダッシュボードを読み込み中...');

  try {
    // Get current user
    const user = getCurrentUser();
    
    // Check if instructor profile exists
    const instructorsData = await instructorsAPI.list();
    currentInstructor = instructorsData.instructors.find(i => i.user_id === user.id);

    hideLoading();

    if (!currentInstructor) {
      showInstructorProfileForm();
    } else {
      renderInstructorDashboard();
    }
  } catch (error) {
    hideLoading();
    showToast('ダッシュボードの読み込みに失敗しました', 'error');
  }
};

// Show instructor profile form
const showInstructorProfileForm = () => {
  const container = document.getElementById('dashboard-content');
  
  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="bg-white rounded-lg shadow p-8">
        <h2 class="text-2xl font-bold mb-6">講師プロフィール作成</h2>
        <p class="text-gray-600 mb-8">講師として活動するには、まずプロフィールを作成してください。</p>
        
        <form id="instructor-profile-form" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ヘッドライン *</label>
            <input 
              type="text" 
              id="headline" 
              required
              placeholder="例: n8nで現場自動化の実装まで伴走"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">自己紹介 *</label>
            <textarea 
              id="bio" 
              rows="4" 
              required
              placeholder="経歴、得意分野、実績などを記載してください"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">スキル (複数選択可)</label>
            <div id="skills-checkboxes" class="grid grid-cols-2 md:grid-cols-3 gap-2"></div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">対応ツール (複数選択可)</label>
            <div id="tools-checkboxes" class="grid grid-cols-2 md:grid-cols-3 gap-2"></div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">対応業界 (複数選択可)</label>
            <div id="industries-checkboxes" class="grid grid-cols-2 md:grid-cols-3 gap-2"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">料金タイプ</label>
              <select id="rate-type" class="w-full px-4 py-2 border rounded-lg">
                <option value="per_session">セッション単位</option>
                <option value="per_hour">時間単位</option>
                <option value="per_day">日単位</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">最低料金 (円)</label>
              <input 
                type="number" 
                id="rate-min" 
                min="0"
                placeholder="60000"
                class="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">最高料金 (円)</label>
              <input 
                type="number" 
                id="rate-max" 
                min="0"
                placeholder="150000"
                class="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-4">
            <button 
              type="submit"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              プロフィールを作成
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Load tags and populate checkboxes
  loadTagsForForm();

  // Handle form submission
  document.getElementById('instructor-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitInstructorProfile();
  });
};

// Load tags for form
const loadTagsForForm = async () => {
  try {
    const tagsData = await tagsAPI.list();
    const tags = tagsData.tags;

    // Render skills checkboxes
    const skillsContainer = document.getElementById('skills-checkboxes');
    if (tags.theme) {
      skillsContainer.innerHTML = tags.theme.map(tag => `
        <label class="flex items-center space-x-2">
          <input type="checkbox" value="${tag.slug}" class="skill-checkbox">
          <span class="text-sm">${tag.name}</span>
        </label>
      `).join('');
    }

    // Render tools checkboxes
    const toolsContainer = document.getElementById('tools-checkboxes');
    if (tags.tool) {
      toolsContainer.innerHTML = tags.tool.map(tag => `
        <label class="flex items-center space-x-2">
          <input type="checkbox" value="${tag.slug}" class="tool-checkbox">
          <span class="text-sm">${tag.name}</span>
        </label>
      `).join('');
    }

    // Render industries checkboxes
    const industriesContainer = document.getElementById('industries-checkboxes');
    if (tags.industry) {
      industriesContainer.innerHTML = tags.industry.map(tag => `
        <label class="flex items-center space-x-2">
          <input type="checkbox" value="${tag.slug}" class="industry-checkbox">
          <span class="text-sm">${tag.name}</span>
        </label>
      `).join('');
    }
  } catch (error) {
    showToast('タグの読み込みに失敗しました', 'error');
  }
};

// Submit instructor profile
const submitInstructorProfile = async () => {
  const headline = document.getElementById('headline').value.trim();
  const bio = document.getElementById('bio').value.trim();
  const rateType = document.getElementById('rate-type').value;
  const rateMin = parseInt(document.getElementById('rate-min').value) || null;
  const rateMax = parseInt(document.getElementById('rate-max').value) || null;

  const skills = Array.from(document.querySelectorAll('.skill-checkbox:checked'))
    .map(cb => cb.value);
  const tools = Array.from(document.querySelectorAll('.tool-checkbox:checked'))
    .map(cb => cb.value);
  const industries = Array.from(document.querySelectorAll('.industry-checkbox:checked'))
    .map(cb => cb.value);

  if (!headline || !bio) {
    showToast('ヘッドラインと自己紹介は必須です', 'error');
    return;
  }

  showLoading('プロフィールを作成中...');

  try {
    await instructorsAPI.create({
      headline,
      bio,
      skills,
      tools,
      industries,
      rate_type: rateType,
      rate_min: rateMin,
      rate_max: rateMax,
      availability_json: {
        mon: [9, 18],
        tue: [9, 18],
        wed: [9, 18],
        thu: [9, 18],
        fri: [9, 18]
      }
    });

    hideLoading();
    showToast('プロフィールを作成しました!審査完了までお待ちください。', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 2000);
  } catch (error) {
    hideLoading();
    showToast(error.message || 'プロフィールの作成に失敗しました', 'error');
  }
};

// Render instructor dashboard
const renderInstructorDashboard = () => {
  const container = document.getElementById('dashboard-content');
  
  container.innerHTML = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">講師ダッシュボード</h1>
      <p class="text-gray-600">ようこそ、${getCurrentUser().name}さん</p>
    </div>

    <!-- Profile Status -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold mb-2">プロフィールステータス</h3>
          <p class="text-gray-600">${currentInstructor.headline}</p>
        </div>
        <div>
          ${currentInstructor.verified ? 
            '<span class="badge badge-green"><i class="fas fa-check-circle mr-2"></i>認証済み</span>' :
            '<span class="badge badge-yellow"><i class="fas fa-clock mr-2"></i>審査中</span>'
          }
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow mb-8">
      <div class="border-b">
        <nav class="flex space-x-8 px-6" id="dashboard-tabs">
          <button onclick="showInstructorTab('recommended')" class="dashboard-tab active py-4 border-b-2 border-blue-600 font-semibold text-blue-600">
            推薦募集
          </button>
          <button onclick="showInstructorTab('applications')" class="dashboard-tab py-4 border-b-2 border-transparent font-semibold text-gray-600 hover:text-gray-900">
            応募履歴
          </button>
          <button onclick="showInstructorTab('profile')" class="dashboard-tab py-4 border-b-2 border-transparent font-semibold text-gray-600 hover:text-gray-900">
            プロフィール編集
          </button>
        </nav>
      </div>
      <div id="tab-content" class="p-6"></div>
    </div>
  `;

  // Show default tab
  showInstructorTab('recommended');
};

// Show instructor tab
const showInstructorTab = (tabName) => {
  // Update tab styles
  document.querySelectorAll('.dashboard-tab').forEach(tab => {
    tab.classList.remove('active', 'border-blue-600', 'text-blue-600');
    tab.classList.add('border-transparent', 'text-gray-600');
  });
  event?.target.classList.add('active', 'border-blue-600', 'text-blue-600');
  event?.target.classList.remove('border-transparent', 'text-gray-600');

  const content = document.getElementById('tab-content');
  
  switch(tabName) {
    case 'recommended':
      loadRecommendedJobs(content);
      break;
    case 'applications':
      loadApplications(content);
      break;
    case 'profile':
      loadProfileEdit(content);
      break;
  }
};

// Load recommended jobs
const loadRecommendedJobs = async (container) => {
  container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i></div>';

  try {
    const data = await instructorsAPI.recommendedJobs(currentInstructor.id);
    
    if (data.recommended_jobs.length === 0) {
      container.innerHTML = renderEmptyState(
        'fas fa-briefcase',
        '推薦募集がありません',
        'あなたのスキルに合った募集が見つかり次第、ここに表示されます'
      );
      return;
    }

    container.innerHTML = `
      <div class="space-y-4">
        ${data.recommended_jobs.map(job => `
          <div class="border rounded-lg p-6 hover:shadow-md transition">
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">${job.title}</h3>
                <p class="text-gray-600 mb-3">${truncate(job.description, 150)}</p>
                <div class="flex flex-wrap gap-2 mb-3">
                  ${renderTags(job.theme_tags, 'badge-blue')}
                  ${renderTags(job.tool_tags, 'badge-green')}
                  ${renderTags(job.industry_tags, 'badge-purple')}
                </div>
              </div>
              <div class="text-right ml-4">
                <div class="text-sm text-gray-500 mb-2">マッチ度</div>
                <div class="text-2xl font-bold text-blue-600">${Math.round(job.match_score * 100)}%</div>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <div class="text-gray-700">
                <i class="fas fa-yen-sign mr-2"></i>
                ${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}
              </div>
              <button 
                onclick="applyToJob(${job.id})"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                応募する
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = renderEmptyState(
      'fas fa-exclamation-triangle',
      'エラーが発生しました',
      error.message
    );
  }
};

// Apply to job
const applyToJob = (jobId) => {
  const modal = createModal(
    '募集に応募',
    `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">カバーレター</label>
          <textarea 
            id="cover-letter"
            rows="6"
            placeholder="応募の動機や実績などを記載してください"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          ></textarea>
        </div>
      </div>
    `,
    [
      {
        text: 'キャンセル',
        className: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
        onclick: `this.closest('.fixed').remove()`
      },
      {
        text: '応募する',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        onclick: `submitApplication(${jobId})`
      }
    ]
  );
};

// Submit application
const submitApplication = async (jobId) => {
  const coverLetter = document.getElementById('cover-letter').value.trim();

  if (!coverLetter) {
    showToast('カバーレターを入力してください', 'error');
    return;
  }

  showLoading('応募を送信中...');

  try {
    await instructorsAPI.apply(currentInstructor.id, jobId, coverLetter);
    hideLoading();
    showToast('応募を送信しました!', 'success');
    
    document.querySelector('.fixed.inset-0').remove();
    
    // Refresh recommended jobs
    showInstructorTab('recommended');
  } catch (error) {
    hideLoading();
    showToast(error.message || '応募の送信に失敗しました', 'error');
  }
};

// Load applications (stub)
const loadApplications = (container) => {
  container.innerHTML = renderEmptyState(
    'fas fa-file-alt',
    '応募履歴機能は準備中です',
    '近日公開予定'
  );
};

// Load profile edit (stub)
const loadProfileEdit = (container) => {
  container.innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-blue-900 mb-2">プロフィール編集機能</h3>
      <p class="text-blue-700">プロフィールの編集機能は近日公開予定です。現在のプロフィール情報:</p>
      <div class="mt-4 space-y-2 text-sm">
        <p><strong>ヘッドライン:</strong> ${currentInstructor.headline}</p>
        <p><strong>スキル:</strong> ${currentInstructor.skills.join(', ')}</p>
        <p><strong>ツール:</strong> ${currentInstructor.tools.join(', ')}</p>
        <p><strong>業界:</strong> ${currentInstructor.industries.join(', ')}</p>
      </div>
    </div>
  `;
};

// Initialize on page load
if (window.location.pathname === '/instructor') {
  document.addEventListener('DOMContentLoaded', initInstructorDashboard);
}
