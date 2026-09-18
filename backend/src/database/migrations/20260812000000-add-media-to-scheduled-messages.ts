import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("ScheduledMessages", "mediaUrl", {
      type: DataTypes.STRING,
      allowNull: true
    });
    return queryInterface.addColumn("ScheduledMessages", "mediaName", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ScheduledMessages", "mediaUrl");
    return queryInterface.removeColumn("ScheduledMessages", "mediaName");
  }
};
