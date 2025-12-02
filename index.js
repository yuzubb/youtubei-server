import express from 'express';
import { Innertube } from 'youtubei.js';
import NodeCache from 'node-cache';
// formatは使用していませんが、以前のコード互換性を保つために一応残します
// import { format } from 'util'; 

const app = express();
const port = process.env.PORT || 3000;

const videoCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

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
    // サーバー起動時にInnertubeの初期化が失敗する可能性もあるため、try/catchで囲む
    let youtube;
    try {
        youtube = await Innertube.create();
    } catch (e) {
        console.error('Failed to initialize Innertube:', e.message);
        // 初期化に失敗した場合、サーバーを終了するか、API呼び出しをすべて失敗させる
        // 今回はデバッグのため続行し、APIでエラーを出す
    }

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
        
        // youtubeが初期化に失敗していた場合は、ここでエラーを返す
        if (!youtube) {
             console.error(`[CRITICAL ERROR] youtubei.js initialization failed. Cannot process request for ${videoId}.`);
             return res.status(200).json(BLANK_RESPONSE);
        }

        try {
            const info = await youtube.getInfo(videoId);
            
            // データが取得できたことをログに出力
            console.log(`[SUCCESS] Successfully fetched data for videoId: ${videoId}`);

            const mappedData = mapVideoInfo(info);

            res.json(mappedData);
            videoCache.set(cacheKey, mappedData);

        } catch (error) {
            // エラーが発生した場合、詳細な情報をログに出力する
            console.error(`[FETCH ERROR] Failed to fetch video ${videoId}.`, {
                message: error.message,
                status: error.statusCode || 'N/A',
                stack: error.stack
            });
            
            // 失敗した場合、キャッシュせず、ユーザー指定の空のJSON構造とステータス200を返す
            return res.status(200).json(BLANK_RESPONSE);
        }
    });

    app.listen(port, () => {});
}

startServer();
