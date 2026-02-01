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
    
    // 動画情報を取得
    const video = await yt.getInfo(videoId);
    
    // コメントセクションを取得
    const comments = await video.getComments();

    // 必要なデータのみを抽出
    const responseData = comments.contents.map(comment => ({
      channelName: comment.author.name,
      channelIcon: comment.author.thumbnails[0]?.url || '',
      channelId: comment.author.id,
      content: comment.content.toString()
    }));

    res.json({
      success: true,
      videoId: videoId,
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
