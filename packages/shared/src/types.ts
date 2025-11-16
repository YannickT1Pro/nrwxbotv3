export interface GuildConfig {
  id: string;
  prefix: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  welcomeRoleId?: string;
  welcomeDmEnabled: boolean;
  logChannelId?: string;
  modLogChannelId?: string;
  ticketLogChannelId?: string;
  antiSpamEnabled: boolean;
  antiSpamThreshold: number;
  antiSpamTimeWindow: number;
  antiRaidEnabled: boolean;
  antiRaidJoinThreshold: number;
  antiRaidTimeWindow: number;
  antiNukeEnabled: boolean;
  linkFilterEnabled: boolean;
  linkWhitelist: string[];
  linkBlacklist: string[];
  musicMaxQueueLength: number;
  musicAutoLeaveTimeout: number;
  verificationEnabled: boolean;
  verificationRoleId?: string;
  verificationChannelId?: string;
  minAccountAge: number;
}

export interface MusicTrack {
  title: string;
  artist: string;
  url: string;
  duration: number;
  thumbnail?: string;
  requesterId: string;
  spotifyId?: string;
}

export interface TicketFormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ConfigUpdatePayload {
  guildId: string;
  config: Partial<GuildConfig>;
}

export enum RedisKeys {
  GUILD_CONFIG = 'guild:config',
  MUSIC_SESSION = 'music:session',
  SPAM_RECORD = 'spam:record',
  RAID_TRACKER = 'raid:tracker',
  AI_TRIGGERS = 'ai:triggers',
}

export const buildRedisKey = (key: RedisKeys, ...parts: string[]): string => {
  return `${key}:${parts.join(':')}`;
};