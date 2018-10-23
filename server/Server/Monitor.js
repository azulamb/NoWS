"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Static = require("./Static");
class Server extends Static.Server {
    responseJSON(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(data));
        res.end();
    }
    analysisData(src) {
        const data = {};
        src.split('&').forEach((dataset) => {
            const kv = dataset.split('=');
            if (!kv[0]) {
                return;
            }
            data[kv[0]] = kv[1] || '';
        });
        return data;
    }
    requestGet(request) {
        const get = request.url.split('?');
        return this.analysisData(get[1] || '');
    }
    requestPost(request) {
        return new Promise((resolve, reject) => {
            const bufs = [];
            request.on('data', (data) => {
                bufs.push((typeof data === 'string') ? Buffer.from(data, 'utf-8') : data);
            });
            request.on('end', () => {
                resolve(Buffer.concat(bufs).toString('utf-8'));
            });
            request.on('error', (error) => { reject(error); });
            request.on('aborted', (error) => { reject(error); });
        });
    }
    requestPostJSON(request) {
        return this.requestPost(request).then((data) => { return JSON.parse(data); });
    }
    apiServerList(req, res) {
        const data = { max: 0, list: [] };
    }
    apiServerStop(req, res) {
        let p = Promise.resolve();
        const urls = [];
        switch (req.method) {
            case 'GET':
                const data = this.requestGet(req);
                if (data.url) {
                    urls.push(data.url);
                }
                break;
            case 'POST':
                p = this.requestPostJSON(req).then((data) => {
                    if (data && Array.isArray(data.url)) {
                        urls.push(...data.url);
                    }
                });
                break;
        }
        return p.then(() => {
        });
    }
    onAPI(req, res) {
        const api = (req.url || '').replace(/^\/api\/([^\?]*).*$/, '$1');
        switch (api) {
            case 'server/list':
                this.apiServerList(req, res);
                break;
            case 'server/stop':
                this.apiServerStop(req, res);
                break;
            default:
                this.responseJSON(res, { message: 'No API' }, 404);
                break;
        }
    }
    start() {
        this.server.on('request', (req, res) => {
            const url = req.url || '/';
            console.log(url);
            if (url.match(/^\/api\//)) {
                this.onAPI(req, res);
            }
            else {
                this.onRequest(req, res);
            }
        });
        console.log(this.host + ':' + this.port);
        this.server.listen(this.port, this.host);
        return Promise.resolve();
    }
    stop() { this.server.close(); return Promise.resolve(); }
}
exports.default = Server;