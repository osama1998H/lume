import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { IIPCHandlerContext } from './types';

/**
 * HTTP Bridge for IPC Handlers
 *
 * Exposes all IPC handlers as HTTP endpoints to allow external processes
 * (like the MCP server) to interact with the Electron app's IPC layer.
 *
 * Security: Only accepts connections from localhost (127.0.0.1)
 */
export class HTTPBridge {
  private server: Server | null = null;
  private port: number = 0;
  private context: IIPCHandlerContext;
  private handlers: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(context: IIPCHandlerContext) {
    this.context = context;
  }

  /**
   * Register an IPC handler to be exposed via HTTP
   */
  registerHandler(channel: string, handler: (args: any) => Promise<any>): void {
    this.handlers.set(channel, handler);
  }

  /**
   * Start the HTTP server
   * @param port Port to listen on (0 for random port)
   * @returns The actual port the server is listening on
   */
  async start(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (error) => {
        console.error('❌ HTTP Bridge server error:', error);
        reject(error);
      });

      this.server.listen(port, '127.0.0.1', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          console.log(`✅ HTTP Bridge started on http://127.0.0.1:${this.port}`);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('✅ HTTP Bridge stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers (localhost only) - use wildcard for simplicity since we validate origin via IP
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Security: Only accept requests from localhost
    const remoteAddress = req.socket.remoteAddress;
    if (remoteAddress !== '127.0.0.1' && remoteAddress !== '::1' && remoteAddress !== '::ffff:127.0.0.1') {
      console.warn('⚠️  Rejected request from non-localhost address: %s', remoteAddress);
      this.sendError(res, 403, 'Forbidden');
      return;
    }

    // Parse URL to get channel name
    const url = req.url || '';

    // Health check endpoint (allow GET/HEAD/POST)
    if (url === '/health') {
      this.sendSuccess(res, { status: 'ok', port: this.port });
      return;
    }

    // Only accept POST requests for IPC endpoints
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method Not Allowed');
      return;
    }

    // IPC endpoint format: /ipc/{channel-name}
    const match = url.match(/^\/ipc\/(.+)$/);
    if (!match) {
      this.sendError(res, 404, 'Not Found - Use /ipc/{channel-name}');
      return;
    }

    const channel = match[1];
    const handler = this.handlers.get(channel);

    if (!handler) {
      // Sanitize channel name before including in error message
      const sanitizedChannel = String(channel).replace(/%/g, '%%');
      this.sendError(res, 404, `IPC handler not found: ${sanitizedChannel}`);
      return;
    }

    // Read request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Parse JSON body (empty body is valid)
        const args = body ? JSON.parse(body) : {};

        // Call the IPC handler
        const result = await handler(args);

        // Send response
        this.sendSuccess(res, result);
      } catch (error) {
        console.error('❌ Error handling IPC request for %s:', channel, error);
        this.sendError(res, 500, error instanceof Error ? error.message : 'Internal Server Error');
      }
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      this.sendError(res, 500, 'Request Error');
    });
  }

  /**
   * Send successful JSON response
   */
  private sendSuccess(res: ServerResponse, data: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data }));
  }

  /**
   * Send error JSON response
   */
  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: message }));
  }
}
