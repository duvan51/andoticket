import Company from "../../models/Company";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import Plan from "../../models/Plan";

const ListCompaniesService = async (): Promise<Company[]> => {
    const companies = await Company.findAll({
        attributes: ["id", "name", "email", "status", "dueDate", "createdAt"],
        order: [["name", "ASC"]],
        include: [
            {
                model: User,
                as: "users",
                attributes: ["id", "name", "email", "profile"]
            },
            {
                model: Whatsapp,
                as: "whatsapps",
                attributes: ["id", "name", "status"]
            },
            {
                model: Plan,
                as: "planData",
                attributes: ["id", "name"]
            }
        ]
    });

    return companies;
};

export default ListCompaniesService;
