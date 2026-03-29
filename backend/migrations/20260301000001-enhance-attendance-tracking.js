'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to Attendances table
    await queryInterface.addColumn('Attendances', 'last_ping_time', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time employee sent a ping (for auto-checkout detection)'
    });
    
    await queryInterface.addColumn('Attendances', 'auto_checkout', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether checkout was automatic due to WiFi disconnect'
    });
    
    await queryInterface.addColumn('Attendances', 'manual_entry', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether attendance was manually marked by admin'
    });
    
    await queryInterface.addColumn('Attendances', 'manual_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Reason for manual attendance entry'
    });
    
    await queryInterface.addColumn('Attendances', 'marked_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Admin who manually marked attendance'
    });
    
    await queryInterface.addColumn('Attendances', 'adjusted_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Manager/Admin who adjusted attendance'
    });
    
    await queryInterface.addColumn('Attendances', 'adjustment_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Reason for attendance adjustment'
    });

    // Add WiFi MAC address column for network identification
    await queryInterface.addColumn('Attendances', 'wifi_mac_address', {
      type: Sequelize.STRING(17),
      allowNull: true,
      comment: 'MAC address of WiFi router (for network verification)'
    });

    // Enhance organization_settings table
    await queryInterface.addColumn('organization_settings', 'allowed_wifi_mac_addresses', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'List of allowed WiFi router MAC addresses'
    });

    await queryInterface.addColumn('organization_settings', 'auto_checkout_timeout_minutes', {
      type: Sequelize.INTEGER,
      defaultValue: 5,
      comment: 'Minutes of no ping before auto checkout'
    });

    await queryInterface.addColumn('organization_settings', 'require_wifi_mac_validation', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to validate WiFi MAC address in addition to IP'
    });

    // Create index for performance
    await queryInterface.addIndex('Attendances', ['employee_id', 'check_in_time'], {
      name: 'idx_attendances_employee_checkin'
    });

    await queryInterface.addIndex('Attendances', ['last_ping_time'], {
      name: 'idx_attendances_last_ping'
    });
  },

  down: async (queryInterface) => {
    // Remove indexes
    await queryInterface.removeIndex('Attendances', 'idx_attendances_employee_checkin');
    await queryInterface.removeIndex('Attendances', 'idx_attendances_last_ping');

    // Remove columns from Attendances
    await queryInterface.removeColumn('Attendances', 'last_ping_time');
    await queryInterface.removeColumn('Attendances', 'auto_checkout');
    await queryInterface.removeColumn('Attendances', 'manual_entry');
    await queryInterface.removeColumn('Attendances', 'manual_reason');
    await queryInterface.removeColumn('Attendances', 'marked_by');
    await queryInterface.removeColumn('Attendances', 'adjusted_by');
    await queryInterface.removeColumn('Attendances', 'adjustment_reason');
    await queryInterface.removeColumn('Attendances', 'wifi_mac_address');

    // Remove columns from organization_settings
    await queryInterface.removeColumn('organization_settings', 'allowed_wifi_mac_addresses');
    await queryInterface.removeColumn('organization_settings', 'auto_checkout_timeout_minutes');
    await queryInterface.removeColumn('organization_settings', 'require_wifi_mac_validation');
  }
};
