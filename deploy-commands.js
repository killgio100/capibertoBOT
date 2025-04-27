const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [
    {
        name: 'play',
        description: 'Play a song or playlist',
        options: [
            {
                name: 'url',
                type: 'STRING',
                description: 'The URL of the song or playlist',
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
                type: 'INTEGER',
                description: 'Volume level (0-100)',
                required: true,
            },
        ],
    },
    {
        name: 'join',
        description: 'Join your voice channel',
    },
    {
        name: 'disconnect',
        description: 'Disconnect from the voice channel',
    },
    {
        name: '24/7',
        description: 'Play music 24/7',
    },
];

const rest = new REST({ version: '9' }).setToken('MTIyMzMyOTE1ODczOTAwNTU4NA.Gqs4Ht.rYlfhpzc2EUhPLCKkD3Jralwrl4YXGn6XN_Euk');

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands('1223329158739005584'), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();