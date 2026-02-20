'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns for manual entries and adjustments
    await queryInterface.addColumn('Attendances', 'manual_entry', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('Attendances', 'manual_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Attendances', 'marked_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('Attendances', 'adjusted_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('Attendances', 'adjustment_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Attendances', 'device_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Attendances', 'manual_entry');
    await queryInterface.removeColumn('Attendances', 'manual_reason');
    await queryInterface.removeColumn('Attendances', 'marked_by');
    await queryInterface.removeColumn('Attendances', 'adjusted_by');
    await queryInterface.removeColumn('Attendances', 'adjustment_reason');
    await queryInterface.removeColumn('Attendances', 'device_id');
  }
};
