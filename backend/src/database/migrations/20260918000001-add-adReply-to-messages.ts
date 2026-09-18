import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo: any = await queryInterface.describeTable("Messages");
    if (!tableInfo.adReply) {
      await queryInterface.addColumn("Messages", "adReply", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Messages", "adReply");
  }
};
