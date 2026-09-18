import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Create MediaGalleries table
    await queryInterface.createTable("MediaGalleries", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      caption: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mediaType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // 2. Add isForwarded and forwardingScore to Messages table
    await queryInterface.addColumn("Messages", "isForwarded", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }).catch(() => {});

    await queryInterface.addColumn("Messages", "forwardingScore", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }).catch(() => {});

    // 3. Alter Contacts.profilePicUrl to TEXT to avoid ER_DATA_TOO_LONG
    await queryInterface.changeColumn("Contacts", "profilePicUrl", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("MediaGalleries").catch(() => {});
    await queryInterface.removeColumn("Messages", "isForwarded").catch(() => {});
    await queryInterface.removeColumn("Messages", "forwardingScore").catch(() => {});
    await queryInterface.changeColumn("Contacts", "profilePicUrl", {
      type: DataTypes.STRING,
      allowNull: true
    }).catch(() => {});
  }
};
