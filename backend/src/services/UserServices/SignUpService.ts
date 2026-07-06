import * as Yup from "yup";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
    name: string;
    email: string;
    password?: string;
    companyName: string;
    planId?: number;
}

const SignUpService = async ({
    name,
    email,
    password,
    companyName,
    planId
}: Request): Promise<User> => {
    console.log("SignUpService started:", { name, email, companyName, planId });

    // Check if email already exists
    let existingUser = null;
    try {
        existingUser = await User.findOne({ where: { email } });
    } catch (dbError: any) {
        console.error("Database error checking existing user:", dbError);
        // Continue - this might be a transient error
    }
    
    if (existingUser) {
        throw new AppError("An user with this email already exists.", 400);
    }

    const schema = Yup.object().shape({
        name: Yup.string().required().min(2),
        companyName: Yup.string().required().min(2),
        email: Yup.string().email().required(),
        password: Yup.string().required().min(5)
    });

    try {
        await schema.validate({ email, password, name, companyName });
    } catch (err: any) {
        console.error("Validation error:", err.message);
        throw new AppError(err.message || "Validation failed", 400);
    }

    // Check if a default plan exists if planId is not provided
    let selectedPlanId = planId;
    if (!selectedPlanId) {
        try {
            const defaultPlan = await Plan.findOne({ order: [["name", "ASC"]] });
            if (defaultPlan) {
                selectedPlanId = defaultPlan.id;
            }
        } catch (e) {
            console.error("Error finding default plan:", e);
        }
    }

    console.log("Selected Plan ID:", selectedPlanId);

    try {
        const company = await Company.create({
            name: companyName,
            email,
            password,
            planId: selectedPlanId,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)) // 7 days trial
        });
        console.log("Company created:", company.id);

        const user = await User.create({
            name,
            email,
            password,
            profile: "admin",
            companyId: company.id
        });
        console.log("User created:", user.id);

        return user;
    } catch (e: any) {
        console.error("Error during signup creation:", e);
        const errorMessage = e?.message || JSON.stringify(e) || "Error creating company or user";
        throw new AppError(errorMessage);
    }
};

export default SignUpService;
