const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    {
        name: 'play',
        description: 'Play a song from a URL',
        options: [
            {
                name: 'url',
                type: 3, // STRING
                description: 'The URL of the song',
                required: true,
            },
        ],
    },
    {
        name: 'pause',
        description: 'Pause the current song',
    },
    {
        name: 'volume',
        description: 'Set the volume',
        options: [
            {
                name: 'volume',
                type: 4, // INTEGER
                description: 'Volume level (0-100)',
                required: true,
            },
        ],
    },
    {
        name: 'join',
        description: 'Join a voice channel',
    },
    {
        name: 'disconnect',
        description: 'Disconnect from the voice channel',
    },
    {
        name: '24-7',
        description: 'Play music continuously',
    },
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();