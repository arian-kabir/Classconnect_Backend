// backend/src/server.js
import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { initSocket } from './lib/socket.js';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });
    // Initialize Socket.IO
    const io = initSocket(server);

    const port = process.env.PORT || 3001;
    server.listen(port, () => {
        console.log(`🚀 Backend server running on http://localhost:${port}`);
        console.log(`🔌 Socket.IO server attached on port ${port}`);
    });
});