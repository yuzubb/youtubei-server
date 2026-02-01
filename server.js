import express from 'express';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

let youtube;

// 初期化関数
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
    
    // getComments(videoId) を直接呼び出すのが最新の安定した方法です
    const commentData = await yt.getComments(videoId);

    // 必要なデータのみを抽出
    const responseData = (commentData.contents || []).map(comment => {
      // YouTubei.js のコメントオブジェクト構造に対応
      return {
        channelName: comment.author?.name || 'Unknown',
        channelIcon: comment.author?.thumbnails[0]?.url || '',
        channelId: comment.author?.id || '',
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
