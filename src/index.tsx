// ============================================
// AIMatch Campus - Main Application
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env } from './types';

// Import routes
import auth from './routes/auth';
import instructors from './routes/instructors';
import jobs from './routes/jobs';
import events from './routes/events';
import tags from './routes/tags';
import organizations from './routes/organizations';
import reviews from './routes/reviews';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

// API Routes
app.route('/api/auth', auth);
app.route('/api/instructors', instructors);
app.route('/api/jobs', jobs);
app.route('/api/events', events);
app.route('/api/tags', tags);
app.route('/api/organizations', organizations);
app.route('/api/reviews', reviews);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route - Landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AIMatch Campus - AI研修講師マッチングプラットフォーム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm">
            <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-graduation-cap text-blue-600 text-2xl"></i>
                        <span class="text-xl font-bold text-gray-900">AIMatch Campus</span>
                    </div>
                    <div class="hidden md:flex space-x-8">
                        <a href="#events" class="text-gray-700 hover:text-blue-600">イベント</a>
                        <a href="#jobs" class="text-gray-700 hover:text-blue-600">講師募集</a>
                        <a href="#instructors" class="text-gray-700 hover:text-blue-600">講師一覧</a>
                        <a href="#about" class="text-gray-700 hover:text-blue-600">概要</a>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="showLogin()" class="px-4 py-2 text-blue-600 hover:text-blue-700">
                            ログイン
                        </button>
                        <button onclick="showSignup()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            新規登録
                        </button>
                    </div>
                </div>
            </nav>
        </header>

        <!-- Hero Section -->
        <section class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 class="text-4xl md:text-5xl font-bold mb-6">
                    AI研修の主催者・講師・受講者をつなぐ<br>三者マッチングプラットフォーム
                </h1>
                <p class="text-xl mb-8 text-blue-100">
                    講師アサインから研修実施、成果測定まで一気通貫で支援
                </p>
                <div class="flex justify-center space-x-4">
                    <button onclick="showSignup()" class="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100">
                        今すぐ始める
                    </button>
                    <button onclick="scrollToAbout()" class="px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800">
                        詳しく見る
                    </button>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="about" class="py-16 bg-white">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl font-bold text-center mb-12">主な機能</h2>
                <div class="grid md:grid-cols-3 gap-8">
                    <div class="p-6 border rounded-lg hover:shadow-lg transition">
                        <div class="text-blue-600 text-3xl mb-4">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">講師マッチング</h3>
                        <p class="text-gray-600">
                            AIタグマッチングで最適な講師を推薦。スキル・業界・ツールで検索可能。
                        </p>
                    </div>
                    <div class="p-6 border rounded-lg hover:shadow-lg transition">
                        <div class="text-blue-600 text-3xl mb-4">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">イベント掲載</h3>
                        <p class="text-gray-600">
                            研修・ウェビナーを掲載し、受講者を集客。オンライン・オフライン対応。
                        </p>
                    </div>
                    <div class="p-6 border rounded-lg hover:shadow-lg transition">
                        <div class="text-blue-600 text-3xl mb-4">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2">2層レビュー</h3>
                        <p class="text-gray-600">
                            直後の満足度と30日後の業務適用度を測定し、真の成果を可視化。
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Stats Section -->
        <section class="py-16 bg-gray-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2" id="stats-instructors">0</div>
                        <div class="text-gray-600">登録講師数</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2" id="stats-events">0</div>
                        <div class="text-gray-600">開催イベント数</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2" id="stats-jobs">0</div>
                        <div class="text-gray-600">募集案件数</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2">4.8</div>
                        <div class="text-gray-600">平均評価</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-16 bg-blue-600 text-white">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 class="text-3xl font-bold mb-4">今すぐAIMatch Campusを始めましょう</h2>
                <p class="text-xl mb-8 text-blue-100">
                    主催者・講師・受講者、どの立場でも無料でご利用いただけます
                </p>
                <button onclick="showSignup()" class="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100">
                    無料で登録する
                </button>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 text-gray-400 py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p>&copy; 2025 AIMatch Campus. All rights reserved.</p>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // API Base URL
            const API_BASE = '/api';

            // Load stats
            async function loadStats() {
                try {
                    const [instructorsRes, eventsRes, jobsRes] = await Promise.all([
                        axios.get(API_BASE + '/instructors'),
                        axios.get(API_BASE + '/events'),
                        axios.get(API_BASE + '/jobs')
                    ]);
                    
                    document.getElementById('stats-instructors').textContent = instructorsRes.data.instructors.length;
                    document.getElementById('stats-events').textContent = eventsRes.data.events.length;
                    document.getElementById('stats-jobs').textContent = jobsRes.data.jobs.length;
                } catch (error) {
                    console.error('Failed to load stats:', error);
                }
            }

            function showLogin() {
                alert('ログインモーダルは実装中です。\\n\\nAPI経由でログインテストを行うには:\\n\\n1. POST /api/auth/login でOTPを送信\\n2. POST /api/auth/verify でOTPを検証');
            }

            function showSignup() {
                alert('登録モーダルは実装中です。\\n\\nAPI経由で登録テストを行うには:\\n\\n1. POST /api/auth/login { "email": "test@example.com" }\\n2. レスポンスのOTPコードを使用\\n3. POST /api/auth/verify { "email": "test@example.com", "code": "123456", "name": "山田太郎", "role": "org" }');
            }

            function scrollToAbout() {
                document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
            }

            // Load stats on page load
            loadStats();
        </script>
    </body>
    </html>
  `);
});

export default app;
