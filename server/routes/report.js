const {Router} = require('express');
const controller = require('../controllers/report');
const verifyToken = require('../middlewares/auth');
const verifyAdminToken = require('../middlewares/authAdmin');

const router = Router();

router.post('/createReport/:profileId',verifyToken,controller.createReport);
router.delete('/delete-reportByAdmin/:reportId', verifyAdminToken , controller.deleteReportByAdmin);


module.exports = router;