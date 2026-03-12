const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function run() {
    console.log("Starting Browser...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--allow-file-access-from-files',
            '--autoplay-policy=no-user-gesture-required', // Interaction එකක් නැතුව වීඩියෝ ප්ලේ වීමට
            '--disable-infobars',
            '--window-size=1280,720',
        ]
    });

    const page = await browser.newPage();
    
    // Resolution එක හරියටම 720p වලට සෙට් කිරීම
    await page.setViewport({ width: 1280, height: 720 });

    // VDO.ninja URL එක - &autoplay=1 සහ &mute=1 අනිවාර්යයි
    // 'view' ලේබල් එක දැම්මම ඔයා රූම් එකට එවන ඕනෑම වීඩියෝ එකක් සර්වර් එකට පේනවා
    const roomUrl = 'https://vdo.ninja/?room=givethankF&view&label=SERVER_HOST&cleanscreen&autoplay=1&mute=1&order=1';
    
    console.log("Connecting to VDO.ninja Room: givethankF");
    
    try {
        await page.goto(roomUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("Waiting for video elements to stabilize (20 seconds)...");
        await new Promise(r => setTimeout(r, 20000));

        // බ්‍රවුසර් එක ඇතුළේ වීඩියෝ ප්ලේ වෙනවාදැයි බලෙන් චෙක් කිරීම
        await page.evaluate(() => {
            const playAllVideos = () => {
                const videos = document.querySelectorAll('video');
                videos.forEach(v => {
                    v.play().catch(e => console.log("Play error:", e));
                    v.muted = false; // සර්වර් එක ඇතුළේ Audio එක FFmpeg එකට අහුවෙන්න ඕන නිසා
                    v.style.width = "100%";
                    v.style.height = "100%";
                });
            };
            playAllVideos();
            // අලුතින් වීඩියෝ එකක් ආවොත් ඒකත් ප්ලේ කරන්න ලූප් එකක්
            setInterval(playAllVideos, 5000);
        });

    } catch (err) {
        console.error("Page Load Error:", err);
    }

    console.log("System is ready. Capturing video and audio...");

    const streamKey = process.env.YOUTUBE_STREAM_KEY;
    if (!streamKey) {
        console.error("FATAL ERROR: YOUTUBE_STREAM_KEY is missing!");
        process.exit(1);
    }

    // FFmpeg Process එක පටන් ගැනීම
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'x11grab',
        '-thread_queue_size', '1024',
        '-s', '1280x720',
        '-r', '30',
        '-i', ':99.0', // Xvfb display එක
        '-f', 'pulse',
        '-thread_queue_size', '1024',
        '-i', 'default', // PulseAudio default sink
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '3500k',
        '-maxrate', '3500k',
        '-bufsize', '7000k',
        '-pix_fmt', 'yuv420p',
        '-g', '60', // Keyframe interval
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'flv',
        `rtmp://a.rtmp.youtube.com/live2/${streamKey}`
    ]);

    ffmpeg.stderr.on('data', (data) => {
        const msg = data.toString();
        // ලොග්ස් වැඩියි වගේ නම් මේක Filter කරන්න පුළුවන්
        if (msg.includes('frame=') || msg.includes('Error')) {
            console.log(`FFmpeg: ${msg}`);
        }
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        browser.close();
    });
}

run();
