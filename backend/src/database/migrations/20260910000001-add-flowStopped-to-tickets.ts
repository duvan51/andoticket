import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo: any = await queryInterface.describeTable("Tickets");
    if (!tableInfo.flowStopped) {
      await queryInterface.addColumn("Tickets", "flowStopped", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "flowStopped");
  }
};
