const express = require('express');
const { Innertube } = require('youtubei.js');

const app = express();
const PORT = 3000;

let youtube;

// Innertubeの初期化（起動時に一度だけ実行）
async function initYoutube() {
  youtube = await Innertube.create();
  console.log('YouTubei.js initialized');
}

app.get('/api/comment/:videoid', async (req, res) => {
  const videoId = req.params.videoid;

  try {
    if (!youtube) await initYoutube();

    // 動画情報を取得
    const video = await youtube.getInfo(videoId);
    
    // コメントセクションを取得
    const comments = await video.getComments();

    // 必要なデータのみを抽出して整形
    const responseData = comments.contents.map(comment => {
      return {
        channelName: comment.author.name,
        channelIcon: comment.author.thumbnails[0]?.url || '',
        channelId: comment.author.id,
        content: comment.content.toString()
      };
    });

    res.json({
      success: true,
      videoId: videoId,
      totalCount: responseData.length,
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  initYoutube();
});
