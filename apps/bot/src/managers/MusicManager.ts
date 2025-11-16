import { KodariBot } from '../bot';
import { MusicTrack, RedisKeys, buildRedisKey } from '@kodari/shared';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection } from '@discordjs/voice';
import { VoiceChannel } from 'discord.js';
import SpotifyWebApi from 'spotify-web-api-node';
import play from 'play-dl';
import { logger } from '../utils/logger';

interface MusicSession {
  guildId: string;
  channelId: string;
  textChannelId: string;
  ownerId: string;
  queue: MusicTrack[];
  currentTrack: MusicTrack | null;
  isPaused: boolean;
  volume: number;
  connection: VoiceConnection | null;
  player: any;
  disconnectTimer?: NodeJS.Timeout;
}

export class MusicManager {
  private bot: KodariBot;
  private sessions: Map<string, MusicSession>;
  private spotify: SpotifyWebApi;

  constructor(bot: KodariBot) {
    this.bot = bot;
    this.sessions = new Map();

    this.spotify = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    this.initializeSpotify();
  }

  private async initializeSpotify(): Promise<void> {
    try {
      const data = await this.spotify.clientCredentialsGrant();
      this.spotify.setAccessToken(data.body.access_token);

      setInterval(async () => {
        const data = await this.spotify.clientCredentialsGrant();
        this.spotify.setAccessToken(data.body.access_token);
      }, data.body.expires_in * 1000 - 60000);

      logger.info('Spotify API initialized');
    } catch (error) {
      logger.error('Failed to initialize Spotify:', error);
    }
  }

  async play(guildId: string, voiceChannel: VoiceChannel, textChannelId: string, query: string, requesterId: string): Promise<MusicTrack> {
    let session = this.sessions.get(guildId);

    if (!session) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();

      session = {
        guildId,
        channelId: voiceChannel.id,
        textChannelId,
        ownerId: requesterId,
        queue: [],
        currentTrack: null,
        isPaused: false,
        volume: 100,
        connection,
        player,
      };

      connection.subscribe(player);
      this.sessions.set(guildId, session);

      player.on(AudioPlayerStatus.Idle, () => {
        this.onTrackEnd(guildId);
      });

      player.on('error', (error: Error) => {
        logger.error(`Music player error in guild ${guildId}:`, error);
        this.onTrackEnd(guildId);
      });
    }

    const track = await this.resolveTrack(query, requesterId);
    
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = undefined;
    }

    if (!session.currentTrack) {
      session.currentTrack = track;
      await this.playTrack(session);
    } else {
      session.queue.push(track);
    }

    await this.saveSession(session);
    return track;
  }

  private async resolveTrack(query: string, requesterId: string): Promise<MusicTrack> {
    const spotifyMatch = query.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);

    if (spotifyMatch) {
      const trackId = spotifyMatch[1];
      const spotifyTrack = await this.spotify.getTrack(trackId);
      const searchQuery = `${spotifyTrack.body.artists[0].name} ${spotifyTrack.body.name}`;
      
      const ytInfo = await play.search(searchQuery, { limit: 1 });
      
      return {
        title: spotifyTrack.body.name,
        artist: spotifyTrack.body.artists.map(a => a.name).join(', '),
        url: ytInfo[0].url,
        duration: spotifyTrack.body.duration_ms,
        thumbnail: spotifyTrack.body.album.images[0]?.url,
        requesterId,
        spotifyId: trackId,
      };
    } else {
      const ytInfo = await play.search(query, { limit: 1 });
      const video = ytInfo[0];

      return {
        title: video.title || 'Unknown',
        artist: video.channel?.name || 'Unknown',
        url: video.url,
        duration: video.durationInSec * 1000,
        thumbnail: video.thumbnails[0]?.url,
        requesterId,
      };
    }
  }

  private async playTrack(session: MusicSession): Promise<void> {
    if (!session.currentTrack) return;

    try {
      const stream = await play.stream(session.currentTrack.url);
      const resource = createAudioResource(stream.stream, { 
        inputType: stream.type,
      });

      session.player.play(resource);
      logger.info(`Playing track: ${session.currentTrack.title} in guild ${session.guildId}`);
    } catch (error) {
      logger.error(`Failed to play track in guild ${session.guildId}:`, error);
      this.onTrackEnd(session.guildId);
    }
  }

  private async onTrackEnd(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.queue.length > 0) {
      session.currentTrack = session.queue.shift()!;
      await this.playTrack(session);
      await this.saveSession(session);
    } else {
      session.currentTrack = null;
      
      session.disconnectTimer = setTimeout(() => {
        this.disconnect(guildId);
      }, 30000);
      
      await this.saveSession(session);
    }
  }

  async skip(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.player.stop();
  }

  async pause(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.player.pause();
    session.isPaused = true;
    await this.saveSession(session);
  }

  async resume(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.player.unpause();
    session.isPaused = false;
    await this.saveSession(session);
  }

  async stop(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.queue = [];
    session.player.stop();
    await this.disconnect(guildId);
  }

  async disconnect(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
    }

    session.connection?.destroy();
    this.sessions.delete(guildId);

    const redisKey = buildRedisKey(RedisKeys.MUSIC_SESSION, guildId);
    await this.bot.redis.del(redisKey);

    logger.info(`Disconnected from voice in guild ${guildId}`);
  }

  getSession(guildId: string): MusicSession | undefined {
    return this.sessions.get(guildId);
  }

  private async saveSession(session: MusicSession): Promise<void> {
    const redisKey = buildRedisKey(RedisKeys.MUSIC_SESSION, session.guildId);
    await this.bot.redis.set(redisKey, {
      guildId: session.guildId,
      channelId: session.channelId,
      textChannelId: session.textChannelId,
      ownerId: session.ownerId,
      queue: session.queue,
      currentTrack: session.currentTrack,
      isPaused: session.isPaused,
      volume: session.volume,
    }, 3600);
  }

  async cleanup(): Promise<void> {
    for (const [guildId] of this.sessions) {
      await this.disconnect(guildId);
    }
  }
}