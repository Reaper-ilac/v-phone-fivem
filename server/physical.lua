-- v-phone | physical phone bridge (server)
-- GET-only proof-of-concept so it also works on current FiveM Enhanced builds where
-- SetHttpHandler request-body callbacks can be unreliable. The physical browser gets no
-- capability the player does not already have: the only action in this first pass toggles
-- the existing in-game /vphone command for the paired player.

local PAIR_TTL = 600
local pairs = {}
local byPlayer = {}

math.randomseed(os.time() + GetGameTimer())

local function now()
    return os.time()
end

local function clean()
    local t = now()
    for code, entry in pairs do
        if not entry or entry.expires <= t or not GetPlayerName(entry.source) then
            if entry and byPlayer[entry.source] == code then byPlayer[entry.source] = nil end
            pairs[code] = nil
        end
    end
end

local function newCode()
    clean()
    for _ = 1, 50 do
        local code = tostring(math.random(100000, 999999))
        if not pairs[code] then return code end
    end
    return tostring(math.random(1000000, 9999999))
end

RegisterNetEvent('v-phone:physical:pairRequest', function()
    local src = source
    if not src or src <= 0 then return end

    local old = byPlayer[src]
    if old then pairs[old] = nil end

    local code = newCode()
    pairs[code] = { source = src, expires = now() + PAIR_TTL }
    byPlayer[src] = code

    TriggerClientEvent('v-phone:physical:pairCode', src, code, PAIR_TTL)
    print(('[v-phone] physical pairing code %s created for %s (%d)'):format(code, GetPlayerName(src) or 'player', src))
end)

AddEventHandler('playerDropped', function()
    local src = source
    local code = byPlayer[src]
    if code then pairs[code] = nil end
    byPlayer[src] = nil
end)

local function html(body, status)
    return status or 200, [[<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>v-phone Physical Bridge</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0c0c0f;color:#fff;margin:0;min-height:100vh;display:grid;place-items:center}.card{width:min(92vw,420px);background:#18181d;border:1px solid #303039;border-radius:24px;padding:24px;box-sizing:border-box;box-shadow:0 20px 60px #0008}h1{font-size:24px;margin:0 0 8px}.muted{color:#aaa;margin:0 0 20px}input,button{width:100%;box-sizing:border-box;border-radius:14px;padding:15px;font-size:18px}input{background:#0f0f13;color:#fff;border:1px solid #383842;margin-bottom:12px;text-align:center;letter-spacing:4px}button{border:0;background:#0a84ff;color:white;font-weight:700}button.secondary{background:#292932;margin-top:10px}.ok{color:#65d46e}.bad{color:#ff6b6b}code{word-break:break-all}</style></head><body><main class="card">]] .. body .. [[</main></body></html>]]
end

local function sendHtml(res, body, status)
    local code, page = html(body, status)
    res.writeHead(code, { ['Content-Type'] = 'text/html; charset=utf-8', ['Cache-Control'] = 'no-store' })
    res.send(page)
end

SetHttpHandler(function(req, res)
    clean()
    local path = tostring(req.path or '/')

    if req.method ~= 'GET' then
        res.writeHead(405, { ['Content-Type'] = 'text/plain; charset=utf-8' })
        res.send('GET only')
        return
    end

    if path == '/' or path == '/physical' or path == '/physical/' then
        sendHtml(res, [[
<h1>Physical Phone Bridge</h1>
<p class="muted">In FiveM, type <b>/physicalpair</b>. Enter the six-digit code below.</p>
<form id="pair"><input id="code" inputmode="numeric" maxlength="7" placeholder="PAIR CODE" autocomplete="one-time-code"><button type="submit">Pair this phone</button></form>
<p id="status" class="muted"></p>
<script>document.getElementById('pair').addEventListener('submit',function(e){e.preventDefault();var c=document.getElementById('code').value.replace(/\D/g,'');if(!c)return;location.href='physical/control/'+c;});</script>]])
        return
    end

    local code = path:match('^/physical/control/(%d+)$')
    if code then
        local entry = pairs[code]
        if not entry or entry.expires <= now() or not GetPlayerName(entry.source) then
            sendHtml(res, '<h1>Pairing expired</h1><p class="bad">Run <b>/physicalpair</b> in FiveM and enter the new code.</p><a href="../.." style="color:#0a84ff">Back</a>', 403)
            return
        end

        sendHtml(res, ([[<h1>Connected</h1><p class="muted">Paired to <b>%s</b>. First bridge test: this button controls the same in-game v-phone.</p><button onclick="location.href='../toggle/%s'">Toggle in-game phone</button><button class="secondary" onclick="location.reload()">Refresh</button><p class="ok">Bridge session active</p>]]):format(GetPlayerName(entry.source) or 'player', code))
        return
    end

    local toggleCode = path:match('^/physical/control/toggle/(%d+)$')
    if toggleCode then
        local entry = pairs[toggleCode]
        if not entry or entry.expires <= now() or not GetPlayerName(entry.source) then
            sendHtml(res, '<h1>Pairing expired</h1><p class="bad">Run <b>/physicalpair</b> again.</p>', 403)
            return
        end

        TriggerClientEvent('v-phone:physical:toggle', entry.source)
        sendHtml(res, ([[<h1>Command sent</h1><p class="ok">The paired FiveM phone was toggled.</p><button onclick="location.href='../../%s'">Back to controls</button>]]):format(toggleCode))
        return
    end

    res.writeHead(404, { ['Content-Type'] = 'text/plain; charset=utf-8' })
    res.send('Not found')
end)

print('[v-phone] physical phone bridge HTTP endpoint ready at /v-phone/physical')
