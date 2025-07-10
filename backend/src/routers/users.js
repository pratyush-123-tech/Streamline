import {Router} from "express"
import {login} from "../controllers/users.js"
import {register} from "../controllers/users.js"
const router=Router();
router.route("/login").post(login);
router.route("/register").post(register);
export default router;