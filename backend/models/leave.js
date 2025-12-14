'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Leave extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Leave.init({
    employee_id: DataTypes.INTEGER,
    leave_type: DataTypes.STRING,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    reason: DataTypes.TEXT,
    attachment_url: DataTypes.STRING,
    status: DataTypes.STRING,
    manager_id: DataTypes.INTEGER,
    approved_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Leave',
  });
  return Leave;
};