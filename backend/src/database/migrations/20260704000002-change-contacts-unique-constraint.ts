import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Drop the old global unique constraint/index on "number"
    // We try multiple naming conventions (MySQL vs Postgres) to ensure compatibility
    await queryInterface.removeConstraint("Contacts", "number").catch(() => {});
    await queryInterface.removeConstraint("Contacts", "Contacts_number_key").catch(() => {});
    await queryInterface.removeConstraint("Contacts", "Contacts_number_unique").catch(() => {});
    await queryInterface.removeIndex("Contacts", "number").catch(() => {});
    await queryInterface.removeIndex("Contacts", "Contacts_number_unique").catch(() => {});

    // Add composite unique constraint on (number, companyId)
    await queryInterface.addConstraint("Contacts", ["number", "companyId"], {
      type: "unique",
      name: "Contacts_number_companyId_unique"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Drop the composite unique constraint
    await queryInterface.removeConstraint("Contacts", "Contacts_number_companyId_unique").catch(() => {});
    await queryInterface.removeIndex("Contacts", "Contacts_number_companyId_unique").catch(() => {});

    // Re-add global unique index on "number"
    await queryInterface.addConstraint("Contacts", ["number"], {
      type: "unique",
      name: "Contacts_number_unique"
    });
  }
};
