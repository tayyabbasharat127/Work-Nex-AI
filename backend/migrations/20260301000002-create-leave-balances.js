'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create leave_balances table
    await queryInterface.createTable('leave_balances', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onDelete: 'CASCADE'
      },
      annual_balance: {
        type: Sequelize.INTEGER,
        defaultValue: 20,
        comment: 'Total annual leave days allocated'
      },
      used_annual: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Annual leave days used'
      },
      sick_balance: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        comment: 'Total sick leave days allocated'
      },
      used_sick: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Sick leave days used'
      },
      casual_balance: {
        type: Sequelize.INTEGER,
        defaultValue: 7,
        comment: 'Total casual leave days allocated'
      },
      used_casual: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Casual leave days used'
      },
      year: {
        type: Sequelize.INTEGER,
        defaultValue: Sequelize.literal('EXTRACT(YEAR FROM CURRENT_DATE)'),
        comment: 'Year for this balance record'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Add unique constraint for user_id + year
    await queryInterface.addConstraint('leave_balances', {
      fields: ['user_id', 'year'],
      type: 'unique',
      name: 'unique_user_year'
    });

    // Create index for faster lookups
    await queryInterface.addIndex('leave_balances', ['user_id', 'year'], {
      name: 'idx_leave_balances_user_year'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('leave_balances');
  }
};
