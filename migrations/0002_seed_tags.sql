-- ============================================
-- AIMatch Campus - Initial Tags Dictionary
-- ============================================

-- Theme tags (テーマタグ)
INSERT OR IGNORE INTO tags (kind, name, slug) VALUES 
  ('theme', '生成AI基礎', 'generative-ai-basics'),
  ('theme', 'プロンプトエンジニアリング', 'prompt-engineering'),
  ('theme', '社内規程・ガイドライン策定', 'internal-guidelines'),
  ('theme', 'ワークフロー自動化', 'workflow-automation'),
  ('theme', 'LLM評価・品質管理', 'llm-evaluation'),
  ('theme', 'RAG構築', 'rag-construction'),
  ('theme', 'カスタマーサポート自動化', 'customer-support-automation'),
  ('theme', 'コンテンツ生成', 'content-generation'),
  ('theme', 'データ分析・可視化', 'data-analysis'),
  ('theme', 'AI倫理・リスク管理', 'ai-ethics');

-- Tool tags (ツールタグ)
INSERT OR IGNORE INTO tags (kind, name, slug) VALUES 
  ('tool', 'ChatGPT / OpenAI', 'openai'),
  ('tool', 'Claude (Anthropic)', 'claude'),
  ('tool', 'Google Gemini / Vertex AI', 'vertex-ai'),
  ('tool', 'n8n', 'n8n'),
  ('tool', 'Dify', 'dify'),
  ('tool', 'Zapier', 'zapier'),
  ('tool', 'Google Apps Script', 'gas'),
  ('tool', 'Notion AI', 'notion-ai'),
  ('tool', 'Microsoft Copilot', 'copilot'),
  ('tool', 'LangChain', 'langchain'),
  ('tool', 'LlamaIndex', 'llamaindex'),
  ('tool', 'Pinecone', 'pinecone');

-- Industry tags (業界タグ)
INSERT OR IGNORE INTO tags (kind, name, slug) VALUES 
  ('industry', '人材・HR', 'hr'),
  ('industry', '介護・医療', 'healthcare'),
  ('industry', '小売・EC', 'retail'),
  ('industry', '製造・工場', 'manufacturing'),
  ('industry', '教育・EdTech', 'education'),
  ('industry', '士業 (会計・法律)', 'professional-services'),
  ('industry', '不動産', 'real-estate'),
  ('industry', '金融・保険', 'finance'),
  ('industry', 'IT・SaaS', 'it-saas'),
  ('industry', 'マーケティング・広告', 'marketing');

-- Outcome tags (成果タグ)
INSERT OR IGNORE INTO tags (kind, name, slug) VALUES 
  ('outcome', '作業時間削減', 'time-reduction'),
  ('outcome', 'コスト削減', 'cost-reduction'),
  ('outcome', '品質向上', 'quality-improvement'),
  ('outcome', 'エラー率低下', 'error-reduction'),
  ('outcome', '顧客満足度向上', 'csat-improvement'),
  ('outcome', 'リードタイム短縮', 'lead-time-reduction'),
  ('outcome', '従業員満足度向上', 'employee-satisfaction'),
  ('outcome', '売上増加', 'revenue-increase');
