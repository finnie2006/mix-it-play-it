// Cloud Sync Server - Runs inside Electron app
// Provides HTTP API for other studio computers to sync configurations

const http = require('http');
const url = require('url');

class CloudSyncServer {
  constructor(port = 8081) {
    this.port = port;
    this.server = null;
    this.configs = new Map(); // Store configs in memory
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log(`☁️ Cloud sync server already running on port ${this.port}`);
      return;
    }

    this.server = http.createServer((req, res) => {
      // Enable CORS for all origins
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      // Route: GET /api/configs - List all configs
      if (pathname === '/api/configs' && req.method === 'GET') {
        this.handleListConfigs(req, res);
      }
      // Route: POST /api/configs - Upload new config
      else if (pathname === '/api/configs' && req.method === 'POST') {
        this.handleUploadConfig(req, res);
      }
      // Route: GET /api/configs/:id - Get specific config
      else if (pathname.match(/^\/api\/configs\/[^/]+$/) && req.method === 'GET') {
        const configId = pathname.split('/').pop();
        this.handleGetConfig(req, res, configId);
      }
      // Route: GET /api/configs/latest - Get most recent config
      else if (pathname === '/api/configs/latest' && req.method === 'GET') {
        this.handleGetLatest(req, res);
      }
      // Route: DELETE /api/configs/:id - Delete config
      else if (pathname.match(/^\/api\/configs\/[^/]+$/) && req.method === 'DELETE') {
        const configId = pathname.split('/').pop();
        this.handleDeleteConfig(req, res, configId);
      }
      // Route: GET /api/status - Server status
      else if (pathname === '/api/status' && req.method === 'GET') {
        this.handleStatus(req, res);
      }
      else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.port, () => {
      this.isRunning = true;
      console.log(`☁️ Cloud sync server started on http://localhost:${this.port}`);
      console.log(`☁️ Other computers can connect to: http://<this-computer-ip>:${this.port}`);
    });

    this.server.on('error', (error) => {
      console.error('☁️ Cloud sync server error:', error);
      this.isRunning = false;
    });
  }

  stop() {
    if (this.server && this.isRunning) {
      this.server.close(() => {
        console.log('☁️ Cloud sync server stopped');
        this.isRunning = false;
      });
    }
  }

  handleListConfigs(req, res) {
    const configList = Array.from(this.configs.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(configList));
    console.log(`☁️ Listed ${configList.length} configs`);
  }

  handleUploadConfig(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const config = JSON.parse(body);
        
        // Validate required fields
        if (!config.id || !config.name || !config.data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: id, name, data' }));
          return;
        }

        // Store config
        config.lastModified = Date.now();
        this.configs.set(config.id, config);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          id: config.id,
          message: 'Config uploaded successfully' 
        }));
        
        console.log(`☁️ Uploaded config from "${config.name}" (${config.id})`);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  handleGetConfig(req, res, configId) {
    const config = this.configs.get(configId);
    
    if (!config) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Config not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config));
    console.log(`☁️ Retrieved config: ${config.name}`);
  }

  handleGetLatest(req, res) {
    if (this.configs.size === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No configs available' }));
      return;
    }

    // Find most recent config
    const latest = Array.from(this.configs.values())
      .reduce((newest, current) => 
        current.lastModified > newest.lastModified ? current : newest
      );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latest));
    console.log(`☁️ Retrieved latest config: ${latest.name}`);
  }

  handleDeleteConfig(req, res, configId) {
    if (this.configs.has(configId)) {
      const config = this.configs.get(configId);
      this.configs.delete(configId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Config deleted' 
      }));
      
      console.log(`☁️ Deleted config: ${config.name}`);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Config not found' }));
    }
  }

  handleStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      port: this.port,
      configCount: this.configs.size,
      uptime: process.uptime()
    }));
  }

  getConfigCount() {
    return this.configs.size;
  }

  getConfigs() {
    return Array.from(this.configs.values());
  }
}

module.exports = CloudSyncServer;
