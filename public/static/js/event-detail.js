// ============================================
// Event Detail & Ticket Purchase
// ============================================

// Initialize event detail page
const initEventDetail = async () => {
  // Get event ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = window.location.pathname.split('/')[2];

  if (!eventId) {
    showToast('イベントIDが見つかりません', 'error');
    return;
  }

  // Check if user is logged in
  const user = getCurrentUser();
  if (!user) {
    showToast('チケットを購入するにはログインが必要です', 'warning');
    setTimeout(() => showLoginModal(), 2000);
    return;
  }

  // Load event details
  try {
    showLoading('イベント情報を読み込んでいます...');
    const { event } = await eventsAPI.get(eventId);
    hideLoading();

    displayEventDetail(event);
  } catch (error) {
    hideLoading();
    showToast(error.message || 'イベント情報の読み込みに失敗しました', 'error');
  }
};

// Display event details
const displayEventDetail = (event) => {
  const container = document.getElementById('event-detail-container');
  if (!container) return;

  const formattedPrice = formatCurrency(event.price);
  const formattedDate = formatDate(event.start_at);
  const soldOut = event.tickets_available <= 0;

  container.innerHTML = `
    <div class="max-w-4xl mx-auto py-8 px-4">
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <!-- Event Header -->
        <div class="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h1 class="text-3xl font-bold mb-2">${event.title}</h1>
          <div class="flex items-center space-x-4 text-blue-100">
            <span>
              <i class="fas fa-calendar mr-2"></i>
              ${formattedDate}
            </span>
            <span>
              <i class="fas fa-${event.format === 'online' ? 'video' : 'building'} mr-2"></i>
              ${event.format === 'online' ? 'オンライン' : '対面'}
            </span>
            <span>
              <i class="fas fa-users mr-2"></i>
              残り ${event.tickets_available}席
            </span>
          </div>
        </div>

        <!-- Event Content -->
        <div class="p-6">
          <!-- Description -->
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-3">研修内容</h2>
            <p class="text-gray-700 whitespace-pre-wrap">${event.description}</p>
          </div>

          <!-- Tags -->
          ${renderEventTags(event)}

          <!-- Price & Purchase -->
          <div class="mt-8 p-6 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-2xl font-bold text-gray-900">${formattedPrice}</h3>
                <p class="text-sm text-gray-600">参加費（税込）</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-semibold ${soldOut ? 'text-red-600' : 'text-green-600'}">
                  ${soldOut ? '満席' : `残り${event.tickets_available}席`}
                </p>
              </div>
            </div>

            ${soldOut ? `
              <button 
                disabled
                class="w-full py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
              >
                <i class="fas fa-times-circle mr-2"></i>
                満席のため購入できません
              </button>
            ` : `
              <button 
                onclick="purchaseTicket(${event.id})"
                class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                <i class="fas fa-ticket-alt mr-2"></i>
                チケットを購入する
              </button>
            `}
          </div>

          <!-- Organizer Info -->
          <div class="mt-6 pt-6 border-t">
            <h3 class="text-lg font-semibold mb-2">主催者</h3>
            <p class="text-gray-700">${event.org_name}</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Render event tags
const renderEventTags = (event) => {
  const tags = [
    ...(event.theme_tags || []),
    ...(event.tool_tags || []),
    ...(event.industry_tags || [])
  ];

  if (tags.length === 0) return '';

  return `
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3">タグ</h3>
      <div class="flex flex-wrap gap-2">
        ${tags.map(tag => `
          <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            ${tag}
          </span>
        `).join('')}
      </div>
    </div>
  `;
};

// Purchase ticket
const purchaseTicket = async (eventId) => {
  const user = getCurrentUser();
  
  if (!user) {
    showToast('ログインが必要です', 'error');
    showLoginModal();
    return;
  }

  if (user.role !== 'learner') {
    showToast('受講者アカウントでログインしてください', 'error');
    return;
  }

  // Show payment method selection modal
  const modal = createModal(
    'お支払い方法を選択',
    `
      <div class="space-y-4">
        <p class="text-gray-600 mb-4">お支払い方法を選択してください</p>
        <button 
          onclick="proceedToCheckout(${eventId}, 'card')"
          class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center"
        >
          <i class="fas fa-credit-card mr-2"></i>
          クレジットカード決済
        </button>
        <button 
          onclick="proceedToCheckout(${eventId}, 'invoice')"
          class="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold flex items-center justify-center"
        >
          <i class="fas fa-file-invoice mr-2"></i>
          請求書払い（法人向け）
        </button>
      </div>
    `,
    []
  );
};

// Proceed to checkout
const proceedToCheckout = async (eventId, paymentMethod) => {
  showLoading('決済ページに移動しています...');

  try {
    const result = await eventsAPI.checkout(eventId, paymentMethod);

    if (paymentMethod === 'card') {
      // Redirect to Stripe Checkout
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        hideLoading();
        showToast('決済URLの取得に失敗しました', 'error');
      }
    } else {
      // Invoice payment
      hideLoading();
      showToast('請求書払いの予約が完了しました', 'success');
      
      // Close modal
      const modal = document.querySelector('.fixed.inset-0');
      if (modal) modal.remove();

      // Show invoice info
      setTimeout(() => {
        alert(`チケット予約が完了しました。\n\nチケットID: ${result.ticket_id}\n\n請求書を送付しますので、お支払いをお願いします。`);
      }, 500);
    }
  } catch (error) {
    hideLoading();
    showToast(error.message || '決済処理に失敗しました', 'error');
  }
};

// Check for success/cancel query parameters
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('success') === 'true') {
    showToast('お支払いが完了しました！チケットが発行されました。', 'success');
  }
  
  if (urlParams.get('canceled') === 'true') {
    showToast('決済がキャンセルされました', 'warning');
  }
});
