# MCP Integration Guide

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like Claude to interact with Lume programmatically. With MCP, you can use natural language to:

- ✅ Manage todos (add, update, complete, delete)
- ⏱️ Track time on tasks
- 📊 Query productivity statistics and analytics
- 📁 Manage categories
- 📈 Access dashboard summaries

## Integration Methods

Lume supports two ways to integrate with MCP clients:

1. **HTTP Bridge (Recommended)** - Easy setup via the Settings UI with auto-configuration
2. **Stdio Server** - Direct stdio communication for advanced users

### Which Method Should I Use?

| Feature | HTTP Bridge | Stdio Server |
|---------|-------------|--------------|
| **Setup Difficulty** | ✅ Easy (one-click) | ⚠️ Manual configuration required |
| **Auto-configuration** | ✅ Yes | ❌ No |
| **Backup creation** | ✅ Automatic | ❌ Manual |
| **UI in Settings** | ✅ Yes | ❌ No |
| **Node.js required** | ❌ No | ✅ Yes |
| **Build step required** | ❌ No | ✅ Yes (`npm run build:mcp`) |
| **Best for** | Most users | Advanced users, custom setups |

**Recommendation**: Use the HTTP Bridge unless you have specific requirements for the Stdio Server.

## HTTP Bridge Integration (Recommended)

### Overview

The HTTP Bridge provides an easy way to connect MCP clients to Lume without manual configuration. It runs automatically when Lume starts and provides:

- 🎯 **Auto-configuration** for Claude Desktop, Claude Code, and Cursor
- 🔒 **Localhost-only** HTTP server for secure communication
- 🖥️ **User-friendly UI** in the Settings page
- 🔄 **Automatic backup** of existing config files

### Quick Start

1. **Open Lume Settings**
   - Launch Lume
   - Go to Settings → MCP Integration

2. **Verify Bridge Status**
   - Check that "HTTP Bridge Status" shows "Running on port [port number]"
   - If not running, restart Lume

3. **Auto-Configure Your Client**
   - Click "Auto-Configure" next to your MCP client (Claude Desktop, Claude Code, or Cursor)
   - The configuration will be automatically detected and updated
   - A backup of your existing config will be created

4. **Restart Your MCP Client**
   - Restart Claude Desktop, Claude Code, or Cursor
   - The Lume MCP server should now be available

### Supported Clients

#### Claude Desktop
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Claude Code
- **All platforms**: `~/.claude.json` or `%USERPROFILE%\.claude.json`

