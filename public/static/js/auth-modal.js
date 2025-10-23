// ============================================
// Authentication Modal
// ============================================

// Show login modal
const showLoginModal = () => {
  const modal = createModal(
    'ログイン / 新規登録',
    `
      <div id="auth-step-1">
        <p class="text-gray-600 mb-4">メールアドレスを入力してください。OTPコードを送信します。</p>
        <input 
          type="email" 
          id="auth-email" 
          placeholder="メールアドレス"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <button 
          onclick="sendOTP()"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          OTPコードを送信
        </button>
      </div>

      <div id="auth-step-2" class="hidden">
        <p class="text-gray-600 mb-4">メールに送信されたOTPコードを入力してください。</p>
        <p class="text-sm text-gray-500 mb-4">開発環境では、レスポンスに含まれる<code class="bg-gray-100 px-2 py-1 rounded">dev_otp</code>を使用してください。</p>
        <input 
          type="text" 
          id="auth-otp" 
          placeholder="OTPコード (6桁)"
          maxlength="6"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <div id="new-user-fields" class="hidden mb-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-blue-800 font-semibold mb-2">
              <i class="fas fa-info-circle mr-2"></i>初回登録
            </p>
            <p class="text-xs text-blue-700">
              新しいアカウントです。お名前とロールを入力してください。
            </p>
          </div>
          <input 
            type="text" 
            id="auth-name" 
            placeholder="お名前 (例: 山田太郎)"
            required
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
          />
          <select 
            id="auth-role"
            required
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">ロールを選択してください</option>
            <option value="org">🏢 主催者 (研修会社/企業の担当者)</option>
            <option value="instructor">👨‍🏫 講師 (研修を提供する講師)</option>
            <option value="learner">👨‍🎓 受講者 (研修を受講する方)</option>
          </select>
        </div>
        <button 
          onclick="verifyOTP()"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          ログイン / 登録
        </button>
        <button 
          onclick="backToStep1()"
          class="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
        >
          メールアドレスを変更
        </button>
      </div>

      <div id="auth-dev-info" class="hidden mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-sm text-yellow-800 font-semibold mb-2">📧 開発環境情報:</p>
        <div class="flex items-center space-x-2">
          <p class="text-sm text-yellow-700">OTPコード:</p>
          <span id="dev-otp-display" class="font-mono font-bold text-lg text-yellow-900 bg-yellow-100 px-3 py-1 rounded"></span>
          <button 
            onclick="copyOTP()"
            class="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
          >
            <i class="fas fa-copy mr-1"></i>コピー
          </button>
        </div>
        <p class="text-xs text-yellow-600 mt-2">※ 本番環境ではメールで送信されます</p>
      </div>
    `,
    []
  );
};

// Send OTP
const sendOTP = async () => {
  const email = document.getElementById('auth-email').value.trim();
  
  if (!email || !email.includes('@')) {
    showToast('有効なメールアドレスを入力してください', 'error');
    return;
  }

  showLoading('OTPコードを送信中...');

  try {
    const result = await authAPI.login(email);
    hideLoading();

    // Show dev OTP if available
    if (result.dev_otp) {
      document.getElementById('dev-otp-display').textContent = result.dev_otp;
      document.getElementById('auth-dev-info').classList.remove('hidden');
      
      // Auto-fill OTP in development
      document.getElementById('auth-otp').value = result.dev_otp;
    }

    // Move to step 2
    document.getElementById('auth-step-1').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('hidden');
    
    showToast('OTPコードを送信しました', 'success');
    
    // Store email for next step
    window.authEmail = email;
  } catch (error) {
    hideLoading();
    showToast(error.message || 'OTP送信に失敗しました', 'error');
  }
};

// Back to step 1
const backToStep1 = () => {
  document.getElementById('auth-step-2').classList.add('hidden');
  document.getElementById('auth-step-1').classList.remove('hidden');
  document.getElementById('auth-dev-info').classList.add('hidden');
  document.getElementById('new-user-fields').classList.add('hidden');
};

// Verify OTP
const verifyOTP = async () => {
  const email = window.authEmail;
  const code = document.getElementById('auth-otp').value.trim();
  
  if (!code || code.length !== 6) {
    showToast('6桁のOTPコードを入力してください', 'error');
    return;
  }

  // Check if we need to show new user fields
  const nameField = document.getElementById('auth-name');
  const roleField = document.getElementById('auth-role');
  
  const name = nameField?.value?.trim();
  const role = roleField?.value;

  console.log('[AUTH] Verifying OTP:', { email, code, name, role });

  showLoading('認証中...');

  try {
    const result = await authAPI.verify(email, code, name || undefined, role || undefined);
    console.log('[AUTH] Verification successful:', result);
    hideLoading();

    // Save auth data
    saveAuth(result.token, result.user);

    showToast(`ようこそ、${result.user.name}さん!`, 'success');

    // Close modal
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();

    // Redirect to appropriate dashboard
    setTimeout(() => {
      redirectToDashboard(result.user.role);
    }, 1000);
  } catch (error) {
    console.error('[AUTH] Verification failed:', error);
    hideLoading();
    
    // If error mentions name/role, show new user fields
    if (error.message.includes('Name and role') || error.message.includes('required for new users')) {
      const newUserFields = document.getElementById('new-user-fields');
      if (newUserFields) {
        newUserFields.classList.remove('hidden');
        showToast('新規ユーザーです。名前とロールを入力してください', 'warning');
      }
    } else {
      showToast(error.message || '認証に失敗しました', 'error');
    }
  }
};

// Logout
const logout = async () => {
  showLoading('ログアウト中...');
  
  try {
    await authAPI.logout();
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  clearAuth();
  hideLoading();
  showToast('ログアウトしました', 'success');
  
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
};

// Update header based on auth state
const updateAuthUI = () => {
  const user = getCurrentUser();
  const authButtons = document.getElementById('auth-buttons');
  
  if (!authButtons) return;

  if (user) {
    authButtons.innerHTML = `
      <div class="flex items-center space-x-4">
        <span class="text-gray-700">
          <i class="fas fa-user-circle mr-2"></i>
          ${user.name}
        </span>
        <button 
          onclick="redirectToDashboard('${user.role}')"
          class="px-4 py-2 text-blue-600 hover:text-blue-700"
        >
          ダッシュボード
        </button>
        <button 
          onclick="logout()"
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          ログアウト
        </button>
      </div>
    `;
  } else {
    authButtons.innerHTML = `
      <div class="flex space-x-4">
        <button onclick="showLoginModal()" class="px-4 py-2 text-blue-600 hover:text-blue-700">
          ログイン
        </button>
        <button onclick="showLoginModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新規登録
        </button>
      </div>
    `;
  }
};

// Copy OTP to clipboard
const copyOTP = () => {
  const otpText = document.getElementById('dev-otp-display').textContent;
  navigator.clipboard.writeText(otpText).then(() => {
    showToast('OTPコードをコピーしました', 'success');
  }).catch(() => {
    showToast('コピーに失敗しました', 'error');
  });
};

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);
