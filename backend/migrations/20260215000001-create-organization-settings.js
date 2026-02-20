'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('organization_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      wifi_ip_ranges: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        defaultValue: ['192.168.100.0/24', '127.0.0.1', '::1']
      },
      shift_start_time: {
        type: Sequelize.TIME,
        defaultValue: '10:00:00'
      },
      shift_end_time: {
        type: Sequelize.TIME,
        defaultValue: '19:00:00'
      },
      late_threshold_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '0 means even 1 second late counts as late'
      },
      early_departure_threshold_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      grace_period_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      half_day_hours: {
        type: Sequelize.INTEGER,
        defaultValue: 4
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('organization_settings', ['organization_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('organization_settings');
  }
};
