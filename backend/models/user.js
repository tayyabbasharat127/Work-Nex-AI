'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define the association with Organization
      User.belongsTo(models.Organization, { foreignKey: 'organization_id' });
    }

    // Validate password
    validPassword(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  User.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: "Employee"
      },
      department: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "Active"
      },
      // Add the organization_id field to link the user to an organization
      organization_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Organizations', // Make sure this matches the actual organization table name
          key: 'id'
        },
        allowNull: false, // Ensure the user is always associated with an organization
      }
    },
    {
      sequelize,
      modelName: 'User',
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
    }
  );
   User.associate= function (models){
    User.hasMany(models.Contact,{
      foreignKey:'userId',
      onDelete:'CASCADE',
    })
   }

  return User;
};
