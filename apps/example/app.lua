-- apps/example/app.lua
--
-- This file remains the worked SDK example, but because it is already a shared script in
-- fxmanifest.lua it also hosts the first physical-phone bridge prototype without touching
-- the stock phone shell. The bridge is deliberately tiny: pair a real browser, then use it
-- to invoke the same /vphone command the player already has in FiveM.

if IsDuplicityVersion() then
    -- ══════════════════════════════════════════════════════════════
    -- Physical phone bridge - server proof of concept
    -- ══════════════════════════════════════════════════════════════
    -- GET-only on purpose. Current FiveM Enhanced builds have had regressions around reading
    -- POST bodies through SetHttpHandler, while GET handlers remain usable. The first test only
    -- needs a pairing code and one button, so there is no reason to depend on request bodies.

    local PAIR_TTL = 600
    local pairings = {}
    local byPlayer = {}

    math.randomseed(os.time() + GetGameTimer())

    local function cleanPairs()
        local t = os.time()
        for code, entry in pairs(pairings) do
            if not entry or entry.expires <= t or not GetPlayerName(entry.source) then
                if entry and byPlayer[entry.source] == code then byPlayer[entry.source] = nil end
                pairings[code] = nil
            end
        end
    end

    local function newCode()
        cleanPairs()
        for _ = 1, 50 do
            local code = tostring(math.random(100000, 999999))
            if not pairings[code] then return code end
        end
        return tostring(math.random(1000000, 9999999))
    end

    RegisterNetEvent('v-phone:physical:pairRequest', function()
        local src = source
        if not src or src <= 0 then return end

        local old = byPlayer[src]
        if old then pairings[old] = nil end

        local code = newCode()
        pairings[code] = { source = src, expires = os.time() + PAIR_TTL }
        byPlayer[src] = code

        TriggerClientEvent('v-phone:physical:pairCode', src, code, PAIR_TTL)
        print(('[v-phone] physical pairing code %s created for %s (%d)'):format(
            code, GetPlayerName(src) or 'player', src))
    end)

    AddEventHandler('playerDropped', function()
        local src = source
        local code = byPlayer[src]
        if code then pairings[code] = nil end
        byPlayer[src] = nil
    end)

    local function page(body)
        return [[<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>v-phone Physical Bridge</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0c0c0f;color:#fff;margin:0;min-height:100vh;display:grid;place-items:center}.card{width:min(92vw,420px);background:#18181d;border:1px solid #303039;border-radius:24px;padding:24px;box-sizing:border-box;box-shadow:0 20px 60px #0008}h1{font-size:24px;margin:0 0 8px}.muted{color:#aaa;margin:0 0 20px}input,button{width:100%;box-sizing:border-box;border-radius:14px;padding:15px;font-size:18px}input{background:#0f0f13;color:#fff;border:1px solid #383842;margin-bottom:12px;text-align:center;letter-spacing:4px}button{border:0;background:#0a84ff;color:#fff;font-weight:700}.ok{color:#65d46e}.bad{color:#ff6b6b}</style></head><body><main class="card">]] .. body .. [[</main></body></html>]]
    end

    local function sendHtml(res, body, status)
        res.writeHead(status or 200, {
            ['Content-Type'] = 'text/html; charset=utf-8',
            ['Cache-Control'] = 'no-store'
        })
        res.send(page(body))
    end

    SetHttpHandler(function(req, res)
        cleanPairs()
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
<script>document.getElementById('pair').addEventListener('submit',function(e){e.preventDefault();var c=document.getElementById('code').value.replace(/\D/g,'');if(c)location.href='physical/control/'+c;});</script>]])
            return
        end

        local toggleCode = path:match('^/physical/toggle/(%d+)$')
        if toggleCode then
            local entry = pairings[toggleCode]
            if not entry or entry.expires <= os.time() or not GetPlayerName(entry.source) then
                sendHtml(res, '<h1>Pairing expired</h1><p class="bad">Run <b>/physicalpair</b> again.</p>', 403)
                return
            end
            TriggerClientEvent('v-phone:physical:toggle', entry.source)
            sendHtml(res, ('<h1>Command sent</h1><p class="ok">The paired FiveM phone was toggled.</p><button onclick="location.href=\'../control/%s\'">Back to controls</button>'):format(toggleCode))
            return
        end

        local code = path:match('^/physical/control/(%d+)$')
        if code then
            local entry = pairings[code]
            if not entry or entry.expires <= os.time() or not GetPlayerName(entry.source) then
                sendHtml(res, '<h1>Pairing expired</h1><p class="bad">Run <b>/physicalpair</b> in FiveM and enter the new code.</p>', 403)
                return
            end
            sendHtml(res, ('<h1>Connected</h1><p class="muted">Paired to <b>%s</b>. First bridge test: this button controls the exact in-game v-phone.</p><button onclick="location.href=\'../toggle/%s\'">Toggle in-game phone</button><p class="ok">Bridge session active</p>'):format(GetPlayerName(entry.source) or 'player', code))
            return
        end

        res.writeHead(404, { ['Content-Type'] = 'text/plain; charset=utf-8' })
        res.send('Not found')
    end)

    print('[v-phone] physical phone bridge ready at /v-phone/physical')
else
    -- ══════════════════════════════════════════════════════════════
    -- Physical phone bridge - client proof of concept
    -- ══════════════════════════════════════════════════════════════
    RegisterNetEvent('v-phone:physical:toggle', function()
        ExecuteCommand('vphone')
    end)

    RegisterCommand('physicalpair', function()
        TriggerServerEvent('v-phone:physical:pairRequest')
    end, false)

    RegisterNetEvent('v-phone:physical:pairCode', function(code, seconds)
        local msg = ('Physical phone pairing code: %s (valid for %s seconds)'):format(
            tostring(code), tostring(seconds or 600))
        print(('[v-phone] %s'):format(msg))
        if GetResourceState('chat') == 'started' then
            TriggerEvent('chat:addMessage', {
                color = { 0, 170, 255 },
                multiline = true,
                args = { 'v-phone', msg }
            })
        end
    end)
end

-- ══════════════════════════════════════════════════════════════
-- Original SDK example - still off by default
-- ══════════════════════════════════════════════════════════════
if not (Config and Config.SdkExample) then return end

PhoneApp {
    id       = 'example',
    label    = 'Example',
    icon     = 'note',
    category = 'utilities',
    desc     = 'The worked example: a folder dropped into apps/ and nothing else.',
    developer = 'iFruit SDK',
    version  = '2.0.0',
    accent   = '#0A84FF',
    permissions = { 'storage', 'contacts', 'photos', 'location', 'notifications' },
    features = { 'Persistent data', 'Native pickers', 'Quick actions', 'Live lifecycle' },
    keywords = { 'example', 'sdk', 'developer' },
    optional = true,
}
