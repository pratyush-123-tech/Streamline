import {Router} from "express"
import {login,register,addToHistory, getUserHistory, joinAsGuest} from "../controllers/users.js";

const router=Router();
router.route("/login").post(login);
router.route("/register").post(register);
router.route("/guest_login").post(joinAsGuest);
router.route("/get_all_activity").get(getUserHistory)
router.route("/add_to_activity").post(addToHistory)
 
export default router;