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

    console.log("Opening StreamYard Studio...");
    // පහත URL එක ඔබේ StreamYard Studio Link එකෙන් වෙනස් කරන්න
    await page.goto('https://streamyard.com/x66gr3eaap', { waitUntil: 'networkidle2' });

    try {
        // ස්ටුඩියෝ එකට ඇතුළු වීමට නමක් ඇතුළත් කිරීම
        await page.waitForSelector('input[name="displayName"]', { timeout: 15000 });
        await page.type('input[name="displayName"]', 'Live Stage Host');
        await page.click('button[type="submit"]');
        console.log("Entered Studio!");
    } catch (e) {
        console.log("Auto-login failed, might need manual setup first: " + e.message);
    }

    // අමුත්තන්ව ස්වයංක්‍රීයව Live එකට එකතු කිරීම (Auto-Add)
    setInterval(async () => {
        try {
            const buttons = await page.$$('button');
            for (let btn of buttons) {
                let text = await page.evaluate(el => el.innerText, btn);
                if (text.includes("Add to stream")) {
                    await btn.click();
                    console.log("Guest added to stage!");
                }
            }
        } catch (e) {}
    }, 5000);

    // YouTube වෙත විකාශනය කිරීම (FFmpeg)
    const streamKey = process.env.YOUTUBE_STREAM_KEY;
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'x11grab', '-s', '1280x720', '-r', '30', '-i', ':99.0',
        '-f', 'pulse', '-i', 'default',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
        '-pix_fmt', 'yuv420p', '-g', '60',
        '-c:a', 'aac', '-b:a', '128k', '-f', 'flv',
        `rtmp://a.rtmp.youtube.com/live2/${streamKey}`
    ]);
}
run();
