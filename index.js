import express from 'express';
import { Innertube } from 'youtubei.js';
import NodeCache from 'node-cache';

const app = express();
const port = process.env.PORT || 3000;

const videoCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// 失敗時/情報不足時に返す固定の空のレスポンス構造
const BLANK_RESPONSE = {
    id: null,
    title: null,
    views: 'N/A',
    relativeDate: null,
    likes: 'N/A',
    author: {
        id: null,
        name: null,
        subscribers: 'チャンネル登録者数 0人',
        thumbnail: ''
    },
    description: {
        text: '',
        formatted: '',
        run0: '',
        run1: '',
        run2: '',
        run3: ''
    },
    related: []
};

const formatViews = (count) => {
    if (count === undefined || count === null) return 'N/A';
    if (count >= 10000) {
        return `${Math.floor(count / 10000)}万 回視聴`;
    }
    return `${count} 回視聴`;
};

const formatLikes = (count) => {
    if (count === undefined || count === null) return 'N/A';
    if (count >= 10000) {
        return `${Math.floor(count / 10000)}万`;
    }
    return String(count);
};

const formatSubscribers = (count) => {
    if (count === undefined || count === null) return 'N/A';
    const cleanCount = String(count).replace(/[^0-9]/g, '');
    if (cleanCount === '') return 'チャンネル登録者数 0人'; 
    return `チャンネル登録者数 ${formatLikes(Number(cleanCount))}人`;
};

const mapVideoInfo = (info) => {
    const basicInfo = info.basic_info || {};
    const channelInfo = basicInfo.channel?.basic_info || {};
    const descriptionText = basicInfo.short_description?.text || basicInfo.description?.text || '';
    
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
        const relatedViewsText = firstRelated.view_count?.text || '0';
        const relatedViewsCount = relatedViewsText.match(/(\d+)/)?.[0]; 

        related.push({
            badge: firstRelated.badges?.[0]?.text || '',
            title: firstRelated.title?.text || 'N/A',
            channel: firstRelated.author?.name || 'N/A',
            views: formatViews(relatedViewsCount),
            uploaded: firstRelated.published || firstRelated.published_time?.text || 'N/A',
            videoId: firstRelated.id || 'N/A',
            playlistId: '',
            thumbnail: firstRelated.thumbnails?.[0]?.url || ''
        });
    }

    return {
        id: basicInfo.id || null,
        title: basicInfo.title || null,
        views: formatViews(basicInfo.view_count),
        relativeDate: basicInfo.relative_time?.text || basicInfo.publish_date || null,
        likes: formatLikes(basicInfo.likes),
        author: {
            id: channelInfo.id || null,
            name: channelInfo.name || null,
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
            // キャッシュがヒットした場合、そのまま返す (ステータス200)
            return res.json(cachedData);
        }

        try {
            const info = await youtube.getInfo(videoId);

            const mappedData = mapVideoInfo(info);

            // 成功レスポンスをクライアントに送信 (ステータス200)
            res.json(mappedData);

            // 成功した場合のみ、レスポンスをキャッシュに保存
            videoCache.set(cacheKey, mappedData);

        } catch (error) {
            // エラーが発生した場合 (動画が見つからないなど) はキャッシュせず、
            // ユーザー指定の空のJSON構造とステータス200を返す
            return res.status(200).json(BLANK_RESPONSE);
        }
    });

    app.listen(port, () => {});
}

startServer();
