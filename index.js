require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const { DisTube } = require('distube');
// Extractor Plugins
const { YouTubePlugin } = require('@distube/youtube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
// InfoExtractor Plugins
const { SpotifyPlugin } = require('@distube/spotify');
const { DeezerPlugin } = require('@distube/deezer');
// PlayableExtractor Plugins
const { FilePlugin } = require('@distube/file');
const { YtDlpPlugin } = require('@distube/yt-dlp');

// Ensure required env vars
['TOKEN','SC_CLIENT_ID','SPOTIFY_CLIENT_ID','SPOTIFY_CLIENT_SECRET','GUILD_ID']
  .forEach(key => { if (!process.env[key]) console.warn(`Missing env var: ${key}`); });

const TOKEN = process.env.TOKEN;
const SC_CLIENT_ID = process.env.SC_CLIENT_ID;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Initialize DisTube with correct plugin order
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  ffmpeg: { path: FFMPEG_PATH },
  plugins: [
    new YouTubePlugin(),
    new SoundCloudPlugin({ clientId: SC_CLIENT_ID }),
    new SpotifyPlugin({ api: { clientId: SPOTIFY_CLIENT_ID, clientSecret: SPOTIFY_CLIENT_SECRET }}),
    new DeezerPlugin(),
    new FilePlugin(),
    new YtDlpPlugin()
  ]
});

// Create control buttons
defineControlButtons = createControlButtons;
function createControlButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pause').setLabel('⏸ Pause').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('resume').setLabel('▶️ Resume').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('skip').setLabel('⏭ Skip').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vol_down').setLabel('🔉 Vol -').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vol_up').setLabel('🔊 Vol +').setStyle(ButtonStyle.Success)
  );
  return [row1, row2];
}

// Update or send Now Playing embed
async function updateNowPlaying(queue) {
  if (!queue?.songs?.length) return;
  const track = queue.songs[0];
  const upcoming = queue.songs.slice(1,6).map((t,i)=>`\`${i+1}\` ${t.name}`).join('\n')||'Nessuna';
  const embed = new EmbedBuilder()
    .setColor('#1DB954')
    .setAuthor({ name: '▶️ Now Playing' })
    .setTitle(track.name)
    .setURL(track.url)
    .setThumbnail(track.thumbnail)
    .addFields(
      { name: 'Durata', value: track.formattedDuration, inline: true },
      { name: 'Autore', value: track.uploader?.name || track.user.tag, inline: true },
      { name: 'Prossime in coda', value: upcoming, inline: false }
    )
    .setFooter({ text: `Volume: ${queue.volume}% | Richiesto da: ${track.user.tag}` });
  if (queue.controlMessage) {
    await queue.controlMessage.edit({ embeds: [embed], components: createControlButtons() });
  } else {
    queue.controlMessage = await queue.textChannel.send({ embeds: [embed], components: createControlButtons() });
  }
}

// DisTube events
// 1) playSong: update embed & set bot presence
distube.on('playSong', async (queue, song) => {
  try {
    await client.user.setPresence({
      activities: [{ name: `🎶 ${song.name}`, type: ActivityType.Listening }],
      status: 'online'
    });
  } catch (err) {
    console.error('Presence update error:', err);
  }
  updateNowPlaying(queue);
});

// 2) empty: stop on empty channel
distube.on('empty', queue => queue.stop());
// 3) finish: delete control message
distube.on('finish', queue => queue.controlMessage?.delete().catch(() => {}));
// 4) error: detailed log + fallback
distube.on('error', async (error, queue) => {
  console.error('[DisTube Error]', error);
  if (!queue || !queue.textChannel) return;
  const channel = queue.textChannel;
  const current = queue.songs[0];
  if (current) {
    await channel.send(`⚠️ Errore di riproduzione: ${error.message}`);
    // try fallback to YouTube
    try {
      const fallbackQuery = `${current.name} ${current.uploader?.name||''}`;
      await distube.play(queue.voice.channel, fallbackQuery, { member: queue.member, textChannel: channel, searchEngine: 'ytsearch' });
    } catch (ytErr) {
      console.error('YouTube fallback failed:', ytErr);
      queue.skip();
    }
  }
});

