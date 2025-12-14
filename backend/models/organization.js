'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Organizations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Organizations.init({
    organization_name: DataTypes.STRING,
    Industry: DataTypes.STRING,
    company_domain: DataTypes.STRING,
    package: DataTypes.STRING,
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    country: DataTypes.STRING,
    status: DataTypes.STRING,
    admin_email: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Organization',
  });
  return Organizations;
};