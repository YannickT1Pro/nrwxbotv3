import { Interaction } from 'discord.js';
import { KodariBot } from '../bot';
import { logger } from '../utils/logger';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction, bot: KodariBot) {
    if (interaction.isChatInputCommand()) {
      const command = bot.commands.get(interaction.commandName);

      if (!command) return;

      try {
        await command.execute(interaction, bot);
      } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        const reply = { content: 'Fehler beim Ausführen des Befehls!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    } else if (interaction.isButton()) {
      const [action, type, id] = interaction.customId.split('_');

      if (action === 'ticket') {
        try {
          if (type === 'claim') {
            await bot.ticketManager.claimTicket(id, interaction.user.id);
            await interaction.reply({ content: 'Ticket beansprucht!', ephemeral: true });
          } else if (type === 'close') {
            await bot.ticketManager.closeTicket(id, interaction.user.id);
            await interaction.reply({ content: 'Ticket geschlossen!', ephemeral: true });
          } else if (type === 'reopen') {
            await bot.ticketManager.reopenTicket(id, interaction.user.id);
            await interaction.reply({ content: 'Ticket wiedereröffnet!', ephemeral: true });
          } else if (type === 'delete') {
            await bot.ticketManager.deleteTicket(id);
            await interaction.reply({ content: 'Ticket wird gelöscht...', ephemeral: true });
          }
        } catch (error) {
          logger.error('Error handling ticket button:', error);
          await interaction.reply({ content: 'Fehler bei Ticket-Aktion!', ephemeral: true });
        }
      }
    }
  },
};