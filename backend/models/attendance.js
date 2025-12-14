'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Attendance extends Model {
    static associate(models) {
      Attendance.belongsTo(models.User, { foreignKey: 'employee_id', as: 'employee' });
    }
  }

  Attendance.init(
    {
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      check_in_time: { type: DataTypes.DATE, allowNull: true },
      check_out_time: { type: DataTypes.DATE, allowNull: true },
      total_hours: { type: DataTypes.FLOAT, allowNull: true },
      status: { type: DataTypes.ENUM('Present','Late','Absent','Half-Day'), allowNull: false, defaultValue: 'Absent' },
      location_lat_long: { type: DataTypes.STRING, allowNull: true },
      ip_address: { type: DataTypes.STRING, allowNull: true },
      wifi_ssid: { type: DataTypes.STRING, allowNull: true },
      device_info: { type: DataTypes.JSON, allowNull: true },
      selfie_photo: { type: DataTypes.STRING, allowNull: true }
    },
    {
      sequelize,
      modelName: 'Attendance',
      tableName: 'Attendances'
    }
  );

  return Attendance;
};
