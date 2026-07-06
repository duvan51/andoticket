import Queue from "../../models/Queue";

const ListQueuesService = async ({ companyId }: { companyId: number }): Promise<Queue[]> => {
  if (!companyId) {
    throw new Error("ERR_NO_COMPANY_ID");
  }

  const whereCondition = { companyId };

  const queues = await Queue.findAll({
    where: whereCondition,
    include: ["options"],
    order: [["name", "ASC"]]
  });

  return queues;
};

export default ListQueuesService;
