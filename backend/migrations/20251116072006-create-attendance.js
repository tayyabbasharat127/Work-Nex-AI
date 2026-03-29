'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Attendances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      employee_id: {
        type: Sequelize.INTEGER
      },
      date: {
        type: Sequelize.DATEONLY
      },
      check_in_time: {
        type: Sequelize.DATE
      },
      check_out_time: {
        type: Sequelize.DATE
      },
      total_hours: {
        type: Sequelize.FLOAT
      },
    status: {
  type: Sequelize.ENUM('Present', 'Late', 'Absent', 'Half-Day'),
  allowNull: false,
  defaultValue: 'Absent'
},
      location_lat_long: {
        type: Sequelize.STRING
      },
      ip_address: {
        type: Sequelize.STRING
      },
      wifi_ssid: {
        type: Sequelize.STRING
      },
      device_info: {
        type: Sequelize.JSON
      },
      selfie_photo: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Attendances');
  }
};