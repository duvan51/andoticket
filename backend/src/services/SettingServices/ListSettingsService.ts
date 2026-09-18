import { Op } from "sequelize";
import Setting from "../../models/Setting";

const ListSettingsService = async (companyId: number): Promise<Setting[] | undefined> => {
  const defaultKeys = [
    { key: "userCreation", defaultValue: "enabled" },
    { key: "userApiToken", defaultValue: "" },
    { key: "externalProductsApiUrl", defaultValue: "" },
    { key: "externalProductsApiKey", defaultValue: "" },
    { key: "botEnabled", defaultValue: "enabled" },
    { key: "botAutoStopOnReply", defaultValue: "enabled" }
  ];

  for (const item of defaultKeys) {
    const existing = await Setting.findOne({
      where: { key: item.key }
    });

    if (!existing) {
      await Setting.create({
        key: item.key,
        value: item.defaultValue,
        companyId
      });
    }
  }

  const settings = await Setting.findAll({
    where: {
      [Op.or]: [
        { companyId },
        { companyId: null }
      ]
    }
  });

  return settings;
};

export default ListSettingsService;
