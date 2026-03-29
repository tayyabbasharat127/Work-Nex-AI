'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrganizationSettings extends Model {
    static associate(models) {
      OrganizationSettings.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
      });
    }
  }

  OrganizationSettings.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    wifi_ip_ranges: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: ['192.168.100.0/24', '127.0.0.1', '::1']
    },
    shift_start_time: {
      type: DataTypes.TIME,
      defaultValue: '10:00:00'
    },
    shift_end_time: {
      type: DataTypes.TIME,
      defaultValue: '19:00:00'
    },
    late_threshold_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    early_departure_threshold_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    grace_period_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    half_day_hours: {
      type: DataTypes.INTEGER,
      defaultValue: 4
    }
  }, {
    sequelize,
    modelName: 'OrganizationSettings',
    tableName: 'organization_settings',
    timestamps: true
  });

  return OrganizationSettings;
};
