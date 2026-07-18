import { QueryInterface } from "sequelize";

const tables = [
    "Users",
    "Tickets",
    "Messages",
    "Contacts",
    "Whatsapps",
    "Queues",
    "Settings",
    "QuickAnswers",
    "Tags"
];

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const [existingPlans] = await queryInterface.sequelize.query(
            "SELECT id FROM Plans WHERE name = 'Administrador' LIMIT 1;"
        );
        let planId = (existingPlans as any[])[0]?.id;

        if (!planId) {
            await queryInterface.bulkInsert("Plans", [{
                name: "Administrador",
                users: 10,
                whatsapps: 10,
                queues: 10,
                value: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }]);

            const [createdPlans] = await queryInterface.sequelize.query(
                "SELECT id FROM Plans WHERE name = 'Administrador' LIMIT 1;"
            );
            planId = (createdPlans as any[])[0]?.id;
        }

        const [existingCompanies] = await queryInterface.sequelize.query(
            "SELECT id FROM Companies WHERE email = 'admin@empresa.com' OR name = 'Mi Empresa' LIMIT 1;"
        );
        let companyId = (existingCompanies as any[])[0]?.id;

        if (!companyId && planId) {
            const companyData: Record<string, unknown> = {
                name: "Mi Empresa",
                email: "admin@empresa.com",
                planId,
                status: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const tableDefinition = await queryInterface.describeTable("Companies").catch(() => ({} as Record<string, unknown>));
            if ((tableDefinition as Record<string, unknown>).password) {
                (companyData as Record<string, unknown>).password = "default-password";
            }

            await queryInterface.bulkInsert("Companies", [companyData]);

            const [createdCompanies] = await queryInterface.sequelize.query(
                "SELECT id FROM Companies WHERE email = 'admin@empresa.com' LIMIT 1;"
            );
            companyId = (createdCompanies as any[])[0]?.id;
        }

        if (companyId) {
            for (const table of tables) {
                try {
                    const tableDefinition = await queryInterface.describeTable(table);
                    const hasCompanyId = Boolean((tableDefinition as Record<string, unknown>).companyId);
                    if (hasCompanyId) {
                        await queryInterface.sequelize.query(
                            `UPDATE ${table} SET companyId = ${companyId} WHERE companyId IS NULL;`
                        );
                    }
                } catch {
                    // Ignore tables that do not exist in the current schema.
                }
            }
        }
    },

    down: async () => {
        // No-op for safety; this migration is meant to be rerunnable.
    }
};
