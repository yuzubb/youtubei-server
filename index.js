import express from 'express';
import { Innertube } from 'youtubei.js';
import NodeCache from 'node-cache';
import { format } from 'util';

const app = express();
const port = process.env.PORT || 3000;

const videoCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const formatViews = (count) => {
    if (count === undefined || count === null) return 'N/A';
    if (count >= 10000) {
        return format('%d万 回視聴', Math.floor(count / 10000));
    }
    return `${count} 回視聴`;
};

const formatLikes = (count) => {
    if (count === undefined || count === null) return 'N/A';
    if (count >= 10000) {
        return format('%d万', Math.floor(count / 10000));
    }
    return String(count);
};

const formatSubscribers = (count) => {
    if (count === undefined || count === null) return 'N/A';
    // Innertubeのサブスクライバー数は数値または文字列で取得されるため、文字列をクリーンアップ
    const cleanCount = String(count).replace(/[^0-9]/g, '');
    if (cleanCount === '') return 'N/A';
    return `チャンネル登録者数 ${formatLikes(Number(cleanCount))}人`;
};

const mapVideoInfo = (info) => {
    const basicInfo = info.basic_info || {};
    const channelInfo = basicInfo.channel?.basic_info || {};
    const descriptionText = basicInfo.short_description?.text || basicInfo.description?.text || '';
    
    // descriptionやrelatedは取得データから構造のみを再現し、中身は取得可能な情報で埋めます
    const description = {
        text: descriptionText,
        formatted: descriptionText.replace(/\n/g, '<br>'),
        run0: '', 
        run1: '',
        run2: '', 
        run3: ''
    };

    let related = [];
    const relatedVideos = info.contents?.related_videos || [];
    if (relatedVideos.length > 0) {
        const firstRelated = relatedVideos[0];
        related.push({
            badge: firstRelated.badges?.[0]?.text || '',
            title: firstRelated.title.text,
            channel: firstRelated.author.name,
            views: formatViews(firstRelated.view_count.text.replace(/[^0-9]/g, '')),
            uploaded: firstRelated.published || firstRelated.published_time.text,
            videoId: firstRelated.id,
            playlistId: '',
            thumbnail: firstRelated.thumbnails?.[0]?.url || ''
        });
    }

    return {
        id: basicInfo.id,
        title: basicInfo.title,
        views: formatViews(basicInfo.view_count),
        relativeDate: basicInfo.relative_time?.text || basicInfo.publish_date,
        likes: formatLikes(basicInfo.likes),
        author: {
            id: channelInfo.id,
            name: channelInfo.name,
            subscribers: formatSubscribers(channelInfo.subscribers?.text || 0),
            thumbnail: channelInfo.thumbnails?.[0]?.url || ''
        },
        description: description,
        related: related
    };
};

async function startServer() {
    const youtube = await Innertube.create();

    app.get('/', (req, res) => {
        res.send('youtubei.js Caching Server is running!');
    });

    app.get('/api/video2/:videoid', async (req, res) => {
        const videoId = req.params.videoid;
        const cacheKey = `video:${videoId}`;

        const cachedData = videoCache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        try {
            const info = await youtube.getInfo(videoId);

            const mappedData = mapVideoInfo(info);

            res.json(mappedData);

            videoCache.set(cacheKey, mappedData);

        } catch (error) {
            return res.status(error.statusCode || 500).json({
                error: 'Failed to fetch video data',
                message: error.message,
                videoId: videoId
            });
        }
    });

    app.listen(port, () => {});
}

startServer();
