# Unbottle Bridge — REAPER Setup

`unbottle-bridge.lua` is a persistent ReaScript that starts a local HTTP server
on port 9000, exposing a JSON-RPC 2.0 interface for all Unbottle DAW commands.

---

## 1. Copy the script

| OS | REAPER Scripts folder |
|----|-----------------------|
| macOS | `~/Library/Application Support/REAPER/Scripts/` |
| Windows | `%APPDATA%\REAPER\Scripts\` |
| Linux | `~/.config/REAPER/Scripts/` |

Copy `unbottle-bridge.lua` into that folder.

---

## 2. Load and run

1. Open REAPER.
2. Go to **Actions → Show action list** (or press `?`).
3. Click **Load ReaScript…** in the bottom-left.
4. Navigate to your Scripts folder and select `unbottle-bridge.lua`.
5. Click **Run** (or double-click the action in the list).

REAPER's console will print:

```
Unbottle Bridge started on http://localhost:9000
GET /ping  — health check
POST /rpc  — JSON-RPC 2.0 methods
```

The script uses `reaper.defer()` to keep running indefinitely. It stops when you
close REAPER or explicitly terminate the action.

---

## 3. Verify the bridge is up

```bash
curl http://localhost:9000/ping
```

Expected response:

```json
{"status":"ok","version":"1.0.0"}
```

---

## 4. Example RPC call

```bash
curl -X POST http://localhost:9000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"createTrack","params":{"name":"Bass","volume":0.8},"id":1}'
```

Response:

```json
{"jsonrpc":"2.0","result":{"trackId":"1","name":"Bass","volume":0.8},"id":1}
```

---

## 5. Supported methods

| Method | Required params | Optional params |
|--------|----------------|-----------------|
| `createTrack` | `name` | `instrument`, `volume`, `color` |
| `deleteTrack` | `trackId` | — |
| `addClip` | `trackId`, `startBar`, `lengthBars` | `name`, `color` |
| `setTempo` | `bpm` | — |
| `setVolume` | `trackId`, `volume` | — |
| `muteTrack` | `trackId` | `muted` (boolean; toggles if omitted) |
| `soloTrack` | `trackId` | `solo` (boolean; toggles if omitted) |
| `play` | — | `fromBar` |
| `pause` | — | — |
| `stop` | — | — |
| `undo` | — | — |
| `redo` | — | — |

`trackId` is a 1-based integer returned by `createTrack` and used by all
track-targeting methods.

---

## 6. Troubleshooting

### Port already in use

Change the `local PORT = 9000` line at the top of `unbottle-bridge.lua` to any
free port, then restart the script.

To find what's using 9000:

```bash
# macOS / Linux
lsof -i :9000

# Windows
netstat -ano | findstr :9000
```

### luasocket not found

`luasocket` ships with most REAPER installations. If you see
`module 'socket' not found`:

1. Download luasocket binaries for your OS from
   https://github.com/luarocks/luasocket
2. Place `socket.lua` and the `socket/` directory next to the script, or
   install via [ReaPack](https://reapack.com/) → luasocket package.

### Firewall blocking connections

The server binds to `127.0.0.1` (loopback only) — no inbound firewall rule is
needed. If your firewall is blocking loopback traffic, add an exception for
`127.0.0.1:9000`.

### Script stops after one request

Ensure you did **not** accidentally break the `reaper.defer(loop)` tail call.
The defer loop is what keeps the script alive between REAPER's script ticks.

### Console output

REAPER's console (**Actions → Show REAPER console**) prints connection errors
from the bridge. Check there first when something seems wrong.