// Queue pagination
function buildQueueEmbed(queue, page = 0) {
  const perPage = 10;
  const start = page * perPage;
  const list = queue.songs.slice(start, start + perPage)
    .map((t,i) => `**${start+i+1}.** ${t.name}`)
    .join('\n') || 'Vuota';
  return new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle('📄 Coda musicale')
    .setDescription(list)
    .setFooter({ text: `Pagina ${page+1}/${Math.ceil(queue.songs.length/perPage)}` });
}
const queuePages = new Map();

// Slash commands
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const cmds = [
    { name:'play', description:'Riproduci link o ricerca', options:[{ type:3, name:'query', description:'URL o testo', required:true }] },
    { name:'volume', description:'Imposta volume', options:[{ type:4, name:'level', description:'0-100', required:true }] },
    { name:'queue', description:'Mostra coda paginata' }
  ];
  try {
    await client.application.commands.set(cmds, GUILD_ID);
    console.log('Slash commands registered.');
  } catch(e) {
    console.error('Command registration error:', e);
  }
});

// Interaction handling
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const queue = distube.getQueue(interaction.guildId);
    if (interaction.commandName === 'play') {
      const query = interaction.options.getString('query');
      const vc = interaction.member.voice.channel;
      if (!vc) return interaction.reply({ content:'Unisciti a un canale vocale.', ephemeral:true });
      await interaction.deferReply();
      const isSp = /spotify\.com\/track/i.test(query);
      const isYt = /(?:youtu\.be\/|youtube\.com\/watch\?v=)/i.test(query);
      const isSc = /soundcloud\.com\//i.test(query);
      const isDz = /deezer\.com\//i.test(query);
      try {
        if (isSp || isYt) await distube.play(vc, query, { member:interaction.member, textChannel:interaction.channel });
        else if (isSc) await distube.play(vc, query, { member:interaction.member, textChannel:interaction.channel, searchEngine:'soundcloud' });
        else if (isDz) await distube.play(vc, query, { member:interaction.member, textChannel:interaction.channel });
        else {
          try { await distube.play(vc, query, { member:interaction.member, textChannel:interaction.channel, searchEngine:'soundcloud' }); }
          catch { await distube.play(vc, query, { member:interaction.member, textChannel:interaction.channel }); }
        }
        await interaction.followUp('🎶 Traccia aggiunta.');
      } catch(err) {
        console.error('Play error:', err);
        await interaction.followUp(`❌ ${err.message}`);
      }
    }
    if (interaction.commandName === 'volume') {
      const lvl = interaction.options.getInteger('level');
      if (!queue) return interaction.reply({ content:'Nessuna coda.', ephemeral:true });
      queue.setVolume(lvl);
      await updateNowPlaying(queue);
      return interaction.reply({ content:`🔊 ${lvl}%`, ephemeral:true });
    }
    if (interaction.commandName === 'queue') {
      if (!queue) return interaction.reply({ content:'Nessuna coda.', ephemeral:true });
      queuePages.set(interaction.guildId, 0);
      const emb = buildQueueEmbed(queue, 0);
      const total = Math.ceil(queue.songs.length / 10);
      const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_q').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_q').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(total < 2)
      );
      return interaction.reply({ embeds:[emb], components:[nav] });
    }
  } else if (interaction.isButton()) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content:'Nessuna coda.', ephemeral:true });
    const id = interaction.customId;
    if (id === 'prev_q' || id === 'next_q') {
      let page = queuePages.get(interaction.guildId) || 0;
      const total = Math.ceil(queue.songs.length / 10);
      page += id === 'next_q' ? 1 : -1;
      page = Math.max(0, Math.min(page, total-1));
      queuePages.set(interaction.guildId, page);
      const emb = buildQueueEmbed(queue, page);
      const nav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_q').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('next_q').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page === total-1)
      );
      return interaction.update({ embeds:[emb], components:[nav] });
    }
    switch(id) {
      case 'pause': queue.pause(); break;
      case 'resume': queue.resume(); break;
      case 'skip': if (queue.songs.length>1) queue.skip(); break;
      case 'stop': queue.stop(); break;
      case 'vol_up': queue.setVolume(Math.min(queue.volume+10,100)); break;
      case 'vol_down': queue.setVolume(Math.max(queue.volume-10,0)); break;
    }
    await updateNowPlaying(queue);
    return interaction.deferUpdate();
  }
});

client.login(TOKEN).catch(e => console.error('Login failed:', e));
