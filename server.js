import express from 'express';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

let youtube;

async function initYoutube() {
  if (!youtube) {
    youtube = await Innertube.create();
    console.log('YouTubei.js initialized');
  }
  return youtube;
}

app.get('/api/comment/:videoid', async (req, res) => {
  const videoId = req.params.videoid;

  try {
    const yt = await initYoutube();
    
    // コメントデータの取得
    const commentData = await yt.getComments(videoId);

    // YouTubei.js の内部構造に合わせてマッピング
    const responseData = (commentData.contents || []).map(comment => {
      return {
        // author.name.toString() などで文字列を抽出
        channelName: comment.author?.name?.toString() || 'Unknown',
        // アイコンは thumbnails の中から適切なサイズを選択
        channelIcon: comment.author?.thumbnails?.[0]?.url || '',
        channelId: comment.author?.id || '',
        // comment.content は Text オブジェクトなので toString() が必要
        content: comment.content?.toString() || ''
      };
    });

    res.json({
      success: true,
      videoId: videoId,
      comments: responseData
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('YouTube Comment API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
