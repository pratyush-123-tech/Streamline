import {Router} from "express"
import {login,register,addToHistory, getUserHistory, } from "../controllers/users.js";

const router=Router();
router.route("/login").post(login);
router.route("/register").post(register);
router.route("/get_all_activity").get(getUserHistory)
router.route("/add_to_activity").post(addToHistory)
 
export default router;