// ============================================
// Authentication Modal
// ============================================

// Show login modal with authentication method selection
const showLoginModal = () => {
  const modal = createModal(
    'ログイン',
    `
      <div id="auth-method-selection">
        <p class="text-gray-600 mb-6 text-center">ログイン方法を選択してください</p>
        <div class="space-y-3">
          <button 
            onclick="showPasswordLogin()"
            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center"
          >
            <i class="fas fa-key mr-2"></i>
            パスワードでログイン
          </button>
          <button 
            onclick="showOTPLogin()"
            class="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold flex items-center justify-center"
          >
            <i class="fas fa-envelope mr-2"></i>
            OTPコードでログイン
          </button>
        </div>
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">アカウントをお持ちでない方</p>
          <button 
            onclick="showRegisterModal()"
            class="text-blue-600 hover:text-blue-700 font-semibold"
          >
            新規登録はこちら
          </button>
        </div>
      </div>

      <div id="password-login-form" class="hidden">
        <button onclick="backToMethodSelection()" class="text-gray-600 hover:text-gray-700 mb-4 flex items-center">
          <i class="fas fa-arrow-left mr-2"></i>戻る
        </button>
        <h3 class="text-lg font-semibold mb-4">パスワードでログイン</h3>
        <input 
          type="email" 
          id="password-login-email" 
          placeholder="メールアドレス"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <input 
          type="password" 
          id="password-login-password" 
          placeholder="パスワード"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <button 
          onclick="loginWithPassword()"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          ログイン
        </button>
        <div class="mt-4 text-center">
          <button 
            onclick="showPasswordResetModal()"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            パスワードをお忘れの方
          </button>
        </div>
      </div>

      <div id="otp-login-form" class="hidden">
        <button onclick="backToMethodSelection()" class="text-gray-600 hover:text-gray-700 mb-4 flex items-center">
          <i class="fas fa-arrow-left mr-2"></i>戻る
        </button>
        <div id="auth-step-1">
          <h3 class="text-lg font-semibold mb-4">OTPコードでログイン</h3>
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
            onclick="backToOTPStep1()"
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
      </div>
    `,
    []
  );
};

// Show register modal
const showRegisterModal = () => {
  const modal = createModal(
    '新規登録',
    `
      <div id="register-form">
        <h3 class="text-lg font-semibold mb-4">パスワードで新規登録</h3>
        <input 
          type="email" 
          id="register-email" 
          placeholder="メールアドレス"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <input 
          type="password" 
          id="register-password" 
          placeholder="パスワード (8文字以上、大小英字・数字を含む)"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <input 
          type="text" 
          id="register-name" 
          placeholder="お名前 (例: 山田太郎)"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <select 
          id="register-role"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        >
          <option value="">ロールを選択してください</option>
          <option value="org">🏢 主催者 (研修会社/企業の担当者)</option>
          <option value="instructor">👨‍🏫 講師 (研修を提供する講師)</option>
          <option value="learner">👨‍🎓 受講者 (研修を受講する方)</option>
        </select>
        <button 
          onclick="register()"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          登録
        </button>
        <div class="mt-4 text-center">
          <p class="text-sm text-gray-600">すでにアカウントをお持ちの方</p>
          <button 
            onclick="showLoginModal()"
            class="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ログインはこちら
          </button>
        </div>
      </div>
    `,
    []
  );
};

// Show password reset modal
const showPasswordResetModal = () => {
  const modal = createModal(
    'パスワードリセット',
    `
      <div id="reset-request-form">
        <p class="text-gray-600 mb-4">パスワードをリセットするために、登録済みのメールアドレスを入力してください。</p>
        <input 
          type="email" 
          id="reset-email" 
          placeholder="メールアドレス"
          class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
        />
        <button 
          onclick="requestPasswordReset()"
          class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
        >
          リセットリンクを送信
        </button>
        <div class="mt-4 text-center">
          <button 
            onclick="showLoginModal()"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            ログインに戻る
          </button>
        </div>
      </div>
    `,
    []
  );
};

