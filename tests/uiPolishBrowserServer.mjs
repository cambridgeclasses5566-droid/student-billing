import express from 'express';
import { fileURLToPath } from 'node:url';
const app=express();
app.use(express.static(fileURLToPath(new URL('../',import.meta.url))));
const server=app.listen(4030,'127.0.0.1',()=>console.log('UI_POLISH_BROWSER_READY'));
const stop=()=>server.close(()=>process.exit(0));
process.on('SIGTERM',stop);process.on('SIGINT',stop);
