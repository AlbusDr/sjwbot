var tmi = require("tmi.js"); //this is a twitch api
var fs = require("fs"); //for loading the modular files dynamically
var path = require("path"); //for getting our specific path
//config
var config_bot = JSON.parse(fs.readFileSync("./config/bot.json"));
var config_channels = JSON.parse(fs.readFileSync("./config/channels.json"));
config_bot.channels = [];

var excludes = {};
var includes = {};

for(let [i, _channel] of Object.entries(config_channels)) {
    if(typeof _channel.include != "undefined"
    && _channel.include.length > 0) {
        includes[i] = [];
        for(let include of _channel.include) {
            includes[i].push(include);
        }
        //we have specific chat modules to include, if none add all
    }
    if(typeof _channel.exclude != "undefined"
    && _channel.exclude.length > 0) {
        excludes[i] = [];
        for(let exclude of _channel.exclude) {
            excludes[i].push(exclude);
        }
        //we have specific chat modules to exclude, if none ignore
    }
    config_bot.channels.push(i);
}

console.log(excludes);

//load the chat modules
var normalized_path = path.join(__dirname, "chat");
var chat_modules = []
fs.readdirSync(normalized_path).forEach(file => {
	var mod = require("./chat/" + file);
	chat_modules.push(mod);
});

var options = config_bot;

var client = new tmi.client(options);

client.connect();

client.modified_say = function(channel, msg) {
    channel = "#" + channel;
    if(typeof includes[channel] != "undefined") {
        var include_filter = chat_modules.filter(_module => includes[channel].includes(_module.name));
    } else {
        var include_filter = chat_modules;
    }
    var exclude_filter = include_filter.filter(_module => !excludes[channel].includes(_module.name));
    for(let [i, _module] of exclude_filter.entries()) {
        if(typeof _module.say != "undefined") {
            msg = _module.say(msg);
        }
    }
    client.say(channel, msg);
}

client.on("chat", (channel, userstate, message, self) => {
    if(self) return;
    if(typeof includes[channel] != "undefined") {
        var include_filter = chat_modules.filter(_module => includes[channel].includes(_module.name));
    } else {
        var include_filter = chat_modules;
    }
    var exclude_filter = include_filter.filter(_module => !excludes[channel].includes(_module.name));

    for(let [i, _module] of exclude_filter.entries()) {
        if(typeof _module.chat != "undefined") {
            //channel always comes across as #channel so we substring to remove the hash
            var response = _module.chat(client, channel.substring(1), message, userstate);
        }
    }
});