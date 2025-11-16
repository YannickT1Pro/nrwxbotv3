import { KodariBot } from '../bot';
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  CategoryChannel,
  TextChannel,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { prisma, TicketState } from '@kodari/database';
import { logger } from '../utils/logger';

export class TicketManager {
  private bot: KodariBot;

  constructor(bot: KodariBot) {
    this.bot = bot;
  }

  async createTicket(
    guildId: string,
    categoryId: string,
    creatorId: string,
    formData?: any
  ): Promise<string> {
    const category = await prisma.ticketCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error('Ticket category not found');
    }

    const guild = await this.bot.guilds.fetch(guildId);
    const creator = await guild.members.fetch(creatorId);

    const ticketNumber = await prisma.ticket.count({ where: { guildId } }) + 1;
    const channelName = `ticket-${ticketNumber}`;

    let ticketCategory: CategoryChannel | undefined;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
    ticketCategory = categories.find(c => c.name.toLowerCase().includes('ticket')) as CategoryChannel;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: ticketCategory?.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: creatorId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    const ticket = await prisma.ticket.create({
      data: {
        guildId,
        categoryId,
        channelId: channel.id,
        creatorId,
        formData: formData || {},
        state: TicketState.OPEN,
      },
    });

    await prisma.ticketLog.create({
      data: {
        ticketId: ticket.id,
        userId: creatorId,
        action: 'CREATED',
        details: { formData },
      },
    });

    const embed = new EmbedBuilder()
      .setTitle(`${category.emoji || '🎫'} ${category.name}`)
      .setDescription(category.description || 'Ticket erstellt')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Ersteller', value: `<@${creatorId}>`, inline: true },
        { name: 'Status', value: 'Offen', inline: true }
      );

    if (formData) {
      for (const [key, value] of Object.entries(formData)) {
        embed.addFields({ name: key, value: String(value) });
      }
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticket.id}`)
          .setLabel('🔧 Beanspruchen')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_add_${ticket.id}`)
          .setLabel('➕ Benutzer hinzufügen')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.id}`)
          .setLabel('🔒 Schließen')
          .setStyle(ButtonStyle.Danger)
      );

    await (channel as TextChannel).send({ embeds: [embed], components: [row] });

    if (category.teamRoleId) {
      await (channel as TextChannel).send(`<@&${category.teamRoleId}> Neues Ticket!`);
    }

    logger.info(`Created ticket ${ticket.id} in guild ${guildId}`);
    return channel.id;
  }

  async claimTicket(ticketId: string, claimerId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        claimerId,
        state: TicketState.CLAIMED,
      },
    });

    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: claimerId,
        action: 'CLAIMED',
      },
    });

    const guild = await this.bot.guilds.fetch(ticket.guildId);
    const channel = await guild.channels.fetch(ticket.channelId) as TextChannel;

    await channel.send(`<@${claimerId}> hat dieses Ticket beansprucht.`);
    logger.info(`Ticket ${ticketId} claimed by ${claimerId}`);
  }

  async closeTicket(ticketId: string, closerId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: TicketState.CLOSED,
        closedAt: new Date(),
      },
    });

    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: closerId,
        action: 'CLOSED',
      },
    });

    const guild = await this.bot.guilds.fetch(ticket.guildId);
    const channel = await guild.channels.fetch(ticket.channelId) as TextChannel;

    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: false,
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_reopen_${ticketId}`)
          .setLabel('🔁 Wiedereröffnen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticketId}`)
          .setLabel('🗑️ Löschen')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({ content: 'Ticket geschlossen.', components: [row] });
    logger.info(`Ticket ${ticketId} closed by ${closerId}`);
  }

  async reopenTicket(ticketId: string, reopenerId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        state: TicketState.OPEN,
        closedAt: null,
      },
    });

    await prisma.ticketLog.create({
      data: {
        ticketId,
        userId: reopenerId,
        action: 'REOPENED',
      },
    });

    const guild = await this.bot.guilds.fetch(ticket.guildId);
    const channel = await guild.channels.fetch(ticket.channelId) as TextChannel;

    await channel.permissionOverwrites.edit(ticket.creatorId, {
      SendMessages: true,
    });

    await channel.send(`Ticket wiedereröffnet von <@${reopenerId}>.`);
    logger.info(`Ticket ${ticketId} reopened by ${reopenerId}`);
  }

  async deleteTicket(ticketId: string): Promise<void> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const guild = await this.bot.guilds.fetch(ticket.guildId);
    const channel = await guild.channels.fetch(ticket.channelId);

    if (channel) {
      await channel.delete();
    }

    await prisma.ticket.delete({ where: { id: ticketId } });
    logger.info(`Ticket ${ticketId} deleted`);
  }
}