const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--use-fake-ui-for-media-stream', 
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // ඔයා හදපු VDO.ninja ලින්ක් එක (Auto-view mode එකෙන්)
    const roomUrl = 'https://vdo.ninja/?room=givethankF&view&label=SERVER_HOST&cleanscreen'; 
    
    console.log("Connecting to VDO.ninja Room: givethankF");
    await page.goto(roomUrl, { waitUntil: 'networkidle2' });

    // පිටුව ලෝඩ් වීමට තත්පර 5ක් ලබා දීම
    await new Promise(r => setTimeout(r, 5000));
    console.log("System is ready. Capturing video and audio...");

    // YouTube Stream Key එක ලබා ගැනීම
    const streamKey = process.env.YOUTUBE_STREAM_KEY;

    // FFmpeg මඟින් වීඩියෝව YouTube වෙත යැවීම
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'x11grab', '-s', '1280x720', '-r', '30', '-i', ':99.0',
        '-f', 'pulse', '-i', 'default',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3500k',
        '-pix_fmt', 'yuv420p', '-g', '60',
        '-c:a', 'aac', '-b:a', '128k', '-f', 'flv',
        `rtmp://a.rtmp.youtube.com/live2/${streamKey}`
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
    });
}

run();
