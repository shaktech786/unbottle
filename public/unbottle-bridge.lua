-- Unbottle Bridge — ReaScript Lua HTTP server (JSON-RPC 2.0)
-- Load this script via Actions → Load ReaScript → Run
-- Listens on localhost:PORT for POST /rpc and GET /ping

local PORT = 9000  -- change this if 9000 is taken

-- ---------------------------------------------------------------------------
-- JSON encoder (minimal — only what we need for RPC responses)
-- ---------------------------------------------------------------------------

local function json_encode(val)
  local t = type(val)
  if val == nil then
    return "null"
  elseif t == "boolean" then
    return val and "true" or "false"
  elseif t == "number" then
    return tostring(val)
  elseif t == "string" then
    -- escape special characters
    val = val:gsub('\\', '\\\\')
    val = val:gsub('"',  '\\"')
    val = val:gsub('\n', '\\n')
    val = val:gsub('\r', '\\r')
    val = val:gsub('\t', '\\t')
    return '"' .. val .. '"'
  elseif t == "table" then
    -- detect array vs object
    local is_array = (#val > 0)
    if is_array then
      local parts = {}
      for _, v in ipairs(val) do
        parts[#parts + 1] = json_encode(v)
      end
      return "[" .. table.concat(parts, ",") .. "]"
    else
      local parts = {}
      for k, v in pairs(val) do
        parts[#parts + 1] = json_encode(tostring(k)) .. ":" .. json_encode(v)
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
  end
  return "null"
end

-- ---------------------------------------------------------------------------
-- Minimal JSON decoder (handles the subset produced by the web layer)
-- ---------------------------------------------------------------------------

local function json_decode(s)
  -- We rely on Lua's load() trick to eval JSON as Lua-ish data.
  -- This is safe here because the input comes from localhost only.
  s = s:gsub('"([^"]-)"%s*:', '["%1"]=')  -- "key": → ["key"]=
       :gsub('null', 'nil')
       :gsub('true', 'true')
       :gsub('false', 'false')
  local fn, err = load("return " .. s)
  if not fn then return nil, err end
  local ok, result = pcall(fn)
  if not ok then return nil, result end
  return result
end

-- ---------------------------------------------------------------------------
-- HTTP helpers
-- ---------------------------------------------------------------------------

local CORS_HEADERS = table.concat({
  "Access-Control-Allow-Origin: *",
  "Access-Control-Allow-Methods: GET, POST, OPTIONS",
  "Access-Control-Allow-Headers: Content-Type",
}, "\r\n")

local function http_response(client, status, body)
  local resp = table.concat({
    "HTTP/1.1 " .. status,
    "Content-Type: application/json",
    "Content-Length: " .. #body,
    CORS_HEADERS,
    "Connection: close",
    "",
    body,
  }, "\r\n")
  client:send(resp)
  client:close()
end

local function rpc_ok(id, result)
  return json_encode({ jsonrpc = "2.0", result = result, id = id })
end

local function rpc_error(id, code, message)
  return json_encode({
    jsonrpc = "2.0",
    error   = { code = code, message = message },
    id      = id,
  })
end

-- ---------------------------------------------------------------------------
-- Track lookup helper (trackId is 1-based index stored as string)
-- ---------------------------------------------------------------------------

local function get_track(track_id)
  local idx = tonumber(track_id)
  if not idx then return nil, "Invalid trackId: " .. tostring(track_id) end
  local track = reaper.GetTrack(0, idx - 1)  -- 0-based in REAPER
  if not track then return nil, "Track not found: " .. tostring(track_id) end
  return track
end

-- ---------------------------------------------------------------------------
-- RPC method handlers
-- ---------------------------------------------------------------------------

local handlers = {}

handlers["createTrack"] = function(params)
  local name       = params.name or "Untitled"
  local volume     = params.volume or 0.8
  local track_count = reaper.CountTracks(0)

  reaper.InsertTrackAtIndex(track_count, true)
  local track = reaper.GetTrack(0, track_count)
  reaper.GetSetMediaTrackInfo_String(track, "P_NAME", name, true)
  reaper.SetMediaTrackInfo_Value(track, "D_VOL", volume)

  -- optional color (hex string → REAPER color integer)
  if params.color then
    local r, g, b = params.color:match("#?(%x%x)(%x%x)(%x%x)")
    if r then
      local color = reaper.ColorToNative(tonumber(r,16), tonumber(g,16), tonumber(b,16))
      reaper.SetMediaTrackInfo_Value(track, "I_CUSTOMCOLOR", color | 0x01000000)
    end
  end

  reaper.Undo_BeginBlock()
  reaper.UpdateArrange()
  reaper.Undo_EndBlock("createTrack", -1)

  local new_id = tostring(track_count + 1)
  return { trackId = new_id, name = name, volume = volume }
end

handlers["deleteTrack"] = function(params)
  local track, err = get_track(params.trackId)
  if not track then return nil, err end

  reaper.Undo_BeginBlock()
  reaper.DeleteTrack(track)
  reaper.UpdateArrange()
  reaper.Undo_EndBlock("deleteTrack", -1)

  return { deleted = true, trackId = params.trackId }
end

handlers["addClip"] = function(params)
  local track, err = get_track(params.trackId)
  if not track then return nil, err end

  local start_bar  = params.startBar  or 1
  local length_bars = params.lengthBars or 1

  -- Convert bars to seconds using project tempo
  local bpm, _, _ = reaper.GetTempoTimeSigMarker(0, 0)
  if bpm == 0 then bpm = reaper.Master_GetTempo() end
  local spb = 60.0 / bpm  -- seconds per beat (assuming 4/4)
  local start_sec  = (start_bar  - 1) * 4 * spb
  local length_sec = length_bars * 4 * spb

  reaper.Undo_BeginBlock()
  local item, take = reaper.CreateNewMIDIItemInProj(track, start_sec, start_sec + length_sec, false)
  if params.name and take then
    reaper.GetSetMediaItemTakeInfo_String(take, "P_NAME", params.name, true)
  end
  if params.color and item then
    local r, g, b = params.color:match("#?(%x%x)(%x%x)(%x%x)")
    if r then
      local color = reaper.ColorToNative(tonumber(r,16), tonumber(g,16), tonumber(b,16))
      reaper.SetMediaItemInfo_Value(item, "I_CUSTOMCOLOR", color | 0x01000000)
    end
  end
  reaper.UpdateArrange()
  reaper.Undo_EndBlock("addClip", -1)

  return { trackId = params.trackId, startBar = start_bar, lengthBars = length_bars }
end

handlers["setTempo"] = function(params)
  local bpm = params.bpm
  if not bpm or bpm < 20 or bpm > 400 then
    return nil, "bpm must be between 20 and 400"
  end

  reaper.Undo_BeginBlock()
  -- SetTempoTimeSigMarker at time=0 sets the project tempo
  local ok = reaper.SetTempoTimeSigMarker(0, 0, 0, -1, -1, bpm, 0, 0, false)
  if not ok then
    -- Fallback for projects with no existing marker
    reaper.SetCurrentBPM and reaper.SetCurrentBPM(bpm) or true
  end
  reaper.UpdateTimeline()
  reaper.Undo_EndBlock("setTempo", -1)

  return { bpm = bpm }
end

handlers["setVolume"] = function(params)
  local track, err = get_track(params.trackId)
  if not track then return nil, err end

  local vol = math.min(params.volume or 1.0, 4.0)  -- REAPER max ~4.0 (≈ +12 dB)
  reaper.Undo_BeginBlock()
  reaper.SetMediaTrackInfo_Value(track, "D_VOL", vol)
  reaper.Undo_EndBlock("setVolume", -1)

  return { trackId = params.trackId, volume = vol }
end

handlers["muteTrack"] = function(params)
  local track, err = get_track(params.trackId)
  if not track then return nil, err end

  local muted
  if params.muted ~= nil then
    muted = params.muted and 1 or 0
  else
    -- toggle
    muted = (reaper.GetMediaTrackInfo_Value(track, "B_MUTE") == 0) and 1 or 0
  end

  reaper.Undo_BeginBlock()
  reaper.SetMediaTrackInfo_Value(track, "B_MUTE", muted)
  reaper.Undo_EndBlock("muteTrack", -1)

  return { trackId = params.trackId, muted = (muted == 1) }
end

handlers["soloTrack"] = function(params)
  local track, err = get_track(params.trackId)
  if not track then return nil, err end

  local solo
  if params.solo ~= nil then
    solo = params.solo and 1 or 0
  else
    -- toggle
    solo = (reaper.GetMediaTrackInfo_Value(track, "I_SOLO") == 0) and 1 or 0
  end

  reaper.Undo_BeginBlock()
  reaper.SetMediaTrackInfo_Value(track, "I_SOLO", solo)
  reaper.Undo_EndBlock("soloTrack", -1)

  return { trackId = params.trackId, solo = (solo == 1) }
end

handlers["play"] = function(params)
  if params.fromBar then
    local bpm = reaper.Master_GetTempo()
    local spb = 60.0 / bpm
    local pos = (params.fromBar - 1) * 4 * spb
    reaper.SetEditCurPos(pos, false, false)
  end
  reaper.OnPlayButton()
  return { playing = true }
end

handlers["pause"] = function(_params)
  reaper.OnPauseButton()
  return { paused = true }
end

handlers["stop"] = function(_params)
  reaper.OnStopButton()
  return { stopped = true }
end

handlers["undo"] = function(_params)
  local result = reaper.Undo_DoUndo2(0)
  return { undone = (result ~= 0) }
end

handlers["redo"] = function(_params)
  local result = reaper.Undo_DoRedo2(0)
  return { redone = (result ~= 0) }
end

-- ---------------------------------------------------------------------------
-- Request dispatch
-- ---------------------------------------------------------------------------

local function handle_request(client)
  -- Read the full request (simple: read until we have headers + body)
  local request = ""
  while true do
    local chunk = client:receive(4096)
    if not chunk then break end
    request = request .. chunk
    -- stop once we have headers + body (Content-Length satisfied or no body)
    local header_end = request:find("\r\n\r\n")
    if header_end then
      local headers = request:sub(1, header_end - 1)
      local cl = headers:match("[Cc]ontent%-[Ll]ength:%s*(%d+)")
      local body_start = header_end + 4
      if cl then
        local expected = tonumber(cl)
        if #request - body_start + 1 >= expected then break end
      else
        break
      end
    end
  end

  if not request or request == "" then return end

  local method_line = request:match("^(%u+)%s+(/[^%s]*)")
  local http_method, path = method_line and method_line:match("^(%u+)") or "GET",
                             request:match("^%u+%s+(/[^%s]*)")

  -- OPTIONS preflight
  if http_method == "OPTIONS" then
    http_response(client, "204 No Content", "")
    return
  end

  -- GET /ping
  if http_method == "GET" and path == "/ping" then
    http_response(client, "200 OK",
      json_encode({ status = "ok", version = "1.0.0" }))
    return
  end

  -- POST /rpc
  if http_method == "POST" and path == "/rpc" then
    local header_end = request:find("\r\n\r\n")
    local body = header_end and request:sub(header_end + 4) or ""

    local req, decode_err = json_decode(body)
    if not req then
      http_response(client, "400 Bad Request",
        rpc_error(nil, -32700, "Parse error: " .. tostring(decode_err)))
      return
    end

    local id      = req.id
    local rpc_method = req.method
    local params  = req.params or {}

    local handler = handlers[rpc_method]
    if not handler then
      http_response(client, "200 OK",
        rpc_error(id, -32601, "Method not found: " .. tostring(rpc_method)))
      return
    end

    local ok, result_or_err, handler_err = pcall(handler, params)
    if not ok then
      -- pcall itself failed
      http_response(client, "200 OK",
        rpc_error(id, -32603, "Internal error: " .. tostring(result_or_err)))
      return
    end
    if result_or_err == nil and handler_err then
      -- handler returned nil, error_string
      http_response(client, "200 OK",
        rpc_error(id, -32602, handler_err))
      return
    end

    http_response(client, "200 OK", rpc_ok(id, result_or_err))
    return
  end

  -- 404 fallback
  http_response(client, "404 Not Found",
    json_encode({ error = "Not found: " .. tostring(path) }))
end

-- ---------------------------------------------------------------------------
-- TCP server loop using luasocket (ships with most REAPER installations)
-- ---------------------------------------------------------------------------

local socket = require("socket")

local server = assert(socket.bind("127.0.0.1", PORT),
  "Unbottle Bridge: could not bind to port " .. PORT ..
  ". Is another instance already running?")
server:settimeout(0)  -- non-blocking accept

reaper.ShowConsoleMsg("Unbottle Bridge started on http://localhost:" .. PORT .. "\n")
reaper.ShowConsoleMsg("GET /ping  — health check\n")
reaper.ShowConsoleMsg("POST /rpc  — JSON-RPC 2.0 methods\n\n")

-- ---------------------------------------------------------------------------
-- defer loop — keeps script alive inside REAPER
-- ---------------------------------------------------------------------------

local function loop()
  local client = server:accept()
  if client then
    client:settimeout(2)
    local ok, err = pcall(handle_request, client)
    if not ok then
      reaper.ShowConsoleMsg("Unbottle Bridge error: " .. tostring(err) .. "\n")
      pcall(function() client:close() end)
    end
  end
  reaper.defer(loop)
end

loop()
