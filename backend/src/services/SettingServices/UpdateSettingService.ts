import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
  companyId: number;
}

const UpdateSettingService = async ({
  key,
  value,
  companyId
}: Request): Promise<Setting | undefined> => {
  let setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    setting = await Setting.create({ key, value, companyId });
  } else {
    await setting.update({ value, companyId: setting.companyId || companyId });
  }

  return setting;
};

export default UpdateSettingService;
