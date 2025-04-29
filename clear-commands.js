require('dotenv').config();
const { REST, Routes } = require('discord.js');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('⏳ Eliminazione comandi in corso...');

        // Elimina i comandi GUILD
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
        console.log(`✅ Comandi della GUILD "${GUILD_ID}" eliminati.`);

        // Elimina i comandi GLOBALI
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
        console.log('✅ Comandi GLOBALI eliminati.');
    } catch (error) {
        console.error('❌ Errore durante la rimozione dei comandi:', error);
    }
})();
