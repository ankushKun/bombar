json = require("json")
base64 = require(".base64")
sqlite3 = require("lsqlite3")
bint = require('.bint')(256)
db = db or sqlite3.open_memory()


--------- HANDLERS NEEDED -----------
-- register <name> <address>
-- update <address> <lat> <lon> - 5 minute cooldown, address gets 1 coin for each update
-- closest <lat> <lon> <addreaa> - returns 3 closest players to the address
-- drop_bomb <lat> <lon> - drops a bomb at the location, all players within 1km loose upto 10 coins based on distance from the bomb location

PositionCooldownSeconds = 5 * 60

db:exec [[
    CREATE TABLE IF NOT EXISTS Players (
        address TEXT PRIMARY KEY,
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Positions (
        address TEXT PRIMARY KEY,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        last_update INTEGER NOT NULL,
        FOREIGN KEY(address) REFERENCES Players(address)
    );

    CREATE TABLE IF NO EXISTS Bombs (
        address TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        time_added INTEGER NOT NULL,
        explode_after INTEGER NOT NULL,
        FOREIGN KEY(address) REFERENCES Positions(address)
    )
]]

utils = {
  add = function(a, b)
    return tostring(bint(a) + bint(b))
  end,
  subtract = function(a, b)
    return tostring(bint(a) - bint(b))
  end,
  toBalanceValue = function(a)
    return tostring(bint(a))
  end,
  toNumber = function(a)
    return tonumber(a)
  end
}

-- Load bombar.lua then token blueprint
Denomination = 2
Balances = Balances or { [ao.id] = utils.toBalanceValue(100000 * 10 ^ Denomination) }
TotalSupply = TotalSupply or utils.toBalanceValue(100000 * 10 ^ Denomination)
Name = "Joose Box"
Ticker = 'JOOSE'
Logo = 'hoIf0s3TJStPxLkdeGQtaE1w0hQKiKpYdEBuhpgBFRA'

-- easily read from the database
function sql_read(query, ...)
  local m = {}
  local stmt = db:prepare(query)
  if stmt then
    local bind_res = stmt:bind_values(...)
    assert(bind_res, "❌[bind error] " .. db:errmsg())
    for row in stmt:nrows() do
      table.insert(m, row)
    end
    stmt:finalize()
  end
  return m
end

-- easily write to the database
function sql_write(query, ...)
  local stmt = db:prepare(query)
  if stmt then
    local bind_res = stmt:bind_values(...)
    assert(bind_res, "❌[bind error] " .. db:errmsg())
    local step = stmt:step()
    assert(step == sqlite3.DONE, "❌[write error] " .. db:errmsg())
    stmt:finalize()
  end
  return db:changes()
end

function ClearPlayers()
  local query = [[
        DELETE FROM Players;
        DELETE FROM Positions;
    ]]
  local changes = sql_write(query)
  return "🗑️[ClearPlayers] " .. changes
end

-- common error handler
function handle_run(func, msg)
  local ok, err = pcall(func, msg)
  if not ok then
    local clean_err = err:match(":%d+: (.+)") or err
    print(msg.Action .. " - " .. err)
    Send({
      Target = msg.From,
      Data = clean_err,
      Action = "Bombar.Error"
    })
  end
end

-- get name for registered
function get_name(addr)
  local query = [[
        SELECT name FROM Players WHERE address = ?;
    ]]
  local name = sql_read(query, addr)
  if #name > 0 then
    return name[1].name
  else
    return nil
  end
end

Handlers.add(
  "Bombar.GetName",
  Handlers.utils.hasMatchingTag("Action", "Bombar.GetName"),
  function(msg)
    local name = get_name(msg.From)
    if name then
      print("📝[get_name] " .. name)
      Send({
        Target = msg.From,
        Data = name,
        Action = "Bombar.GetNameResponse"
      })
    else
      print("❌[get_name] not registered")
      Send({
        Target = msg.From,
        Data = "",
        Action = "Bombar.Error"
      })
    end
  end
)

-- Register handler
function register(msg)
  local name = msg.Data
  local address = msg.From

  assert(name, "❌[register] name is required")
  assert(type(name) == "string", "❌[register] name must be a string")
  assert(name:len() >= 3, "❌[register] name is too short (4 characters minimum)")
  assert(name:len() <= 20, "❌[register] name is too long (20 characters maximum)")
  assert(address, "❌[register] address is required")

  -- insert or update
  local query = [[
        INSERT OR REPLACE INTO Players (address, name) VALUES (?, ?);
    ]]
  local changes = sql_write(query, address, name)
  print(changes)
  assert(changes > 0, "❌[register] " .. name .. " is already registered")

  print("📝[register] " .. name .. " at " .. address)
  Send({
    Target = address,
    Data = "👍[register] " .. name .. " registered at " .. address,
    Action = "Bombar.RegisterResponse"
  })
end

Handlers.add(
  "Bombar.Register",
  Handlers.utils.hasMatchingTag("Action", "Bombar.Register"),
  function(msg)
    handle_run(register, msg)
  end
)

-- Move player handler, check if the player is registered and if the position exists in the database, if yes update the position if cooldown is met

function move_player(msg)
  local address = msg.From
  local lat = msg.Lat
  local lon = msg.Lon

  assert(lat, "❌[move_player] latitude is required")
  assert(lon, "❌[move_player] longitude is required")

  lat = tonumber(lat)
  lon = tonumber(lon)

  assert(lat >= -90 and lat <= 90, "❌[move_player] latitude must be between -90 and 90")
  assert(lon >= -180 and lon <= 180, "❌[move_player] longitude must be between -180 and 180")

  local query = [[
        SELECT * FROM Players WHERE address = ?;
    ]]

  local player = sql_read(query, address)

  assert(#player > 0, "❌[move_player] player not registered")

  local query = [[
        SELECT * FROM Positions WHERE address = ?;
    ]]
  local position = sql_read(query, address)


  if #position == 0 then
    local query = [[
        INSERT INTO Positions (address, lat, lon, last_update) VALUES (?, ?, ?, ?);
    ]]

    local changes = sql_write(query, address, lat, lon, msg.Timestamp)

    assert(changes > 0, "❌[move_player] position not created")

    print("📍[move_player] " .. address .. " at " .. lat .. ", " .. lon)
    Send({
      Target = address,
      Data = "👍[move_player] position created",
      Action = "Bombar.MovePlayerResponse"
    })
    Send({
      Target = ao.id,
      Action = 'Transfer',
      Recipient = address,
      Quantity = utils.toBalanceValue(100),
    })
  else
    local last_update = position[1].last_update
    local now = msg.Timestamp
    local diff = now - last_update
    local diff_seconds = diff / 1000
    print(diff_seconds)

    if diff_seconds < PositionCooldownSeconds then
      local remaining = PositionCooldownSeconds - diff_seconds
      print("❌[move_player] cooldown not met, " .. remaining .. " seconds remaining")
      Send({
        Target = address,
        Data = tostring(remaining),
        Action = "Bombar.Cooldown"
      })
    else
      local query = [[
                INSERT OR REPLACE INTO Positions (address, lat, lon, last_update) VALUES (?, ?, ?, ?);
            ]]

      local changes = sql_write(query, address, lat, lon, msg.Timestamp)

      assert(changes > 0, "❌[move_player] position not updated")

      Send({
        Target = ao.id,
        Action = 'Transfer',
        Recipient = address,
        Quantity = utils.toBalanceValue(100),
      })

      print("📍[move_player] " .. address .. " at " .. lat .. ", " .. lon)
      Send({
        Target = address,
        Data = "👍[move_player] position updated",
        Action = "Bombar.MovePlayerResponse"
      })
    end
  end
end

Handlers.add(
  "Bombar.MovePlayer",
  Handlers.utils.hasMatchingTag("Action", "Bombar.MovePlayer"),
  function(msg)
    handle_run(move_player, msg)
  end
)

-- get all players - divide them by active and inactive.
-- active are the ones that have updated their position in the last 1 hour
-- inactive are the ones that have not updated their position in the last 1 hour

function get_all_players(msg)
  -- read all positions and sort by last_update, algo get the name from the Players table by joining it
  local query = [[
        SELECT p.address, p.lat, p.lon, p.last_update, n.name FROM Positions p
        JOIN Players n ON p.address = n.address
        ORDER BY p.last_update DESC LIMIT 200;
    ]]
  local positions = sql_read(query)
  print(positions)

  local query = [[
        SELECT * FROM Positions WHERE address = ?;
    ]]
  local my_position = sql_read(query, msg.From)

  if #my_position > 0 then
    my_position = {
      lat = my_position[1].lat,
      lon = my_position[1].lon
    }
  else
    my_position = nil
  end

  local now = msg.Timestamp

  local active = {}
  local inactive = {}
  local closest = {}

  for _, position in ipairs(positions) do
    local last_update = position.last_update
    local diff = now - last_update
    local diff_seconds = diff / 1000

    -- print(position)

    if diff_seconds < 3600 then -- 1 hour
      if my_position and position.lat ~= 0.0 and position.lon ~= 0.0 then
        local distance = math.sqrt((position.lat - my_position.lat) ^ 2 + (position.lon - my_position.lon) ^ 2)
        local distance_meters = distance * 111000
        if distance > 0 then
          if #closest < 3 then
            table.insert(closest, {
              address = position.address,
              name = position.name,
              distance = distance_meters
            })
          else
            table.sort(closest, function(a, b)
              return a.distance < b.distance
            end)
            if distance_meters < closest[3].distance then
              closest[3] = {
                address = position.address,
                name = position.name,
                distance = distance_meters
              }
            end
          end
        end
        table.insert(active, position)
      else
        table.insert(active, position)
      end
    else
      table.insert(inactive, position)
    end

    -- if not position.address == msg.From then
    --   if diff_seconds < 3600 then -- 1 hour
    --     table.insert(active, position)
    --   else
    --     table.insert(inactive, position)
    --   end
    -- end
  end

  print(active)
  print(inactive)
  print(closest)

  print("📍[get_all_players] active: " .. #active .. ", inactive: " .. #inactive .. ", closest: " .. #closest)

  Send({
    Target = msg.From,
    Data = json.encode({
      active = active,
      inactive = inactive,
      closest = closest,
      me = my_position
    }),
    Action = "Bombar.AllPlayersResponse"
  })
end

Handlers.add(
  "Bombar.AllPlayers",
  Handlers.utils.hasMatchingTag("Action", "Bombar.AllPlayers"),
  function(msg)
    handle_run(get_all_players, msg)
  end
)