#### Cursor
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/config.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/config.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\config.json`

### Manual Configuration

If auto-configuration doesn't work, you can copy the configuration manually:

1. Open Settings → MCP Integration
2. Scroll to "Manual Configuration"
3. Select your client from the dropdown
4. Click "Copy Config"
5. Manually paste into your client's config file
6. Restart your client

### HTTP Bridge Configuration Format

The HTTP Bridge adds this configuration to your MCP client:

```json
{
  "mcpServers": {
    "lume": {
      "url": "http://localhost:[PORT]/sse"
    }
  }
}
```

The port number is automatically assigned when Lume starts (typically in the 3000-4000 range).

### Troubleshooting HTTP Bridge

#### Bridge Not Running

**Symptom**: Settings shows "HTTP Bridge Status: Not Running"

**Solutions**:
- Restart Lume completely
- Check if another process is using the port
- Look for errors in Lume's console logs

#### Auto-Configuration Failed

**Symptom**: "Failed to configure" error message

**Possible causes**:
- Config file not found (client not installed)
- Permission denied (read-only config file)
- Invalid JSON in existing config

**Solutions**:
- Verify the client is installed
- Check file permissions on the config file
- Try manual configuration instead
- Check the backup file to restore if needed

#### Client Not Connecting

**Symptom**: MCP tools not available in Claude/Cursor after configuration

**Solutions**:
- Verify the HTTP Bridge is running in Lume Settings
- Restart your MCP client completely
- Check the port number in the config matches the bridge port
- Look for connection errors in your client's logs

## Stdio Server Integration (Advanced)

For advanced users who prefer direct stdio communication, Lume also provides a standalone MCP server.

### Prerequisites

- Lume app must be installed and run at least once (to create the database)
- Node.js installed on your system
- Claude Desktop, Claude Code, Cursor, or another MCP-compatible client

## Setup Instructions

### Step 1: Build the MCP Server

```bash
npm run build:mcp
```

This compiles the MCP server to `dist/mcp/server.js`.

### Step 2: Configure Your MCP Client

#### For Claude Desktop (macOS/Linux)

1. Locate your config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the Lume MCP server configuration:

```json
{
  "mcpServers": {
    "lume": {
      "command": "node",
      "args": ["/absolute/path/to/Lume/dist/mcp/server.js"]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/Lume` with the actual path to your Lume project directory.

3. Restart Claude Desktop

#### For Claude Code

1. Run the build command:
```bash
npm run build:mcp
```

2. Get the absolute path to the server:
```bash
pwd
# Output: /Users/yourname/path/to/Lume
```

3. Add to your `.claude.json` or run:
```bash
code ~/.claude.json
```

Add:
```json
{
  "mcpServers": {
    "lume": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/Lume/dist/mcp/server.js"]
    }
  }
}
```

4. Restart Claude Code

#### For Cursor

Similar to Claude Desktop - add the configuration to Cursor's MCP settings.

## Available Tools

### Todo Management

- **`todos_add`** - Create a new todo
  ```
  Claude, add a todo: "Review project proposal" with high priority
  ```

- **`todos_list`** - List todos with optional filters
  ```
  Claude, show me all my todos
  Claude, list todos with status "in_progress"
  ```

- **`todos_update`** - Update an existing todo
  ```
  Claude, update todo ID 5 to status "completed"
  ```

- **`todos_delete`** - Delete a todo
  ```
  Claude, delete todo ID 3
  ```

- **`todos_complete`** - Mark a todo as complete
  ```
  Claude, complete todo ID 7
  ```

- **`todos_stats`** - Get todo statistics
  ```
  Claude, what are my todo statistics?
  ```

### Time Tracking

- **`time_entries_start`** - Start tracking time
  ```
  Claude, start tracking time for "Project X"
  ```

- **`time_entries_stop`** - Stop the active time entry
  ```
  Claude, stop tracking time
  ```

- **`time_entries_active`** - Get the currently active time entry
  ```
  Claude, what am I currently tracking?
  ```

- **`time_entries_list`** - List recent time entries
  ```
  Claude, show my recent time entries
  ```

- **`time_entries_update`** - Update a time entry
  ```
  Claude, update time entry ID 10 with task name "Updated Task"
  ```

### Categories

- **`categories_list`** - List all categories
  ```
  Claude, list all my categories
  ```

- **`categories_add`** - Create a new category
  ```
  Claude, add a category named "Personal" with color #FF6B6B
  ```

- **`categories_update`** - Update a category
  ```
  Claude, update category ID 2 with name "Work Projects"
  ```

### Analytics

- **`analytics_today`** - Get today's statistics
  ```
  Claude, show me today's productivity stats
  ```

- **`analytics_weekly`** - Get weekly summary
  ```
  Claude, give me a weekly summary
  ```

- **`analytics_categories`** - Get category breakdown
  ```
  Claude, show category breakdown for the last 7 days
  ```

### Resources

- **`lume://dashboard/summary`** - Current dashboard data in JSON format

## Testing the Integration

### Quick Test with MCP Inspector

```bash
# Install MCP Inspector (one-time)
npm install -g @modelcontextprotocol/inspector

# Test the server
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

This opens a web interface where you can test all available tools and resources.

### Manual Test

```bash
# Start the server manually
npm run dev:mcp
```

The server will start and wait for stdio input. You can verify it's working by seeing the startup messages.

## Troubleshooting

### Database Not Found

**Error**: `Failed to connect to database: SQLITE_CANTOPEN`

**Solution**: Make sure you've run the Lume app at least once to create the database. The database is located at:
- macOS: `~/Library/Application Support/Lume/lume.db`
- Linux: `~/.config/Lume/lume.db` or `~/.local/share/Lume/lume.db`
- Windows: `%APPDATA%\Lume\lume.db`

### Server Not Appearing in Claude Desktop

1. Check that the path in `claude_desktop_config.json` is absolute and correct
2. Verify the server builds successfully: `npm run build:mcp`
3. Check the server runs manually: `npm run dev:mcp`
4. Restart Claude Desktop completely
5. Check Claude Desktop logs for errors

### Permission Denied

**Error**: `Permission denied` when running the server

**Solution**: Make the server executable:
```bash
chmod +x dist/mcp/server.js
```

Or rebuild: `npm run build:mcp` (includes chmod in the build script)

## Example Usage

Here are some common workflows:

### Morning Routine
```
You: Claude, show me today's stats
Claude: [Shows today's statistics]

You: Add a todo: "Team standup at 10am" with high priority
Claude: ✅ Created todo: "Team standup at 10am" (ID: 15)

You: Start tracking time for "Morning emails"
Claude: ✅ Started tracking: "Morning emails" (ID: 42)
```

### End of Day Review
```
You: Claude, show me my weekly summary
Claude: [Shows 7-day breakdown]

You: What's my category breakdown?
Claude: [Shows time by category]

You: List all completed todos today
Claude: [Shows completed todos]
```

### Task Management
```
You: Claude, list my todos with status "in_progress"
Claude: [Shows in-progress todos]

You: Complete todo ID 15
Claude: ✅ Marked todo ID 15 as complete.

You: Add a todo: "Prepare presentation" in category 3
Claude: ✅ Created todo: "Prepare presentation" (ID: 16)
```

## Security & Privacy

### HTTP Bridge
- Runs only on localhost (127.0.0.1) - not accessible from external networks
- Automatically assigns an available port (typically 3000-4000 range)
- Communicates with Electron IPC internally
- No data leaves your local machine
- No authentication required (localhost-only access)

### Stdio Server
- Direct local process communication via stdin/stdout
- No network access whatsoever
- Accesses the local SQLite database only
- No authentication required (local process only)

Both methods are secure and keep all data on your local machine.

## Advanced Configuration

### Custom Database Location

If your database is in a custom location, you can modify `src/mcp/utils/database.ts` to point to the correct path.

### Adding More Tools

1. Create a new file in `src/mcp/tools/`
2. Implement your tools following the existing patterns
3. Register in `src/mcp/tools/index.ts`
4. Rebuild: `npm run build:mcp`

### Development Mode

For development with auto-reload:

```bash
# Terminal 1: Watch mode
npm run watch:mcp

# Terminal 2: Run the server
node dist/mcp/server.js
```

## Support

For issues or questions:
- Check the [MCP documentation](https://modelcontextprotocol.io)
- Review the [GitHub repository](https://github.com/your-repo/lume)
- Check server logs (stderr output)

## Recent Updates

### HTTP Bridge (v1.1.0)
- ✅ One-click auto-configuration for Claude Desktop, Claude Code, and Cursor
- ✅ User-friendly Settings UI
- ✅ Automatic config backup before modifications
- ✅ Manual configuration fallback
- ✅ Real-time bridge status monitoring

## What's Next?

More tools and resources will be added in future releases:
- Pomodoro timer control
- Goals management
- Activity log queries
- Data export/import
- Real-time notifications
- And more!
