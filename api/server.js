const axios = require('axios');

// index-DFplgPlr.js 等に含まれていた主要なインスタンスリスト
const INSTANCES = [
  'invidious.nerdvpn.de',
  'invidious.drgns.space',
  'invidious.privacydev.net',
  'yewtu.be',
  'iv.melmac.space',
  'invidious.no-logs.com'
];

export default async function handler(req, res) {
  // CORSヘッダーの設定（ブラウザから直接叩けるようにする）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  // インスタンスを順番に試行
  for (const domain of INSTANCES) {
    try {
      console.log(`Trying instance: ${domain}`);
      const response = await axios.get(`https://${domain}/api/v1/comments/${videoId}`, {
        timeout: 4000, // 4秒応答がなければ次へ
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // 成功したらデータを返して終了
      return res.status(200).json({
        source: domain,
        comments: response.data.comments || response.data
      });

    } catch (error) {
      console.error(`Failed with ${domain}: ${error.message}`);
      // 失敗した場合はループを継続して次のインスタンスへ
      continue;
    }
  }

  // 全て失敗した場合
  res.status(500).json({ error: 'All instances failed to respond.' });
}
