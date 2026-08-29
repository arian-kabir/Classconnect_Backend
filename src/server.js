// backend/src/server.js

import { createServer } from 'http';
import next from 'next';
import fs from 'fs';
import path from 'path';
import { parse } from 'url';
import { initSocket } from './lib/socket.js';

const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev });

const handle = app.getRequestHandler();

// Location where uploaded chat files are stored
const uploadPath = path.join(
    process.cwd(),
    'public',
    'uploads'
);

app.prepare().then(() => {

    const server = createServer((req, res) => {

        // Serve uploaded files
        if (req.url.startsWith('/uploads/')) {

            const fileName =
                path.basename(req.url);

            const filePath =
                path.join(
                    uploadPath,
                    fileName
                );

            if (fs.existsSync(filePath)) {

                fs.createReadStream(
                    filePath
                ).pipe(res);

                return;
            }

            res.statusCode = 404;
            res.end('File not found');

            return;
        }

        // Let Next.js handle normal requests
        const parsedUrl =
            parse(req.url, true);

        handle(
            req,
            res,
            parsedUrl
        );
    });

    // Attach Socket.IO
    initSocket(server);

    const port =
        process.env.PORT || 3001;

    server.listen(
        port,
        () => {

            console.log(
                `🚀 Backend server running on http://localhost:${port}`
            );

            console.log(
                `🔌 Socket.IO server attached on port ${port}`
            );

        }
    );

});