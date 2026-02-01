import express from 'express';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

let youtube;

async function initYoutube() {
  if (!youtube) {
    // 確実に最新のブラウザとして振る舞うよう初期化
    youtube = await Innertube.create();
    console.log('YouTubei.js initialized');
  }
  return youtube;
}

app.get('/api/comment/:videoid', async (req, res) => {
  const videoId = req.params.videoid;

  try {
    const yt = await initYoutube();
    
    // コメントを取得
    const commentData = await yt.getComments(videoId);

    // YouTubei.js の Comment オブジェクトから値を抽出
    const responseData = (commentData.contents || []).map(comment => {
      // コメント投稿者の情報
      const author = comment.author;
      
      return {
        // author.name.text または author.name.toString() で取得
        channelName: author?.name?.toString() || 'Unknown',
        // thumbnails配列の最後の要素が通常一番高画質
        channelIcon: author?.thumbnails?.at(-1)?.url || '',
        channelId: author?.id || '',
        // comment.content.toString() で全テキストを結合して取得
        content: comment.content?.toString() || ''
      };
    });

    res.json({
      success: true,
      videoId: videoId,
      count: responseData.length,
      comments: responseData
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('YouTube Comment API is active.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
