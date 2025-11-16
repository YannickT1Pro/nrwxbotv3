import { z } from 'zod';

export const GuildConfigSchema = z.object({
  prefix: z.string().min(1).max(5),
  welcomeChannelId: z.string().optional(),
  welcomeMessage: z.string().optional(),
  welcomeRoleId: z.string().optional(),
  welcomeDmEnabled: z.boolean(),
  logChannelId: z.string().optional(),
  modLogChannelId: z.string().optional(),
  ticketLogChannelId: z.string().optional(),
  antiSpamEnabled: z.boolean(),
  antiSpamThreshold: z.number().int().min(1).max(20),
  antiSpamTimeWindow: z.number().int().min(1).max(60),
  antiRaidEnabled: z.boolean(),
  antiRaidJoinThreshold: z.number().int().min(5).max(50),
  antiRaidTimeWindow: z.number().int().min(5).max(60),
  antiNukeEnabled: z.boolean(),
  linkFilterEnabled: z.boolean(),
  linkWhitelist: z.array(z.string()),
  linkBlacklist: z.array(z.string()),
  musicMaxQueueLength: z.number().int().min(10).max(500),
  musicAutoLeaveTimeout: z.number().int().min(10).max(300),
  verificationEnabled: z.boolean(),
  verificationRoleId: z.string().optional(),
  verificationChannelId: z.string().optional(),
  minAccountAge: z.number().int().min(0).max(365),
});

export const TicketCategorySchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().optional(),
  description: z.string().optional(),
  teamRoleId: z.string().optional(),
  useForm: z.boolean(),
  formFields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'textarea', 'select']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
  })).optional(),
});

export const AISupportTriggerSchema = z.object({
  trigger: z.string().min(1),
  response: z.string().min(1),
  isRegex: z.boolean(),
  priority: z.number().int().min(0).max(100),
  enabled: z.boolean(),
});