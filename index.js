const express = require('express');
const { YouTube } = require('youtubei');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;

const youtube = new YouTube();

const videoCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

app.get('/', (req, res) => {
    res.send('youtubei.js Caching Server is running!');
});

app.get('/api/video2/:videoid', async (req, res) => {
    const videoId = req.params.videoid;
    const cacheKey = `video:${videoId}`;

    const cachedData = videoCache.get(cacheKey);
    if (cachedData) {
        return res.json({
            source: 'cache',
            data: cachedData,
        });
    }

    try {
        const video = await youtube.getVideo(videoId);

        res.json({
            source: 'youtubei.js',
            data: video,
        });

        videoCache.set(cacheKey, video);

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            error: 'Failed to fetch video data',
            message: error.message,
            videoId: videoId
        });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
