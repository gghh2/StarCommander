/**
 * HTTP Server for Keybind Commands
 * Receives commands from AutoHotkey script or any HTTP client
 */

const http = require('http');

let onTargetChange = null;
let config = null;

// Mapping for accent-free URLs
const URL_ALIASES = {
    'ingenieurs': 'Ingénieurs',
    'artilleurs': 'Artilleurs',
    'escadrille': 'Escadrille'
};

function start(cfg, callback) {
    config = cfg;
    onTargetChange = callback;
    
    const port = config.server?.port || 3000;
    
    const server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        
        // Parse URL
        const url = new URL(req.url, `http://localhost:${port}`);
        const urlPath = url.pathname;
        
        // POST /radio/:target
        if (req.method === 'POST' && urlPath.startsWith('/radio/')) {
            let target = decodeURIComponent(urlPath.replace('/radio/', ''));
            
            // Check for alias (accent-free version)
            const alias = URL_ALIASES[target.toLowerCase()];
            if (alias) {
                target = alias;
            }
            
            // Validate target
            const validTargets = [
                'all',
                'default', 
                'mute',
                ...config.channels.targets.map(t => t.name)
            ];
            
            // Case-insensitive match
            const matchedTarget = validTargets.find(
                t => t.toLowerCase() === target.toLowerCase()
            );
            
            if (!matchedTarget) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: `Invalid target: ${target}` }));
                return;
            }
            
            // Call the callback
            if (onTargetChange) {
                onTargetChange(matchedTarget);
            }
            
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, target: matchedTarget }));
            return;
        }
        
        // GET /status
        if (req.method === 'GET' && urlPath === '/status') {
            res.writeHead(200);
            res.end(JSON.stringify({ 
                status: 'running',
                targets: config.channels.targets.map(t => t.name)
            }));
            return;
        }
        
        // GET / - Help
        if (req.method === 'GET' && urlPath === '/') {
            res.writeHead(200);
            res.end(JSON.stringify({
                endpoints: [
                    'POST /radio/all - Broadcast to all channels',
                    'POST /radio/mute - Mute broadcast',
                    'POST /radio/artilleurs - Artilleurs',
                    'POST /radio/ingenieurs - Ingénieurs',
                    'POST /radio/escadrille - Escadrille',
                    'GET /status - Get server status'
                ]
            }));
            return;
        }
        
        // 404
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    
    server.listen(port, () => {
        console.log(`   ✓ HTTP server listening on http://localhost:${port}`);
    });
    
    return server;
}

module.exports = { start };