// Navigation functions
const backToMethodSelection = () => {
  document.getElementById('password-login-form').classList.add('hidden');
  document.getElementById('otp-login-form').classList.add('hidden');
  document.getElementById('auth-method-selection').classList.remove('hidden');
};

const showPasswordLogin = () => {
  document.getElementById('auth-method-selection').classList.add('hidden');
  document.getElementById('password-login-form').classList.remove('hidden');
};

const showOTPLogin = () => {
  document.getElementById('auth-method-selection').classList.add('hidden');
  document.getElementById('otp-login-form').classList.remove('hidden');
};

const backToOTPStep1 = () => {
  document.getElementById('auth-step-2').classList.add('hidden');
  document.getElementById('auth-step-1').classList.remove('hidden');
  document.getElementById('auth-dev-info').classList.add('hidden');
  document.getElementById('new-user-fields').classList.add('hidden');
};

// Password login
const loginWithPassword = async () => {
  const email = document.getElementById('password-login-email').value.trim();
  const password = document.getElementById('password-login-password').value;
  
  if (!email || !email.includes('@')) {
    showToast('有効なメールアドレスを入力してください', 'error');
    return;
  }

  if (!password) {
    showToast('パスワードを入力してください', 'error');
    return;
  }

  showLoading('ログイン中...');

  try {
    const result = await authAPI.loginWithPassword(email, password);
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
    hideLoading();
    showToast(error.message || 'ログインに失敗しました', 'error');
  }
};

// Register with password
const register = async () => {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const name = document.getElementById('register-name').value.trim();
  const role = document.getElementById('register-role').value;

  if (!email || !email.includes('@')) {
    showToast('有効なメールアドレスを入力してください', 'error');
    return;
  }

  if (!password || password.length < 8) {
    showToast('パスワードは8文字以上である必要があります', 'error');
    return;
  }

  if (!name) {
    showToast('お名前を入力してください', 'error');
    return;
  }

  if (!role) {
    showToast('ロールを選択してください', 'error');
    return;
  }

  showLoading('登録中...');

  try {
    const result = await authAPI.register(email, password, name, role);
    hideLoading();

    // Save auth data
    saveAuth(result.token, result.user);

    showToast(`登録完了！ようこそ、${result.user.name}さん!`, 'success');

    // Close modal
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();

    // Redirect to appropriate dashboard
    setTimeout(() => {
      redirectToDashboard(result.user.role);
    }, 1000);
  } catch (error) {
    hideLoading();
    showToast(error.message || '登録に失敗しました', 'error');
  }
};

// Request password reset
const requestPasswordReset = async () => {
  const email = document.getElementById('reset-email').value.trim();
  
  if (!email || !email.includes('@')) {
    showToast('有効なメールアドレスを入力してください', 'error');
    return;
  }

  showLoading('リセットリンクを送信中...');

  try {
    const result = await authAPI.requestPasswordReset(email);
    hideLoading();

    showToast('リセットリンクを送信しました。メールをご確認ください。', 'success');

    // Show dev info if available
    if (result.dev_reset_url) {
      const modal = document.querySelector('.modal-content');
      const devInfo = document.createElement('div');
      devInfo.className = 'mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg';
      devInfo.innerHTML = `
        <p class="text-sm text-yellow-800 font-semibold mb-2">📧 開発環境情報:</p>
        <p class="text-xs text-yellow-700 mb-2">リセットURL:</p>
        <a href="${result.dev_reset_url}" class="text-xs text-blue-600 hover:text-blue-700 break-all">
          ${result.dev_reset_url}
        </a>
        <p class="text-xs text-yellow-600 mt-2">※ 本番環境ではメールで送信されます</p>
      `;
      modal.appendChild(devInfo);
    }

    // Close modal after delay
    setTimeout(() => {
      const modal = document.querySelector('.fixed.inset-0');
      if (modal) modal.remove();
    }, 5000);
  } catch (error) {
    hideLoading();
    showToast(error.message || 'リセットリンクの送信に失敗しました', 'error');
  }
};

// OTP functions
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

  showLoading('認証中...');

  try {
    const result = await authAPI.verify(email, code, name || undefined, role || undefined);
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
        <button onclick="showRegisterModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
