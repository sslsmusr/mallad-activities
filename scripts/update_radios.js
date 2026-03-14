const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const RADIOS_FILE = path.join(__dirname, '..', 'radios.json');

async function checkUrl(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const options = {
            method: 'HEAD',
            timeout: 5000
        };

        try {
            const req = client.request(url, options, (res) => {
                // Audio streams often return 200 or 206
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    resolve({ ok: true, status: res.statusCode });
                } else {
                    resolve({ ok: false, status: res.statusCode });
                }
            });

            req.on('error', (e) => {
                resolve({ ok: false, error: e.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false, error: 'Timeout' });
            });

            req.end();
        } catch (e) {
            resolve({ ok: false, error: e.message });
        }
    });
}

async function updateRadios() {
    console.log('--- Radio Link Maintenance ---');
    
    if (!fs.existsSync(RADIOS_FILE)) {
        console.error('Error: radios.json not found at', RADIOS_FILE);
        return;
    }

    const radios = JSON.parse(fs.readFileSync(RADIOS_FILE, 'utf8'));
    const updatedRadios = [];
    let failureCount = 0;

    for (const radio of radios) {
        console.log(`Checking "${radio.name}"...`);
        const result = await checkUrl(radio.url);
        
        if (result.ok) {
            console.log(`  [OK] Status: ${result.status}`);
            updatedRadios.push(radio);
        } else {
            console.log(`  [FAIL] ${result.error || 'Status ' + result.status}`);
            // For now, we just log it, but we could mark it or move it to a "broken" list
            // Here we keep it but log the failure
            updatedRadios.push({
                ...radio,
                lastChecked: new Date().toISOString(),
                status: 'unresponsive',
                error: result.error || `Status ${result.status}`
            });
            failureCount++;
        }
    }

    // Save back if needed, or just log
    // fs.writeFileSync(RADIOS_FILE, JSON.stringify(updatedRadios, null, 4));
    
    console.log('------------------------------');
    console.log(`Check complete. ${radios.length} checked, ${failureCount} failed.`);
}

updateRadios();
