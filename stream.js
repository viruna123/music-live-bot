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
    // YouTube සඳහා 720p resolution ලබා දීම
    await page.setViewport({ width: 1280, height: 720 });

    console.log("Connecting to StreamYard Studio...");
    
    // ඔබේ StreamYard ලින්ක් එක
    await page.goto('https://streamyard.com/x66gr3eaap', { waitUntil: 'networkidle2' });

    try {
        // පිටුව ලෝඩ් වන තෙක් තත්පර 12ක් රැඳී සිටීම
        await new Promise(r => setTimeout(r, 12000));

        // නම ඇතුළත් කරන කොටස (Display Name) සොයා ගැනීම
        const inputs = await page.$$('input');
        for (let input of inputs) {
            const placeholder = await page.evaluate(el => el.getAttribute('placeholder'), input);
            const nameAttr = await page.evaluate(el => el.getAttribute('name'), input);
            
            if (nameAttr === 'displayName' || (placeholder && placeholder.toLowerCase().includes('name'))) {
                await input.type('Viru Live Host');
                console.log("Display Name Typed!");
            }
        }

        // 'Enter Studio' හෝ 'Join' බොත්තම සොයා එබීම
        const buttons = await page.$$('button');
        for (let btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text.includes('Enter') || text.includes('Join')) {
                await btn.click();
                console.log("Clicked Enter Studio Button!");
                break;
            }
        }

        // ඇතුළු වූ පසු ස්ටුඩියෝ එක ස්ථාවර වීමට තත්පර 5ක් සිටින්න
        await new Promise(r => setTimeout(r, 5000));

    } catch (e) {
        console.log("Navigation Error: " + e.message);
    }

    // --- AUTO-ADD GUESTS ---
    // හැම තත්පර 5කට වරක්ම අමුත්තෙක් සිටීදැයි බලා ඔහුව Stream එකට එකතු කරයි.
    setInterval(async () => {
        try {
            const buttons = await page.$$('button');
            for (let btn of buttons) {
                const text = await page.evaluate(el => el.innerText, btn);
                if (text.includes("Add to stream")) {
                    await btn.click();
                    console.log("Guest auto-added!");
                }
            }
        } catch (e) {}
    }, 5000);

    // --- YOUTUBE STREAMING (FFmpeg) ---
    const streamKey = process.env.YOUTUBE_STREAM_KEY;
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'x11grab', '-s', '1280x720', '-r', '30', '-i', ':99.0',
        '-f', 'pulse', '-i', 'default',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k',
        '-pix_fmt', 'yuv420p', '-g', '60',
        '-c:a', 'aac', '-b:a', '128k', '-f', 'flv',
        `rtmp://a.rtmp.youtube.com/live2/${streamKey}`
    ]);
    
    console.log("Streaming to YouTube started...");
}

run();
