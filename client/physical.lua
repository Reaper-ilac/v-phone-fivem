-- v-phone | physical phone bridge (client)
-- First proof-of-concept: a paired browser can toggle the exact in-game phone.
-- No extra phone abilities are introduced here; this only invokes the same /vphone command
-- the player can already use in FiveM.

RegisterNetEvent('v-phone:physical:toggle', function()
    ExecuteCommand('vphone')
end)

RegisterCommand('physicalpair', function()
    TriggerServerEvent('v-phone:physical:pairRequest')
end, false)

RegisterNetEvent('v-phone:physical:pairCode', function(code, seconds)
    local msg = ('Physical phone pairing code: %s (valid for %s seconds)'):format(tostring(code), tostring(seconds or 600))
    print(('[v-phone] %s'):format(msg))

    if GetResourceState('chat') == 'started' then
        TriggerEvent('chat:addMessage', {
            color = { 0, 170, 255 },
            multiline = true,
            args = { 'v-phone', msg }
        })
    end
end)
